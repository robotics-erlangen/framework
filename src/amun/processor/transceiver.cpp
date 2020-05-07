/***************************************************************************
 *   Copyright 2015 Michael Bleier, Michael Eischer, Jan Kallwies,         *
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

#include "core/timer.h"
#include "firmware-interface/radiocommand.h"
#include "firmware-interface/transceiver2012.h"
#include "firmware-interface/radiocommand2014.h"
#include "firmware-interface/radiocommand2018.h"
#include "transceiver.h"
#include "usbthread.h"
#include "usbdevice.h"
#include <QTimer>

static_assert(sizeof(RadioCommand2014) == 23, "Expected radio command packet of size 23");
static_assert(sizeof(RadioResponse2014) == 10, "Expected radio response packet of size 10");
static_assert(sizeof(RadioCommand2018) == 23, "Expected radio command packet of size 23");
static_assert(sizeof(RadioResponse2018) == 10, "Expected radio response packet of size 10");

const int PROTOCOL_VERSION = 5;

typedef struct
{
    int64_t time;
} __attribute__ ((packed)) TransceiverPingData;


Transceiver::Transceiver(const Timer *timer) :
    m_charge(false),
    m_packetCounter(0),
    m_context(nullptr),
    m_device(nullptr),
    m_connectionState(State::DISCONNECTED),
    m_simulatorEnabled(false),
    m_onlyRestartAfterTimestamp(0),
    m_timer(timer),
    m_droppedCommands(0)
{
    // default channel
    m_configuration.set_channel(10);

    m_timeoutTimer = new QTimer(this);
    m_timeoutTimer->setSingleShot(true);
    connect(m_timeoutTimer, &QTimer::timeout, this, &Transceiver::timeout);

    m_processTimer = new QTimer(this);
    m_processTimer->setSingleShot(true);
    connect(m_processTimer, &QTimer::timeout, this, &Transceiver::process);
}

Transceiver::~Transceiver()
{
    close();
#ifdef USB_FOUND
    delete m_context;
#endif
}

void Transceiver::handleRadioCommands(const QList<robot::RadioCommand> &commands, qint64 processingStart)
{
    m_commands = commands;
    m_processingStart = processingStart;
    if (m_processTimer->isActive()) {
        // the timer is stil active, that is the last commands were not yet processed!
        m_droppedCommands++;
    }
    m_processTimer->start(0);
}

void Transceiver::process()
{
    Status status(new amun::Status);
    const qint64 transceiver_start = Timer::systemTime();

    // charging the condensator can be enabled / disable separately
    sendCommand(m_commands, m_charge, m_processingStart);

    status->mutable_timing()->set_transceiver((Timer::systemTime() - transceiver_start) * 1E-9f);
    emit sendStatus(status);
}

void Transceiver::handleCommand(const Command &command)
{
    if (command->has_simulator()) {
        if (command->simulator().has_enable()) {
            m_simulatorEnabled = command->simulator().enable();
            if (m_simulatorEnabled) {
                close();
            }
        }
    }

    if (command->has_transceiver()) {
        const amun::CommandTransceiver &t = command->transceiver();
        if (t.has_enable() && !m_simulatorEnabled) {
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

    if (command->has_set_team_blue()) {
        handleTeam(command->set_team_blue());
    }

    if (command->has_set_team_yellow()) {
        handleTeam(command->set_team_yellow());
    }
}

void Transceiver::handleTeam(const robot::Team &team)
{
    for (int i = 0; i < team.robot_size(); ++i) {
        const robot::Specs &spec = team.robot(i);
        m_ir_param[qMakePair(spec.generation(), spec.id())] = spec.ir_param();
    }
}

void Transceiver::open()
{
#ifdef USB_FOUND
    if (m_context == nullptr) {
        m_context = new USBThread();
    }

    close();

    // get transceiver
    QList<USBDevice*> devices = USBDevice::getDevices(0x03eb, 0x6127, m_context);
    if (devices.isEmpty()) {
        Status status(new amun::Status);
        status->mutable_transceiver()->set_active(false);
        status->mutable_transceiver()->set_error("Device not found!");
        emit sendStatus(status);
        m_connectionState = State::DISCONNECTED;
        return;
    }

    // just assumes it's the first matching device
    USBDevice *device = devices.takeFirst();
    qDeleteAll(devices);

    m_device = device;
    connect(m_device, SIGNAL(readyRead()), SLOT(receive()));

    // try to open the communication channel
    if (!device->open(QIODevice::ReadWrite)) {
        close();
        return;
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
    // don't get stuck if the transceiver doesn't answer / has too old firmware
    m_timeoutTimer->start(500);
    sendInitPacket();

    return;
#else
    Status status(new amun::Status);
    status->mutable_transceiver()->set_active(false);
    status->mutable_transceiver()->set_error("Compiled without libusb support!");
    emit sendStatus(status);
    return;
#endif // USB_FOUND
}

bool Transceiver::ensureOpen()
{
    if (!m_device && Timer::systemTime() > m_onlyRestartAfterTimestamp) {
        open();
        return false;
    }
    return m_connectionState == State::CONNECTED;
}

void Transceiver::close(const QString &errorMsg, qint64 restartDelayInNs)
{
#ifdef USB_FOUND
    // close and cleanup
    if (m_device != nullptr) {
        Status status(new amun::Status);
        status->mutable_transceiver()->set_active(false);
        if (errorMsg.isNull()) {
            status->mutable_transceiver()->set_error(m_device->errorString().toStdString());
        } else {
            status->mutable_transceiver()->set_error(errorMsg.toStdString());
        }
        emit sendStatus(status);

        delete m_device;
        m_device = nullptr;
        m_timeoutTimer->stop();
    }
    m_connectionState = State::DISCONNECTED;
    m_onlyRestartAfterTimestamp = Timer::systemTime() + restartDelayInNs;
#endif // USB_FOUND
}

void Transceiver::timeout()
{
    close("Transceiver is not responding", (qint64)100*1000*1000);
}

bool Transceiver::write(const char *data, qint64 size)
{
#ifdef USB_FOUND
    if (!m_device) {
        return false;
    }

    // close radio link on errors
    // transmission usually either succeeds completely or fails horribly
    // write does not actually guarantee complete delivery!
    if (m_device->write(data, size) < 0) {
        close();
        return false;
    }
#endif // USB_FOUND
    return true;
}

void Transceiver::receive()
{
#ifdef USB_FOUND
    if (!m_device) {
        return;
    }

    const int maxSize = 512;
    char buffer[maxSize];
    QList<robot::RadioResponse> responses;

    // read until no further data is available
    const int size = m_device->read(buffer, maxSize);
    if (size == -1) {
        close();
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
            handleResponsePacket(responses, &buffer[pos], header->size, receiveTime);
            break;
        case COMMAND_DATAGRAM_RECEIVED:
            handleDatagramPacket(&buffer[pos], header->size);
            break;
        }

        pos += header->size;
    }

    emit sendRadioResponses(responses);
#endif // USB_FOUND
}

void Transceiver::handleInitPacket(const char *data, uint size)
{
    // only allowed during handshake
    if (m_connectionState != State::HANDSHAKE || size < 2) {
        close("Invalid reply from transceiver", (qint64)10*1000*1000*1000);
        return;
    }

    const TransceiverInitPacket *handshake = (const TransceiverInitPacket *)data;
    if (handshake->protocolVersion < PROTOCOL_VERSION) {
        close("Outdated firmware", (qint64)10*1000*1000*1000);
        return;
    } else if (handshake->protocolVersion > PROTOCOL_VERSION) {
        close("Not yet supported transceiver firmware", (qint64)10*1000*1000*1000);
        return;
    }

    m_connectionState = State::CONNECTED;
    m_timeoutTimer->stop();

    Status status(new amun::Status);
    status->mutable_transceiver()->set_active(true);
    emit sendStatus(status);

    // send channel informations
    sendTransceiverConfiguration();
}

void Transceiver::handlePingPacket(const char *data, uint size)
{
    if (size < sizeof(TransceiverPingData)) {
        return;
    }

    const TransceiverPingData *ping = (const TransceiverPingData *)data;
    Status status(new amun::Status);
    status->mutable_timing()->set_transceiver_rtt((Timer::systemTime() - ping->time) * 1E-9f);
    emit sendStatus(status);
    // stop ping timeout timer
    m_timeoutTimer->stop();
}

void Transceiver::handleStatusPacket(const char *data, uint size)
{
    if (size < sizeof(TransceiverStatusPacket)) {
        return;
    }

    const TransceiverStatusPacket *transceiverStatus = (const TransceiverStatusPacket *)data;
    Status status(new amun::Status);
    status->mutable_transceiver()->set_active(true);
    status->mutable_transceiver()->set_dropped_usb_packets(transceiverStatus->droppedPackets);
    status->mutable_transceiver()->set_dropped_commands(m_droppedCommands);
    emit sendStatus(status);
    m_droppedCommands = 0;
}

void Transceiver::handleDatagramPacket(const char *data, uint size)
{
    Status status(new amun::Status);
    amun::DebugValues *debug = status->add_debug();
    debug->set_source(amun::RadioResponse);
    QString debugMessage = QString("[Length: %1] %2").arg(size).arg(QString::fromUtf8(data, size));
    amun::StatusLog *logEntry = debug->add_log();
    logEntry->set_timestamp(m_timer->currentTime());
    logEntry->set_text(debugMessage.toStdString());
    emit sendStatus(status);
}

float Transceiver::calculateDroppedFramesRatio(uint generation, uint id, uint8_t counter, int skipedFrames)
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
        c.lastDroppedFrames = c.droppedFramesCounter + (255 - c.lastFrameCounter);
        // if the counter is non-zero we've already lost some packets
        c.droppedFramesCounter = counter;
    }

    if (c.lastDroppedFrames >= 0 && skipedFrames >= 0) {
        // as the robot can only reply if it got a frame, skip the frames it didn't get (only 2014 / 2018)
        c.droppedFramesRatio = (c.lastDroppedFrames - skipedFrames)
                / (256.f - c.startValue - skipedFrames);
        c.startValue = 0;
        c.lastDroppedFrames = -1;
    }

    c.lastFrameCounter = counter;

    return c.droppedFramesRatio;
}

void Transceiver::handleResponsePacket(QList<robot::RadioResponse> &responses, const char *data, uint size, qint64 time)
{
    const RadioResponseHeader *header = (const RadioResponseHeader *)data;
    size -= sizeof(RadioResponseHeader);
    data += sizeof(RadioResponseHeader);

    if (header->command == RESPONSE_2014_DEFAULT && size == sizeof(RadioResponse2014)) {
        const RadioResponse2014 *packet = (const RadioResponse2014 *)data;

        robot::RadioResponse r;
        r.set_time(time);
        r.set_generation(3);
        r.set_id(packet->id);

        int packet_loss = (packet->extension_id == EXTENSION_BASIC_STATUS) ? packet->packet_loss : -1;
        float df = calculateDroppedFramesRatio(3, packet->id, packet->counter, packet_loss);
        switch (packet->extension_id) {
        case EXTENSION_BASIC_STATUS:
            r.set_battery(packet->battery / 255.0f);
            r.set_packet_loss_rx(packet->packet_loss / 256.0f);
            r.set_packet_loss_tx(df);
            break;
        case EXTENSION_EXTENDED_ERROR:
        {
            robot::ExtendedError *e = r.mutable_extended_error();
            e->set_motor_1_error(packet->motor_1_error);
            e->set_motor_2_error(packet->motor_2_error);
            e->set_motor_3_error(packet->motor_3_error);
            e->set_motor_4_error(packet->motor_4_error);
            e->set_dribbler_error(packet->dribler_error);
            e->set_kicker_error(packet->kicker_error);
            e->set_kicker_break_beam_error(packet->kicker_break_beam_error);
            e->set_motor_encoder_error(packet->motor_encoder_error);
            e->set_main_sensor_error(packet->main_sensor_error);
            e->set_temperature(packet->temperature);
            break;
        }
        default:
            break;
        }

        if (packet->power_enabled) {
            robot::SpeedStatus *speedStatus = r.mutable_estimated_speed();
            speedStatus->set_v_f(packet->v_f / 1000.f);
            speedStatus->set_v_s(packet->v_s / 1000.f);
            speedStatus->set_omega(packet->omega / 1000.f);
            r.set_error_present(packet->error_present);

            r.set_ball_detected(packet->ball_detected);
            r.set_cap_charged(packet->cap_charged);
        }
        if (m_frameTimes.contains(packet->counter)) {
            r.set_radio_rtt((time - m_frameTimes[packet->counter]) * 1E-9f);
        }
        responses.append(r);
    } else if (header->command == RESPONSE_2018_DEFAULT && size == sizeof(RadioResponse2018)) {
        const RadioResponse2018 *packet = (const RadioResponse2018 *)data;

        robot::RadioResponse r;
        r.set_time(time);
        r.set_generation(4);
        r.set_id(packet->id);

        int packet_loss = (packet->extension_id == EXTENSION_BASIC_STATUS) ? packet->packet_loss : -1;
        float df = calculateDroppedFramesRatio(4, packet->id, packet->counter, packet_loss);
        switch (packet->extension_id) {
        case EXTENSION_BASIC_STATUS:
            r.set_battery(packet->battery / 255.0f);
            r.set_packet_loss_rx(packet->packet_loss / 256.0f);
            r.set_packet_loss_tx(df);
            break;
        case EXTENSION_EXTENDED_ERROR:
        {
            robot::ExtendedError *e = r.mutable_extended_error();
            e->set_motor_1_error(packet->motor_1_error);
            e->set_motor_2_error(packet->motor_2_error);
            e->set_motor_3_error(packet->motor_3_error);
            e->set_motor_4_error(packet->motor_4_error);
            e->set_dribbler_error(packet->dribler_error);
            e->set_kicker_error(packet->kicker_error);
            e->set_kicker_break_beam_error(packet->kicker_break_beam_error);
            e->set_motor_encoder_error(packet->motor_encoder_error);
            e->set_main_sensor_error(packet->main_sensor_error);
            e->set_temperature(packet->temperature);
            break;
        }
        default:
            break;
        }

        if (packet->power_enabled) {
            robot::SpeedStatus *speedStatus = r.mutable_estimated_speed();
            speedStatus->set_v_f(packet->v_f / 1000.f);
            speedStatus->set_v_s(packet->v_s / 1000.f);
            speedStatus->set_omega(packet->omega / 1000.f);
            r.set_error_present(packet->error_present);

            r.set_ball_detected(packet->ball_detected);
            r.set_cap_charged(packet->cap_charged);
        }
        if (m_frameTimes.contains(packet->counter)) {
            r.set_radio_rtt((time - m_frameTimes[packet->counter]) * 1E-9f);
        }
        responses.append(r);
    }
}

void Transceiver::addRobot2014Command(int id, const robot::Command &command, bool charge, quint8 packetCounter, QByteArray &usb_packet)
{
    // copy command
    RadioCommand2014 data;
    data.charge = charge;
    data.standby = command.standby();
    data.counter = packetCounter;
    data.dribbler = qBound<qint32>(-RADIOCOMMAND2014_DRIBBLER_MAX, command.dribbler() * RADIOCOMMAND2014_DRIBBLER_MAX, RADIOCOMMAND2014_DRIBBLER_MAX);
    data.chip = command.kick_style() == robot::Command::Chip;
    if (data.chip) {
        data.shot_power = qMin<quint32>(command.kick_power() / RADIOCOMMAND2014_CHIP_MAX * RADIOCOMMAND2014_KICK_MAX, RADIOCOMMAND2014_KICK_MAX);
    } else {
        data.shot_power = qMin<quint32>(command.kick_power() / RADIOCOMMAND2014_LINEAR_MAX * RADIOCOMMAND2014_KICK_MAX, RADIOCOMMAND2014_KICK_MAX);
    }
    data.v_s = qBound<qint32>(-RADIOCOMMAND2014_V_MAX, command.output0().v_s() * 1000.0f, RADIOCOMMAND2014_V_MAX);
    data.v_f = qBound<qint32>(-RADIOCOMMAND2014_V_MAX, command.output0().v_f() * 1000.0f, RADIOCOMMAND2014_V_MAX);
    data.omega = qBound<qint32>(-RADIOCOMMAND2014_OMEGA_MAX, command.output0().omega() * 1000.0f, RADIOCOMMAND2014_OMEGA_MAX);

    const int OMEGA_QUANTIZATION = 5;
    const int V_QUANTIZATION = 2;
    const float delta1_v_s = command.output1().v_s() - command.output0().v_s();
    const float delta1_v_f = command.output1().v_f() - command.output0().v_f();
    const float delta1_omega = command.output1().omega() - command.output0().omega();
    data.delta1_v_s = qBound<qint32>(-RADIOCOMMAND2014_DELTA_V_MAX, delta1_v_s * 1000.0f / V_QUANTIZATION, RADIOCOMMAND2014_DELTA_V_MAX);
    data.delta1_v_f = qBound<qint32>(-RADIOCOMMAND2014_DELTA_V_MAX, delta1_v_f * 1000.0f / V_QUANTIZATION, RADIOCOMMAND2014_DELTA_V_MAX);
    data.delta1_omega = qBound<qint32>(-RADIOCOMMAND2014_DELTA_OMEGA_MAX, delta1_omega * (1000.0f / OMEGA_QUANTIZATION), RADIOCOMMAND2014_DELTA_OMEGA_MAX);

    const float delta2_v_s = command.output2().v_s() - command.output1().v_s();
    const float delta2_v_f = command.output2().v_f() - command.output1().v_f();
    // compensate for possible quantization errors
    const float sent_delta1_omega = data.delta1_omega * (OMEGA_QUANTIZATION / 1000.0f);
    const float omegaWithDelta1 = command.output0().omega() + sent_delta1_omega;
    const float delta2_omega = command.output2().omega() - omegaWithDelta1;
    data.delta2_v_s = qBound<qint32>(-RADIOCOMMAND2014_DELTA_V_MAX, delta2_v_s * 1000.0f / V_QUANTIZATION, RADIOCOMMAND2014_DELTA_V_MAX);
    data.delta2_v_f = qBound<qint32>(-RADIOCOMMAND2014_DELTA_V_MAX, delta2_v_f * 1000.0f / V_QUANTIZATION, RADIOCOMMAND2014_DELTA_V_MAX);
    data.delta2_omega = qBound<qint32>(-RADIOCOMMAND2014_DELTA_OMEGA_MAX, delta2_omega * (1000.0f / OMEGA_QUANTIZATION), RADIOCOMMAND2014_DELTA_OMEGA_MAX);

    data.id = id;
    data.force_kick = command.force_kick();
    data.ir_param = qBound<quint8>(0, m_ir_param[qMakePair(3, id)], 63);
    data.eject_sdcard = command.eject_sdcard();
    data.unused = 0;

    if (command.has_cur_v_s()) {
        data.cur_v_s = qBound<qint32>(-RADIOCOMMAND2014_V_MAX, command.cur_v_s() * 1000.0f, RADIOCOMMAND2014_V_MAX);
        data.cur_v_f = qBound<qint32>(-RADIOCOMMAND2014_V_MAX, command.cur_v_f() * 1000.0f, RADIOCOMMAND2014_V_MAX);
        data.cur_omega = qBound<qint32>(-RADIOCOMMAND2014_OMEGA_MAX, command.cur_omega() * 1000.0f, RADIOCOMMAND2014_OMEGA_MAX);
    } else {
        data.cur_v_s = RADIOCOMMAND2014_INVALID_SPEED;
        data.cur_v_f = RADIOCOMMAND2014_INVALID_SPEED;
        data.cur_omega = RADIOCOMMAND2014_INVALID_SPEED;
    }

    // set address
    TransceiverCommandPacket senderCommand;
    senderCommand.command = COMMAND_SEND_NRF24;
    senderCommand.size = sizeof(data) + sizeof(TransceiverSendNRF24Packet);

    TransceiverSendNRF24Packet targetAddress;
    memcpy(targetAddress.address, robot2014_address, sizeof(robot2014_address));
    targetAddress.address[0] |= id;
    targetAddress.expectedResponseSize = sizeof(RadioResponseHeader) + sizeof(RadioResponse2014);

    usb_packet.append((const char*) &senderCommand, sizeof(senderCommand));
    usb_packet.append((const char*) &targetAddress, sizeof(targetAddress));
    usb_packet.append((const char*) &data, sizeof(data));
}

void Transceiver::addRobot2014Sync(qint64 processingDelay, quint8 packetCounter, QByteArray &usb_packet)
{
    // processing usually takes a few hundred microseconds, bound to 2ms to avoid outliers
    processingDelay = qMin((qint64)2*1000*1000, processingDelay);

    // times are in nanoseconds
    qint64 US_TO_NS = 1000;
    // just an estimate
    qint64 usbTransferTime = 250 * US_TO_NS;
    qint64 nrfRadioStartupTime = 130 * US_TO_NS;
    int nrfPacketHeaderBits = 65;
    int syncPacketPayloadBytes = sizeof(RadioSync2014);
    int BITS_PER_BYTE = 8;
    // transfer rate: 1MBit/s
    int BIT_TRANSFER_TIME = 1 * US_TO_NS;
    qint64 syncPacketTransmissionTime = (nrfPacketHeaderBits + BITS_PER_BYTE * syncPacketPayloadBytes) * BIT_TRANSFER_TIME;
    qint64 syncPacketDelay = usbTransferTime + nrfRadioStartupTime + syncPacketTransmissionTime;

    RadioSync2014 data;
    data.counter = packetCounter;
    data.time_offset = (processingDelay + syncPacketDelay) / 1000;

    TransceiverCommandPacket senderCommand;
    senderCommand.command = COMMAND_SEND_NRF24;
    senderCommand.size = sizeof(data) + sizeof(TransceiverSendNRF24Packet);

    TransceiverSendNRF24Packet targetAddress;
    memcpy(targetAddress.address, robot_datagram, sizeof(robot_datagram));
    // broadcast (0x1f) to generation 2014 (0x20)
    targetAddress.address[0] = 0x1f | 0x20;
    targetAddress.expectedResponseSize = 0;

    usb_packet.append((const char*) &senderCommand, sizeof(senderCommand));
    usb_packet.append((const char*) &targetAddress, sizeof(targetAddress));
    usb_packet.append((const char*) &data, sizeof(data));
}

void Transceiver::addRobot2018Command(int id, const robot::Command &command, bool charge, quint8 packetCounter, QByteArray &usb_packet)
{
    // copy command
    RadioCommand2018 data;
    data.charge = charge;
    data.standby = command.standby();
    data.counter = packetCounter;
    data.dribbler = qBound<qint32>(-RADIOCOMMAND2018_DRIBBLER_MAX, command.dribbler() * RADIOCOMMAND2018_DRIBBLER_MAX, RADIOCOMMAND2018_DRIBBLER_MAX);
    data.chip = command.kick_style() == robot::Command::Chip;
    if (data.chip) {
        data.shot_power = qMin<quint32>(command.kick_power() / RADIOCOMMAND2018_CHIP_MAX * RADIOCOMMAND2018_KICK_MAX, RADIOCOMMAND2018_KICK_MAX);
    } else {
        data.shot_power = qMin<quint32>(command.kick_power() / RADIOCOMMAND2018_LINEAR_MAX * RADIOCOMMAND2018_KICK_MAX, RADIOCOMMAND2018_KICK_MAX);
    }
    data.v_s = qBound<qint32>(-RADIOCOMMAND2018_V_MAX, command.output0().v_s() * 1000.0f, RADIOCOMMAND2018_V_MAX);
    data.v_f = qBound<qint32>(-RADIOCOMMAND2018_V_MAX, command.output0().v_f() * 1000.0f, RADIOCOMMAND2018_V_MAX);
    data.omega = qBound<qint32>(-RADIOCOMMAND2018_OMEGA_MAX, command.output0().omega() * 1000.0f, RADIOCOMMAND2018_OMEGA_MAX);

    const int OMEGA_QUANTIZATION = 5;
    const int V_QUANTIZATION = 2;
    const float delta1_v_s = command.output1().v_s() - command.output0().v_s();
    const float delta1_v_f = command.output1().v_f() - command.output0().v_f();
    const float delta1_omega = command.output1().omega() - command.output0().omega();
    data.delta1_v_s = qBound<qint32>(-RADIOCOMMAND2018_DELTA_V_MAX, delta1_v_s * 1000.0f / V_QUANTIZATION, RADIOCOMMAND2018_DELTA_V_MAX);
    data.delta1_v_f = qBound<qint32>(-RADIOCOMMAND2018_DELTA_V_MAX, delta1_v_f * 1000.0f / V_QUANTIZATION, RADIOCOMMAND2018_DELTA_V_MAX);
    data.delta1_omega = qBound<qint32>(-RADIOCOMMAND2018_DELTA_OMEGA_MAX, delta1_omega * (1000.0f / OMEGA_QUANTIZATION), RADIOCOMMAND2018_DELTA_OMEGA_MAX);

    const float delta2_v_s = command.output2().v_s() - command.output1().v_s();
    const float delta2_v_f = command.output2().v_f() - command.output1().v_f();
    // compensate for possible quantization errors
    const float sent_delta1_omega = data.delta1_omega * (OMEGA_QUANTIZATION / 1000.0f);
    const float omegaWithDelta1 = command.output0().omega() + sent_delta1_omega;
    const float delta2_omega = command.output2().omega() - omegaWithDelta1;
    data.delta2_v_s = qBound<qint32>(-RADIOCOMMAND2018_DELTA_V_MAX, delta2_v_s * 1000.0f / V_QUANTIZATION, RADIOCOMMAND2018_DELTA_V_MAX);
    data.delta2_v_f = qBound<qint32>(-RADIOCOMMAND2018_DELTA_V_MAX, delta2_v_f * 1000.0f / V_QUANTIZATION, RADIOCOMMAND2018_DELTA_V_MAX);
    data.delta2_omega = qBound<qint32>(-RADIOCOMMAND2018_DELTA_OMEGA_MAX, delta2_omega * (1000.0f / OMEGA_QUANTIZATION), RADIOCOMMAND2018_DELTA_OMEGA_MAX);

    data.id = id;
    data.force_kick = command.force_kick();
    data.ir_param = qBound<quint8>(0, m_ir_param[qMakePair(4, id)], 63);
    data.eject_sdcard = command.eject_sdcard();
    data.unused = 0;

    if (command.has_cur_v_s()) {
        data.cur_v_s = qBound<qint32>(-RADIOCOMMAND2018_V_MAX, command.cur_v_s() * 1000.0f, RADIOCOMMAND2018_V_MAX);
        data.cur_v_f = qBound<qint32>(-RADIOCOMMAND2018_V_MAX, command.cur_v_f() * 1000.0f, RADIOCOMMAND2018_V_MAX);
        data.cur_omega = qBound<qint32>(-RADIOCOMMAND2018_OMEGA_MAX, command.cur_omega() * 1000.0f, RADIOCOMMAND2018_OMEGA_MAX);
    } else {
        data.cur_v_s = RADIOCOMMAND2018_INVALID_SPEED;
        data.cur_v_f = RADIOCOMMAND2018_INVALID_SPEED;
        data.cur_omega = RADIOCOMMAND2018_INVALID_SPEED;
    }

    // set address
    TransceiverCommandPacket senderCommand;
    senderCommand.command = COMMAND_SEND_NRF24;
    senderCommand.size = sizeof(data) + sizeof(TransceiverSendNRF24Packet);

    TransceiverSendNRF24Packet targetAddress;
    memcpy(targetAddress.address, robot2018_address, sizeof(robot2018_address));
    targetAddress.address[0] |= id;
    targetAddress.expectedResponseSize = sizeof(RadioResponseHeader) + sizeof(RadioResponse2018);

    usb_packet.append((const char*) &senderCommand, sizeof(senderCommand));
    usb_packet.append((const char*) &targetAddress, sizeof(targetAddress));
    usb_packet.append((const char*) &data, sizeof(data));
}

void Transceiver::addRobot2018Sync(qint64 processingDelay, quint8 packetCounter, QByteArray &usb_packet)
{
    // processing usually takes a few hundred microseconds, bound to 2ms to avoid outliers
    processingDelay = qMin((qint64)2*1000*1000, processingDelay);

    // times are in nanoseconds
    qint64 US_TO_NS = 1000;
    // just an estimate
    qint64 usbTransferTime = 250 * US_TO_NS;
    qint64 nrfRadioStartupTime = 130 * US_TO_NS;
    int nrfPacketHeaderBits = 65;
    int syncPacketPayloadBytes = sizeof(RadioSync2018);
    int BITS_PER_BYTE = 8;
    // transfer rate: 1MBit/s
    int BIT_TRANSFER_TIME = 1 * US_TO_NS;
    qint64 syncPacketTransmissionTime = (nrfPacketHeaderBits + BITS_PER_BYTE * syncPacketPayloadBytes) * BIT_TRANSFER_TIME;
    qint64 syncPacketDelay = usbTransferTime + nrfRadioStartupTime + syncPacketTransmissionTime;

    RadioSync2018 data;
    data.counter = packetCounter;
    data.time_offset = (processingDelay + syncPacketDelay) / 1000;

    TransceiverCommandPacket senderCommand;
    senderCommand.command = COMMAND_SEND_NRF24;
    senderCommand.size = sizeof(data) + sizeof(TransceiverSendNRF24Packet);

    TransceiverSendNRF24Packet targetAddress;
    memcpy(targetAddress.address, robot_datagram, sizeof(robot_datagram));
    // broadcast (0x1f) to generation 2018
    targetAddress.address[0] = 0x1f | robot2018_address[0];
    // add a delay of 240 us to workaround reception issues
    // our custom built nrf receivers fail to receive their command packet
    // if it immediatelly follows the sync packet
    // adding the delay fixes the problem reliably
    targetAddress.expectedResponseSize = 1;

    usb_packet.append((const char*) &senderCommand, sizeof(senderCommand));
    usb_packet.append((const char*) &targetAddress, sizeof(targetAddress));
    usb_packet.append((const char*) &data, sizeof(data));
}

void Transceiver::addPingPacket(qint64 time, QByteArray &usb_packet)
{
    // Append ping packet with current timestamp
    TransceiverCommandPacket senderCommand;
    senderCommand.command = COMMAND_PING;
    senderCommand.size = sizeof(TransceiverPingData);

    TransceiverPingData ping;
    ping.time = time;

    usb_packet.append((const char*) &senderCommand, sizeof(senderCommand));
    usb_packet.append((const char*) &ping, sizeof(ping));
}

void Transceiver::addStatusPacket(QByteArray &usb_packet)
{
    // request count of dropped usb packets
    TransceiverCommandPacket senderCommand;
    senderCommand.command = COMMAND_STATUS;
    senderCommand.size = 0;

    usb_packet.append((const char*) &senderCommand, sizeof(senderCommand));
}

void Transceiver::sendCommand(const QList<robot::RadioCommand> &commands, bool charge, qint64 processingStart)
{
    if (!ensureOpen()) {
        return;
    }

    typedef QList<robot::RadioCommand> RobotList;

    QMap<uint, RobotList> generations;
    foreach (const robot::RadioCommand &robot, commands) {
        // group by generation
        generations[robot.generation()].append(robot);
    }

    m_packetCounter++;
    // remember when the packetCounter was used
    const qint64 time = Timer::systemTime();
    m_frameTimes[m_packetCounter] = time;

    // used for packet assembly
    QByteArray usb_packet;

    bool hasRobot2014Commands = generations.contains(3);
    if (hasRobot2014Commands) {
        const qint64 completionTime = m_timer->currentTime();
        addRobot2014Sync(processingStart - completionTime, m_packetCounter, usb_packet);
    }
    bool hasRobot2018Commands = generations.contains(4);
    if (hasRobot2018Commands) {
        const qint64 completionTime = m_timer->currentTime();
        addRobot2018Sync(processingStart - completionTime, m_packetCounter, usb_packet);
    }

    QMapIterator<uint, RobotList> it(generations);
    while (it.hasNext()) {
        it.next();

        foreach (const robot::RadioCommand &radio_command, it.value()) {
            if (it.key() == 3) { // 2014 generation
                addRobot2014Command(radio_command.id(), radio_command.command(), charge, m_packetCounter, usb_packet);
            } else if (it.key() == 4) { // 2018 / 2020 generation
                addRobot2018Command(radio_command.id(), radio_command.command(), charge, m_packetCounter, usb_packet);
            }
        }
    }

    addPingPacket(time, usb_packet);
    if (m_packetCounter == 255) {
        addStatusPacket(usb_packet);
    }

    // Workaround for usb problems if packet size is a multiple of transfer size
    if (usb_packet.size() % 64 == 0) {
        addPingPacket(time, usb_packet);
    }

    write(usb_packet.data(), usb_packet.size());

    // only restart timeout if not yet active
    if (!m_timeoutTimer->isActive()) {
        m_timeoutTimer->start(1000);
    }
}

void Transceiver::sendTransceiverConfiguration()
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
    write(usb_packet.data(), usb_packet.size());
}

void Transceiver::sendInitPacket()
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
    write(usb_packet.data(), usb_packet.size());
}
