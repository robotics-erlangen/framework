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

#include "transceiverHBC.h"

#include "core/timer.h"
#include "radio_address.h"
#include "firmware-interface/radiocommand.h"
#include "transceiverlayer.h"
#include "usbdevice.h"
#include "usbthread.h"
#include <QByteArray>
#include <QString>
#include <QtGlobal>
#include <cstring>
#include "firmware-interface/radiocommand2014.h"
#include "firmware-interface/radiocommandpasta.h"
#include "firmware-interface/transceiver2012.h"
#include <libusb.h>
#include <memory>
#include <optional>
#include <QEventLoop>
#include <qdebug.h>
#include <qeventloop.h>
#include <QTimer>
#include <qglobal.h>
#include <qtimer.h>

using namespace Radio;

typedef struct
{
    int64_t time;
} __attribute__ ((packed)) TransceiverPingData;

const int PROTOCOL_VERSION = 5;

constexpr qint16 HBC_VENDOR_ID  = 0x09fb;
constexpr qint16 HBC_PRODUCT_ID_PRIMARY = 0x0de2;
constexpr qint16 HBC_PRODUCT_ID_SECONDARY = 0x0ee2;

std::pair<std::vector<std::unique_ptr<TransceiverLayer>>, std::vector<TransceiverError>> TransceiverHBC::tryOpen(USBThread* context, const Timer* timer, QObject* parent)
{
    std::vector<std::unique_ptr<TransceiverLayer>> transceivers;
    std::vector<TransceiverError> errors;

    const auto baseName = QString {"HBC"};
    constexpr auto vidForKind = [](Kind kind) {
        return HBC_VENDOR_ID;
    };

    constexpr auto pidForKind = [](Kind kind) {
        switch (kind) {
            case Kind::Primary:
                return HBC_PRODUCT_ID_PRIMARY;
            case Kind::Secondary:
                return HBC_PRODUCT_ID_SECONDARY;
        }
        Q_UNREACHABLE();
    };

    constexpr auto getNameForKind = [](Kind kind) {
        switch (kind) {
            case Kind::Primary:
                return "HBCPrim";
            case Kind::Secondary:
                return "HBCSec";
        };
        Q_UNREACHABLE();
    };

    for (const Kind kind : {Kind::Primary, Kind::Secondary}) {
        const auto vid = vidForKind(kind);
        const auto pid = pidForKind(kind);

        QList<USBDevice*> devices = USBDevice::getDevices(vid, pid, context);
        if (devices.isEmpty()) {
            continue;
        }

        const auto name = getNameForKind(kind);
        if (devices.size() > 1) {
            errors.emplace_back(baseName, QString{"More than one %1 does not make sense!"}.arg(name));
            continue;
        }

        USBDevice *device = devices.takeFirst();
        // devices should be empty now, but just in case delete the rest of the list
        qDeleteAll(devices);

        // can't be make_unique, because the constructor is private, which means make_unique can't call it
        auto transceiver = std::unique_ptr<TransceiverHBC>(new TransceiverHBC(device, timer, name, kind));

        const auto transceiverErrors = transceiver->tryConnect(parent);
        if (transceiverErrors.has_value()) {
            errors.insert(errors.end(), transceiverErrors.value().begin(), transceiverErrors.value().end());
        } else {
            transceivers.push_back(std::move(transceiver));
        }
    }

    return {std::move(transceivers), std::move(errors)};
}

TransceiverHBC::TransceiverHBC(USBDevice *device, const Timer *timer, QString debugName, Kind kind) :
    TransceiverLayer(),
    m_device(device),
    m_timer(timer),
    m_kind(kind),
    m_debugName(debugName)
{
    connect(m_device, &USBDevice::readyRead, this, &TransceiverHBC::onReadyRead);
}

void TransceiverHBC::onReadyRead()
{
    const auto readError = read();
    if (readError.has_value()) {
        emit errorOccurred(*readError);
    }
}

TransceiverHBC::~TransceiverHBC()
{
    delete m_device;
}

std::optional<std::vector<TransceiverError>> TransceiverHBC::tryConnect(QObject* parent)
{
    connect(this, SIGNAL(sendStatus(Status)), parent, SIGNAL(sendStatus(Status)));
    std::vector<TransceiverError> deviceError;
    const auto gatherErrorConnection = connect(this, &TransceiverLayer::errorOccurred, [&deviceError] (const TransceiverError& error) {
        deviceError.emplace_back(error);
    });
    connect(this, SIGNAL(sendRawRadioResponses(qint64, QList<QByteArray>)), parent, SLOT(onRawRadioResponse(qint64, QList<QByteArray>)));
    // TODO We should keep a per device timeout
    connect(this, SIGNAL(deviceResponded(QString)), parent, SLOT(transceiverResponded(QString)));

    // try to open the communication channel
    if (!m_device->open(QIODevice::ReadWrite)) {
        return {{TransceiverError(m_debugName, m_device->errorString(), (qint64) 1000 * 1000 * 1000)}};
    }

    const auto maybeError = sendInitPacket();
    if (maybeError.has_value()) {
        return {{*maybeError}};
    }
    QEventLoop loop;
    connect(this, &TransceiverHBC::connectionSucceeded, &loop, &QEventLoop::quit, Qt::ConnectionType::DirectConnection);
    QTimer timer;
    connect(&timer, &QTimer::timeout, &loop, &QEventLoop::quit, Qt::ConnectionType::DirectConnection);
    timer.setSingleShot(true);
    timer.start(100);
    loop.exec();
    QObject::disconnect(gatherErrorConnection);

    // only add transceiver if it is connected after handshake
    if (!deviceError.empty()) {
        return deviceError;
    } else if (!isOpen()) {
        return {{TransceiverError(m_debugName, "Handshake timed out!", (qint64) 1000 * 1000 * 1000)}};
    } else {
        // technically we could lose an error that happens between the disconnect above and here,
        // but it *probably* will never lead to any issues. Hopefully.
        connect(this, SIGNAL(errorOccurred(TransceiverError)), parent, SLOT(transceiverErrorOccurred(TransceiverError)));
        return {};
    }
}

std::optional<TransceiverError> TransceiverHBC::read()
{
    const int maxSize = 512;
    char buffer[maxSize];
    QList<QByteArray> rawResponses;


    // read until no further data is available
    const int size = m_device->read(buffer, maxSize);
    if (size == -1) {
        m_connectionState = State::DISCONNECTED;
        return TransceiverError(m_debugName, m_device->errorString(), (qint64) 1000 * 1000 * 1000);
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
        case COMMAND_INIT_REPLY: {
                const auto result = handleInitPacket(&buffer[pos], header->size);
                if (result.has_value()) {
                    return result;
                } else {
                    emit connectionSucceeded();
                }
                break;
            }
        case COMMAND_PING_REPLY:
            handlePingPacket(&buffer[pos], header->size);
            break;
        case COMMAND_STATUS_REPLY:
            handleStatusPacket(&buffer[pos], header->size);
            break;
        case COMMAND_REPLY_FROM_ROBOT:
            rawResponses.append(buildRawRadioResponse(&buffer[pos], header->size));
            break;
        case COMMAND_DATAGRAM_RECEIVED:
            qDebug() << "HBC received DATAGRAM?";
            break;
        }

        pos += header->size;
    }

    emit sendRawRadioResponses(receiveTime, rawResponses);

    return {};
}

std::optional<TransceiverError> TransceiverHBC::sendInitPacket()
{
    // publish transceiver status
    Status status(new amun::Status);
    status->mutable_transceiver()->set_active(true);
    status->mutable_transceiver()->set_name(m_debugName.toStdString());
    status->mutable_transceiver()->set_error("Handshake");
    emit sendStatus(status);

    // send protocol handshake
    // the transceiver should return the highest supported version <= hostConfig->protocolVersion
    // if the version is higher/less than supported by the host, then the connection will fail
    m_connectionState = State::HANDSHAKE;

    // send init handshake
    TransceiverCommandPacket senderCommand;
    senderCommand.command = COMMAND_INIT;
    senderCommand.size = sizeof(TransceiverInitPacket);

    TransceiverInitPacket config;
    config.protocolVersion = PROTOCOL_VERSION;

    QByteArray usb_packet;
    usb_packet.append((const char *) &senderCommand, sizeof(senderCommand));
    usb_packet.append((const char *) &config, sizeof(config));
    return write(usb_packet);
}


void TransceiverHBC::addSendCommand(const Radio::Address &target, size_t expectedResponseSize, const char *data, size_t len)
{
    // the HBC transceivers can only send to one half of the ids of the robots, so it does not make sense to send commands for all 16 to
    // every single one of them
    if ((m_kind == Kind::Primary && target.unicastTarget() > 7) || (m_kind == Kind::Secondary && target.unicastTarget() < 8)) {
        return;
    }

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
    case Radio::Generation::Gen2025:
        targetAddress = getTargetAddress(
            robotPasta_address[0], robotPasta_address, sizeof(robotPasta_address)
        );
        break;
    }

    m_packet.append((const char*) &senderCommand, sizeof(senderCommand));
    m_packet.append((const char*) &targetAddress, sizeof(targetAddress));
    m_packet.append((const char*) data, len);
}

void TransceiverHBC::addPingPacket(qint64 time)
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

void TransceiverHBC::addStatusPacket()
{
    // request count of dropped usb packets
    TransceiverCommandPacket senderCommand;
    senderCommand.command = COMMAND_STATUS;
    senderCommand.size = 0;

    m_packet.append((const char*) &senderCommand, sizeof(senderCommand));
}


QByteArray TransceiverHBC::buildRawRadioResponse(const char *data, uint size) {
    QByteArray rawRadioResponse{(int)size + 1, 0};
    char *rawRadioResponseData = rawRadioResponse.data();
    rawRadioResponse[0] = ResponseCommand::RESPONSE_2025_DEFAULT;
    std::memcpy(rawRadioResponseData + 1, data, size);
    return rawRadioResponse;
}

std::optional<TransceiverError> TransceiverHBC::handleInitPacket(const char *data, uint size)
{
    // only allowed during handshake
    if (m_connectionState != State::HANDSHAKE || size < 2) {
        return TransceiverError(m_debugName, "Invalid reply from transceiver");
    }

    const TransceiverInitPacket *handshake = (const TransceiverInitPacket *)data;
    if (handshake->protocolVersion < PROTOCOL_VERSION) {
        return TransceiverError(m_debugName, "Outdated firmware");
    } else if (handshake->protocolVersion > PROTOCOL_VERSION) {
        return TransceiverError(m_debugName, "Not yet supported transceiver firmware");
    }

    m_connectionState = State::CONNECTED;
    emit deviceResponded(m_debugName);

    Status status(new amun::Status);
    status->mutable_transceiver()->set_active(true);
    status->mutable_transceiver()->set_name(m_debugName.toStdString());
    emit sendStatus(status);

    return {};
}

void TransceiverHBC::handlePingPacket(const char *data, uint size)
{
    if (size < sizeof(TransceiverPingData)) {
        return;
    }

    const TransceiverPingData *ping = (const TransceiverPingData *) data;
    Status status(new amun::Status);
    status->mutable_timing()->set_transceiver_rtt((Timer::systemTime() - ping->time) * 1E-9f);
    emit sendStatus(status);

    emit deviceResponded(m_debugName);
}

void TransceiverHBC::handleStatusPacket(const char *data, uint size)
{
    if (size < sizeof(TransceiverStatusPacket)) {
        return;
    }

    const TransceiverStatusPacket *transceiverStatus = (const TransceiverStatusPacket *)data;
    Status status(new amun::Status);
    status->mutable_transceiver()->set_active(true);
    status->mutable_transceiver()->set_name(m_debugName.toStdString());
    status->mutable_transceiver()->set_dropped_usb_packets(transceiverStatus->droppedPackets);
    emit sendStatus(status);

    emit deviceResponded(m_debugName);
}

std::optional<TransceiverError> TransceiverHBC::handleCommand(const Command &command)
{
    return {};
}

std::optional<TransceiverError> TransceiverHBC::write(const QByteArray &packet)
{
    // close radio link on errors
    // transmission usually either succeeds completely or fails horribly
    // write does not actually guarantee complete delivery!
    if (m_device->write(packet) < 0) {
        m_connectionState = State::DISCONNECTED;
        return TransceiverError(m_debugName, m_device->errorString(), (qint64) 1000 * 1000 * 1000);
    }

    return {};
}

std::optional<TransceiverError> TransceiverHBC::flush(qint64 time)
{
    // Workaround for usb problems if packet size is a multiple of transfer size
    if (m_packet.size() % 64 == 0) {
        addPingPacket(time);
    }

    return write(m_packet);
}

