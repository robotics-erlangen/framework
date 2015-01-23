/***************************************************************************
 *   Copyright 2014 Michael Bleier, Michael Eischer, Jan Kallwies,         *
 *       Philipp Nordhus                                                   *
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

#include "config.h"
#include "transceiver.h"
#include "core/timer.h"
#include "firmware/common/radiocommand.h"
#include "firmware/2012/common/radiocommand2012.h"
#include "firmware/2012/common/transceiver2012.h"
#include "firmware/2014/common/radiocommand2014.h"
#include "firmware/common/radiocommand.h"
#include "usbdevice.h"
#include <QMap>
#include <QDebug>

Transceiver::Transceiver(QObject *parent) :
    QObject(parent),
    m_charge(false),
    m_number(0),
    m_device(NULL)
{
    // default channel
    m_configuration.set_channel(10);
}

void Transceiver::handleRadioCommands(const QList<robot::RadioCommand> &commands)
{
    Status status(new amun::Status);
    const qint64 transceiver_start = Timer::systemTime();

    // charging the condensator can be enabled / disable separately
    sendCommand(commands, m_charge);

    status->mutable_timing()->set_transceiver((Timer::systemTime() - transceiver_start) / 1E9);
    emit sendStatus(status);
}

void Transceiver::handleCommand(const Command &command)
{
    if (command->has_transceiver()) {
        const amun::CommandTransceiver &t = command->transceiver();
        if (t.has_enable()) {
            if (t.enable()) {
                open();
            } else {
                close();
            }
        }

        if (t.has_charge()) {
            m_charge = t.charge();
        }

        if (t.has_configuration()) {
            m_configuration = t.configuration();
            sendTransceiverConfiguration();
        }
    }

    if (command->has_robot_parameters()) {
        sendParameters(command->robot_parameters());
    }
}

bool Transceiver::open()
{
#ifdef USB_FOUND
    close();

    // get transceiver
    QList<USBDevice*> devices = USBDevice::getDevices(0x03eb, 0x6127);
    if (devices.isEmpty()) {
        Status status(new amun::Status);
        status->mutable_transceiver()->set_active(false);
        status->mutable_transceiver()->set_error("Device not found!");
        emit sendStatus(status);
        return false;
    }

    // just assumes it's the first matching device
    USBDevice *device = devices.takeFirst();
    qDeleteAll(devices);

    m_device = device;
    connect(m_device, SIGNAL(readyRead()), SLOT(receive()));

    // try to open the communication channel
    if (!device->open(QIODevice::ReadWrite)) {
        close();
        return false;
    }

    // publish transceiver status
    Status status(new amun::Status);
    status->mutable_transceiver()->set_active(true);
    emit sendStatus(status);

    // send channel informations
    sendTransceiverConfiguration();

    return true;
#else
    Status status(new amun::Status);
    status->mutable_transceiver()->set_active(false);
    status->mutable_transceiver()->set_error("libusb is not installed!");
    emit sendStatus(status);
    return false;
#endif // USB_FOUND
}

void Transceiver::close()
{
#ifdef USB_FOUND
    // close and cleanup
    if (m_device) {
        Status status(new amun::Status);
        status->mutable_transceiver()->set_active(false);
        status->mutable_transceiver()->set_error(m_device->errorString().toStdString());
        emit sendStatus(status);

        delete m_device;
        m_device = NULL;
    }
#endif // USB_FOUND
}

float Transceiver::calculateDroppedFramesRatio(uint generation, uint id, uint8_t counter)
{
    // get frame counter, is created with default values if not existing
    DroppedFrameCounter &c = m_droppedFrames[qMakePair(generation, id)];

    // correctly handle startup
    if (c.startValue == -1) {
        c.startValue = counter;
    } else if (counter > c.lastFrameCounter) {
        // counter should have increased by one
        // if it has increased further, then we've lost a packet
        c.droppedFramesCounter += counter - c.lastFrameCounter - 1;
    } else {
        // counter isn't increasing -> counter has overflown, update statistic
        // account for packets lost somewhere around the counter overflow
        c.droppedFramesRatio = (c.droppedFramesCounter + (255 - c.lastFrameCounter)) / (256.f - c.startValue);
        // if the counter is non-zero we've already lost some packets
        c.droppedFramesCounter = counter;
        c.startValue = 0;
    }

    c.lastFrameCounter = counter;

    return c.droppedFramesRatio;
}

void Transceiver::handleResponsePacket(QList<robot::RadioResponse> &responses, const char *data, int size, qint64 time)
{
    const RadioResponseHeader *header = (const RadioResponseHeader *)data;
    size -= sizeof(RadioResponseHeader);
    data += sizeof(RadioResponseHeader);

    if (header->command == RESPONSE_2012_DEFAULT && size == sizeof(RadioResponse2012)) {
        const RadioResponse2012 *packet = (const RadioResponse2012 *)data;

        robot::RadioResponse r;
        r.set_time(time);
        r.set_generation(2);
        r.set_id(packet->id);
        r.set_battery(packet->battery / 255.0f);
        r.set_packet_loss_rx(packet->packet_loss / 255.0f);
        float df = calculateDroppedFramesRatio(2, packet->id, packet->counter);
        r.set_packet_loss_tx(df);
        if (packet->main_active) {
            robot::SpeedStatus *speedStatus = r.mutable_estimated_speed();
            speedStatus->set_v_f(packet->v_f / 1000.f);
            speedStatus->set_v_s(packet->v_s / 1000.f);
            speedStatus->set_omega(packet->omega / 1000.f);
            r.set_motor_in_power_limit(packet->motor_in_power_limit);
        }
        if (packet->kicker_active) {
            r.set_ball_detected(packet->ball_detected);
            r.set_cap_charged(packet->cap_charged);
        }
        responses.append(r);
    } else  if (header->command == RESPONSE_2014_DEFAULT && size == sizeof(RadioResponse2014)) {
        const RadioResponse2014 *packet = (const RadioResponse2014 *)data;

        robot::RadioResponse r;
        r.set_generation(3);
        r.set_id(packet->id);
        r.set_battery(packet->battery / 255.0f);
        r.set_packet_loss_rx(packet->packet_loss / 255.0f);
        float df = calculateDroppedFramesRatio(3, packet->id, packet->counter);
        r.set_packet_loss_tx(df);
        if (packet->power_enabled) {
            robot::SpeedStatus *speedStatus = r.mutable_estimated_speed();
            speedStatus->set_v_f(packet->v_f / 1000.f);
            speedStatus->set_v_s(packet->v_s / 1000.f);
            speedStatus->set_omega(packet->omega / 1000.f);
            r.set_motor_in_power_limit(packet->motor_in_power_limit);

            r.set_ball_detected(packet->ball_detected);
            r.set_cap_charged(packet->cap_charged);
        }
        responses.append(r);
    }
}

void Transceiver::receive()
{
#ifdef USB_FOUND
    const int maxSize = 512;
    char buffer[maxSize];
    QList<robot::RadioResponse> responses;

    // read until no further data is available
    const int size = m_device->read(buffer, maxSize);
    if (size == -1) {
        close();
        return;
    }

    // transceiver class is only used for real robot -> global timer can be used
    const qint64 receiveTime = Timer::systemTime();

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
        if (header->command == COMMAND_REPLY_FROM_ROBOT) {
            handleResponsePacket(responses, &buffer[pos], header->size, receiveTime);
        }
        pos += header->size;
    }

    emit sendRadioResponses(responses);
#endif // USB_FOUND
}

void Transceiver::sendCommand(const QList<robot::RadioCommand> &commands, bool charge)
{
    if (!m_device) {
        if (!open()) {
            return;
        }
    }

    typedef QList<robot::RadioCommand> RobotList;

    QMap<uint, RobotList> generations;
    foreach (const robot::RadioCommand &robot, commands) {
        // group by generation
        generations[robot.generation()].append(robot);
    }

    m_counter2012++;

    // used for packet assembly
    QByteArray usb_packet;

    QMapIterator<uint, RobotList> it(generations);
    while (it.hasNext()) {
        it.next();

        if (it.key() == 2) {
            foreach (const robot::RadioCommand &radio_command, it.value()) {
                const robot::Command &command = radio_command.command();

                // copy command
                RadioCommand2012 data;
                data.charge = charge;
                data.standby = command.standby();
                data.counter = m_counter2012;
                data.dribbler = qBound<qint32>(-RADIOCOMMAND2012_DRIBBLER_MAX, command.dribbler() * RADIOCOMMAND2012_DRIBBLER_MAX, RADIOCOMMAND2012_DRIBBLER_MAX);
                data.chip = command.kick_style() == robot::Command::Chip;
                data.shot_power = qMin<quint32>(command.kick_power() * RADIOCOMMAND2012_KICK_MAX, RADIOCOMMAND2012_KICK_MAX);
                data.v_x = qBound<qint32>(-RADIOCOMMAND2012_V_MAX, command.v_s() * 1000.0f, RADIOCOMMAND2012_V_MAX);
                data.v_y = qBound<qint32>(-RADIOCOMMAND2012_V_MAX, command.v_f() * 1000.0f, RADIOCOMMAND2012_V_MAX);
                data.omega = qBound<qint32>(-RADIOCOMMAND2012_OMEGA_MAX, command.omega() * 1000.0f, RADIOCOMMAND2012_OMEGA_MAX);
                data.id = radio_command.id();

                // set address
                TransceiverCommandPacket senderCommand;
                senderCommand.command = COMMAND_SEND_NRF24;
                memcpy(senderCommand.address, robot2012_address, sizeof(senderCommand.address));
                senderCommand.address[4] |= radio_command.id();
                senderCommand.size = sizeof(data);
                senderCommand.expectedResponseSize = sizeof(RadioResponseHeader) + sizeof(RadioResponse2012);

                usb_packet.append((const char*) &senderCommand, sizeof(senderCommand));
                usb_packet.append((const char*) &data, sizeof(data));
            }
        } else if (it.key() == 3) {
            foreach (const robot::RadioCommand &radio_command, it.value()) {
                const robot::Command &command = radio_command.command();

                // copy command
                RadioCommand2014 data;
                data.charge = charge;
                data.standby = command.standby();
                data.counter = m_counter2012;
                data.dribbler = qBound<qint32>(-RADIOCOMMAND2014_DRIBBLER_MAX, command.dribbler() * RADIOCOMMAND2014_DRIBBLER_MAX, RADIOCOMMAND2014_DRIBBLER_MAX);
                data.chip = command.kick_style() == robot::Command::Chip;
                data.shot_power = qMin<quint32>(command.kick_power() * RADIOCOMMAND2014_KICK_MAX, RADIOCOMMAND2014_KICK_MAX);
                data.v_x = qBound<qint32>(-RADIOCOMMAND2014_V_MAX, command.v_s() * 1000.0f, RADIOCOMMAND2014_V_MAX);
                data.v_y = qBound<qint32>(-RADIOCOMMAND2014_V_MAX, command.v_f() * 1000.0f, RADIOCOMMAND2014_V_MAX);
                data.omega = qBound<qint32>(-RADIOCOMMAND2014_OMEGA_MAX, command.omega() * 1000.0f, RADIOCOMMAND2014_OMEGA_MAX);
                data.id = radio_command.id();

                // set address
                TransceiverCommandPacket senderCommand;
                senderCommand.command = COMMAND_SEND_NRF24;
                memcpy(senderCommand.address, robot2014_address, sizeof(senderCommand.address));
                senderCommand.address[4] |= radio_command.id();
                senderCommand.size = sizeof(data);
                senderCommand.expectedResponseSize = sizeof(RadioResponseHeader) + sizeof(RadioResponse2014);

                usb_packet.append((const char*) &senderCommand, sizeof(senderCommand));
                usb_packet.append((const char*) &data, sizeof(data));
            }
        }
    }

    write(usb_packet.data(), usb_packet.size());
}

void Transceiver::sendParameters(const robot::RadioParameters &parameters)
{
    if (!m_device) {
        if (!open()) {
            return;
        }
    }
    RadioParameters2012 p;
    memset(&p, 0, sizeof(p));

    // copy up to 16 radio parameters, 2 bytes per parameter
    for (int i=0; i<parameters.p_size() && i<16; i++) {
        p.k[i] = parameters.p(i);
    }

    // broadcast config
    TransceiverCommandPacket senderCommand;
    senderCommand.command = COMMAND_SEND_NRF24;
    memcpy(senderCommand.address, robot2012_config_broadcast, sizeof(senderCommand.address));
    senderCommand.size = sizeof(p);

    QByteArray usb_packet;
    usb_packet.append((const char *) &senderCommand, sizeof(senderCommand));
    usb_packet.append((const char *) &p, senderCommand.size);
    write(usb_packet.data(), usb_packet.size());
}

void Transceiver::sendTransceiverConfiguration()
{
    // configure transceiver frequency
    TransceiverCommandPacket senderCommand;
    senderCommand.command = COMMAND_SET_FREQUENCY;
    senderCommand.size = 0;
    senderCommand.channel = m_configuration.channel();
    senderCommand.primary = true; // a bit of backwards compatibility

    QByteArray usb_packet;
    usb_packet.append((const char *) &senderCommand, sizeof(senderCommand));
    write(usb_packet.data(), usb_packet.size());
}

bool Transceiver::write(const char *data, qint64 size)
{
#ifdef USB_FOUND
    if (!m_device) {
        return false;
    }

    // close radio link on errors
    if (m_device->write(data, size) < 0) {
        close();
        return false;
    }
#endif // USB_FOUND
    return true;
}
