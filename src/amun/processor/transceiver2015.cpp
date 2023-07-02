/***************************************************************************
 *   Copyright 2022 Michael Bleier, Michael Eischer, Jan Kallwies,         *
 *       Philipp Nordhus, Paul Bergmann                                    *
 *   Robotics Erlangen e.V.                                                *
 *   http://www.robotics-erlangen.de/                                      *
 *   info@robotics-erlangen.de                                             *
 *                                                                         *
 *   This program is free software: you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation, either version 3 of the License, or     *
 *   any later version.                                                    *
 *                                                                         *
 *   This program is distributed in the hope that it will be useful,       *
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
 *   GNU General Public License for more details.                          *
 *                                                                         *
 *   You should have received a copy of the GNU General Public License     *
 *   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
 ***************************************************************************/

#include "transceiver2015.h"

#include "core/timer.h"
#include "firmware-interface/radiocommand2018.h"
#include "firmware-interface/transceiver2012.h"
#include "radio_address.h"
#include "usbdevice.h"
#include "usbthread.h"
#include <QByteArray>
#include <QString>
#include <algorithm>
#include <libusb.h>

using namespace Radio;

typedef struct
{
    int64_t time;
} __attribute__ ((packed)) TransceiverPingData;

const int PROTOCOL_VERSION = 5;

constexpr qint16 TRANSCEIVER2015_VENDOR_ID  = 0x09fb;
constexpr qint16 TRANSCEIVER2015_PRODUCT_ID = 0x0de2;

constexpr qint16 HBC_VENDOR_ID  = 0x09fb;
constexpr qint16 HBC_PRODUCT_ID = 0x0de2;

constexpr qint16 vidForKind(Transceiver2015::Kind kind) {
    switch (kind) {
        case Transceiver2015::Kind::Actual2015:
            return TRANSCEIVER2015_VENDOR_ID;
        case Transceiver2015::Kind::HBC:
            return HBC_VENDOR_ID;
    }
}

constexpr qint16 pidForKind(Transceiver2015::Kind kind) {
    switch (kind) {
        case Transceiver2015::Kind::Actual2015:
            return TRANSCEIVER2015_PRODUCT_ID;
        case Transceiver2015::Kind::HBC:
            return HBC_PRODUCT_ID;
    }
}

int Transceiver2015::numDevicesPresent(Kind kind)
{
#ifdef USB_FOUND
    qint16 vid = vidForKind(kind);
    qint16 pid = pidForKind(kind);

    libusb_init(nullptr);

    libusb_device** deviceList = nullptr;
    const int n = libusb_get_device_list(nullptr, &deviceList);
    const int num_found = std::count_if(deviceList, deviceList + n, [vid, pid](libusb_device *device) -> bool {
        libusb_device_descriptor descriptor;
        // always succeeds if libusb version >= 1.0.16
        libusb_get_device_descriptor(device, &descriptor);
        return descriptor.idVendor == vid
            && descriptor.idProduct == pid;
    });
    libusb_free_device_list(deviceList, true);

    return num_found;
#else
    return 0;
#endif // USB_FOUND
}

Transceiver2015::Transceiver2015(Kind kind, const Timer *timer, QObject *parent) :
    TransceiverLayer(parent),
    m_kind(kind),
    m_timer(timer)
{
    // default channel
    m_configuration.set_channel(10);
}

Transceiver2015::~Transceiver2015()
{
    close();
#ifdef USB_FOUND
    delete m_context;
#endif
}

bool Transceiver2015::open()
{
#ifdef USB_FOUND
    if (!m_context) {
        m_context = new USBThread();
    }

    close();

    QList<USBDevice*> devices = USBDevice::getDevices(vidForKind(m_kind), pidForKind(m_kind), m_context);
    if (devices.isEmpty()) {
        emit errorOccurred("Device not found");
        return false;
    }

    // just assumes it's the first matching device
    USBDevice *device = devices.takeFirst();
    qDeleteAll(devices);

    m_device = device;
    connect(m_device, &USBDevice::readyRead, this, &Transceiver2015::onReadyRead);

    // try to open the communication channel
    if (!m_device->open(QIODevice::ReadWrite)) {
        emit errorOccurred(m_device->errorString());
        return false;
    }

    // publish transceiver status
    Status status(new amun::Status);
    status->mutable_transceiver()->set_active(true);
    status->mutable_transceiver()->set_error("Handshake");
    emit sendStatus(status);

    // send protocol handshake
    // the transceiver should return the highest supported version <= hostConfig->protocolVersion
    // if the version is higher/less than supported by the host, then the connection will fail
    m_connectionState = State::HANDSHAKE;
    sendInitPacket();

    return true;
#else
    emit errorOccurred("Compiled without libusb support!");

    return false;
#endif // USB_FOUND
}

void Transceiver2015::addSendCommand(const Radio::Address &target, size_t expectedResponseSize, const char *data, size_t len)
{
    TransceiverCommandPacket senderCommand;
    senderCommand.command = COMMAND_SEND_NRF24;
    senderCommand.size = len + sizeof(TransceiverSendNRF24Packet);

    const auto getTargetAddress = [&](int broadcastGenerationTag, const uint8_t unicastAddressTemplate[], size_t addressTemplateLength) -> TransceiverSendNRF24Packet {
        TransceiverSendNRF24Packet targetAddress;

        if (target.isBroadcast()) {
            // robot_datagram is used to broadcast both at generation 2014 and 2018
            memcpy(targetAddress.address, robot_datagram, sizeof(robot_datagram));
            // broadcast (0x1f) to generation with broadcastGenerationTag
            targetAddress.address[0] |= 0x1f | broadcastGenerationTag;
        } else {
            memcpy(targetAddress.address, unicastAddressTemplate, addressTemplateLength);
            targetAddress.address[0] |= target.unicastTarget();
        }

        targetAddress.expectedResponseSize = expectedResponseSize;

        return targetAddress;
    };

    TransceiverSendNRF24Packet targetAddress;
    switch (target.generation) {
    case Radio::Generation::Gen2014:
        targetAddress = getTargetAddress(
            0x20, robot2014_address, sizeof(robot2014_address)
        );
        break;
    case Radio::Generation::Gen2018:
        targetAddress = getTargetAddress(
            robot2018_address[0], robot2018_address, sizeof(robot2018_address)
        );
        break;
    }

    m_packet.append((const char*) &senderCommand, sizeof(senderCommand));
    m_packet.append((const char*) &targetAddress, sizeof(targetAddress));
    m_packet.append((const char*) data, len);
}

void Transceiver2015::addPingPacket(qint64 time)
{
    // Append ping packet with current timestamp
    TransceiverCommandPacket senderCommand;
    senderCommand.command = COMMAND_PING;
    senderCommand.size = sizeof(TransceiverPingData);

    TransceiverPingData ping;
    ping.time = time;

    m_packet.append((const char*) &senderCommand, sizeof(senderCommand));
    m_packet.append((const char*) &ping, sizeof(ping));
}

void Transceiver2015::addStatusPacket()
{
    // request count of dropped usb packets
    TransceiverCommandPacket senderCommand;
    senderCommand.command = COMMAND_STATUS;
    senderCommand.size = 0;

    m_packet.append((const char*) &senderCommand, sizeof(senderCommand));
}

void Transceiver2015::flush(qint64 time)
{
    // Workaround for usb problems if packet size is a multiple of transfer size
    if (m_packet.size() % 64 == 0) {
        addPingPacket(time);
    }

    write(m_packet);
}

void Transceiver2015::handleCommand(const Command &command)
{
    if (command->has_transceiver()) {
        const amun::CommandTransceiver &t = command->transceiver();

        if (t.has_configuration()) {
            m_configuration = t.configuration();
            sendTransceiverConfiguration();
        }
    }
}

void Transceiver2015::onReadyRead()
{
#ifdef USB_FOUND
    if (!m_device) {
        return;
    }

    const int maxSize = 512;
    char buffer[maxSize];
    QList<QByteArray> rawResponses;


    // read until no further data is available
    const int size = m_device->read(buffer, maxSize);
    if (size == -1) {
        emit errorOccurred(m_device->errorString());
        return;
    }

    const qint64 receiveTime = m_timer->currentTime();

    int pos = 0;
    while (pos < size) {
        // check header size
        if (pos + (int)sizeof(TransceiverResponsePacket) > size) {
            break;
        }

        const TransceiverResponsePacket *header = (const TransceiverResponsePacket*) &buffer[pos];
        // check command content size
        if (pos + (int)sizeof(TransceiverResponsePacket) + header->size > size) {
            break;
        }

        pos += sizeof(TransceiverResponsePacket);
        // handle command
        switch (header->command) {
        case COMMAND_INIT_REPLY:
            handleInitPacket(&buffer[pos], header->size);
            break;
        case COMMAND_PING_REPLY:
            handlePingPacket(&buffer[pos], header->size);
            break;
        case COMMAND_STATUS_REPLY:
            handleStatusPacket(&buffer[pos], header->size);
            break;
        case COMMAND_REPLY_FROM_ROBOT:
            rawResponses.append(QByteArray { &buffer[pos], header->size });
            break;
        case COMMAND_DATAGRAM_RECEIVED:
            handleDatagramPacket(&buffer[pos], header->size);
            break;
        }

        pos += header->size;
    }

    emit sendRawRadioResponses(receiveTime, rawResponses);
#endif // USB_FOUND
}

bool Transceiver2015::write(const QByteArray &packet)
{
#ifdef USB_FOUND
    if (!m_device) {
        return false;
    }

    // close radio link on errors
    // transmission usually either succeeds completely or fails horribly
    // write does not actually guarantee complete delivery!
    if (m_device->write(packet) < 0) {
        emit errorOccurred(m_device->errorString());
        return false;
    }
#endif // USB_FOUND
    return true;
}

void Transceiver2015::close()
{
#ifdef USB_FOUND
    delete m_device;
    m_device = nullptr;
    m_connectionState = State::DISCONNECTED;
#endif
}

void Transceiver2015::handleInitPacket(const char *data, uint size)
{
    // only allowed during handshake
    if (m_connectionState != State::HANDSHAKE || size < 2) {
        emit errorOccurred("Invalid reply from transceiver", (qint64) 10 * 1000 * 1000 * 1000);
        return;
    }

    const TransceiverInitPacket *handshake = (const TransceiverInitPacket *)data;
    if (handshake->protocolVersion < PROTOCOL_VERSION) {
        emit errorOccurred("Outdated firmware", (qint64) 10 * 1000 * 1000 * 1000);
        return;
    } else if (handshake->protocolVersion > PROTOCOL_VERSION) {
        emit errorOccurred("Not yet supported transceiver firmware", (qint64) 10 * 1000 * 1000 * 1000);
        return;
    }

    m_connectionState = State::CONNECTED;
    emit deviceResponded();

    Status status(new amun::Status);
    status->mutable_transceiver()->set_active(true);
    emit sendStatus(status);

    // send channel informations
    sendTransceiverConfiguration();
}

void Transceiver2015::handlePingPacket(const char *data, uint size)
{
    if (size < sizeof(TransceiverPingData)) {
        return;
    }

    const TransceiverPingData *ping = (const TransceiverPingData *) data;
    Status status(new amun::Status);
    status->mutable_timing()->set_transceiver_rtt((Timer::systemTime() - ping->time) * 1E-9f);
    emit sendStatus(status);

    emit deviceResponded();
}

void Transceiver2015::handleStatusPacket(const char *data, uint size)
{
    if (size < sizeof(TransceiverStatusPacket)) {
        return;
    }

    const TransceiverStatusPacket *transceiverStatus = (const TransceiverStatusPacket *)data;
    Status status(new amun::Status);
    status->mutable_transceiver()->set_active(true);
    status->mutable_transceiver()->set_dropped_usb_packets(transceiverStatus->droppedPackets);
    emit sendStatus(status);

    emit deviceResponded();
}

void Transceiver2015::handleDatagramPacket(const char *data, uint size)
{
    Status status(new amun::Status);
    amun::DebugValues *debug = status->add_debug();
    debug->set_source(amun::RadioResponse);
    QString debugMessage = QString("[Length: %1] %2").arg(size).arg(QString::fromUtf8(data, size));
    amun::StatusLog *logEntry = debug->add_log();
    logEntry->set_timestamp(m_timer->currentTime());
    logEntry->set_text(debugMessage.toStdString());
    emit sendStatus(status);

    emit deviceResponded();
}

void Transceiver2015::sendInitPacket()
{
    // send init handshake
    TransceiverCommandPacket senderCommand;
    senderCommand.command = COMMAND_INIT;
    senderCommand.size = sizeof(TransceiverInitPacket);

    TransceiverInitPacket config;
    config.protocolVersion = PROTOCOL_VERSION;

    QByteArray usb_packet;
    usb_packet.append((const char *) &senderCommand, sizeof(senderCommand));
    usb_packet.append((const char *) &config, sizeof(config));
    write(usb_packet);
}

void Transceiver2015::sendTransceiverConfiguration()
{
    // configure transceiver frequency
    TransceiverCommandPacket senderCommand;
    senderCommand.command = COMMAND_SET_FREQUENCY;
    senderCommand.size = sizeof(TransceiverSetFrequencyPacket);

    TransceiverSetFrequencyPacket config;
    config.channel = m_configuration.channel();

    QByteArray usb_packet;
    usb_packet.append((const char *) &senderCommand, sizeof(senderCommand));
    usb_packet.append((const char *) &config, sizeof(config));
    write(usb_packet);
}

