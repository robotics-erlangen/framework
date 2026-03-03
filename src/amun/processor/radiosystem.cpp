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
#include "firmware-interface/radiocommand2025conversion.h"
#include "radiosystem.h"
#include "transceiverlayer.h"
#include <QByteArray>
#include <QList>
#include <QTimer>
#include <QtGlobal>
#include <algorithm>
#include <array>
#include <cmath>
#include <numbers>

#ifdef USB_FOUND
#include "transceiver2015.h"
#include "transceiverHBC.h"
#include "usbdevice.h"
#include "usbthread.h"
#endif

using namespace Radio;

static_assert(sizeof(RadioCommand2014) == 23, "Expected radio command 2014 packet of size 23");
static_assert(sizeof(RadioResponse2014) == 10, "Expected radio response 2014 packet of size 10");
static_assert(sizeof(RadioCommandPasta) == 26, "Expected radio command packet pasta of size 26");
static_assert(sizeof(RadioResponsePasta) == 10, "Expected radio response packet pasta of size 10");
static_assert(sizeof(RadioCommand2025) <= HBC_MAX_PACKET_SIZE, "Expected radio command packet of size HBC_MAX_PACKET_SIZE");
static_assert(sizeof(RadioResponse2025) <= HBC_MAX_PACKET_SIZE, "Expected radio response packet of size HBC_MAX_PACKET_SIZE");


static Radio::Generation uintToGeneration(uint pbGeneration) {
    switch (pbGeneration) {
        case (uint)Radio::Generation::Gen2014:
            return Radio::Generation::Gen2014;
        case (uint)Radio::Generation::Gen2025:
            return Radio::Generation::Gen2025;
    }

    qFatal("Invalid generation %u", pbGeneration);
}

// normalizes to [-pi, pi)
static float normalizeAngle(float angle) {
    while (angle < -std::numbers::pi) {
        angle += std::numbers::pi * 2;
    }
    while (angle >= std::numbers::pi) {
        angle -= std::numbers::pi * 2;
    }
    return angle;
}

/* Used for RadioSystem::m_transceivers to select the generation */
constexpr size_t IndexGen2014 = 0;
constexpr size_t IndexGen2025 = 1;

RadioSystem::RadioSystem(const Timer *timer) :
    m_charge(false),
    m_packetCounter(0),
    m_simulatorEnabled(false),
    m_onlyRestartAfterTimestamp{},
    m_timer(timer),
    m_droppedCommands(0),
#ifdef USB_FOUND
    m_context(new USBThread())
#else
    m_context(nullptr)
#endif // USB_FOUND
{
    m_timeoutTimer = new QTimer(this);
    m_timeoutTimer->setSingleShot(true);
    connect(m_timeoutTimer, &QTimer::timeout, this, &RadioSystem::timeout);

    m_processTimer = new QTimer(this);
    m_processTimer->setSingleShot(true);
    connect(m_processTimer, &QTimer::timeout, this, &RadioSystem::process);
}

RadioSystem::~RadioSystem()
{
    // make sure to close all transceiver connections to avoid race conditions with the desctructor of m_context
    closeTransceiver();
#ifdef USB_FOUND
    delete m_context;
#endif // USB_FOUND
}

void RadioSystem::handleRadioCommands(const QList<robot::RadioCommand> &commands, qint64 processingStart)
{
    m_commands = commands;
    m_processingStart = processingStart;
    if (m_processTimer->isActive()) {
        // the timer is stil active, that is the last commands were not yet processed!
        m_droppedCommands++;
    }
    m_processTimer->start(0);
}

void RadioSystem::process()
{
    Status status(new amun::Status);
    const qint64 transceiver_start = Timer::systemTime();

    // charging the condensator can be enabled / disable separately
    sendCommand(m_commands, m_processingStart);

    status->mutable_timing()->set_transceiver((Timer::systemTime() - transceiver_start) * 1E-9f);
    emit sendStatus(status);
}

void RadioSystem::handleCommand(const Command &command)
{
    if (command->has_simulator()) {
        if (command->simulator().has_enable()) {
            m_simulatorEnabled = command->simulator().enable();
            if (m_simulatorEnabled) {
                closeTransceiver();
            }
        }
    }

    if (command->has_transceiver()) {
        const amun::CommandTransceiver &t = command->transceiver();
        if (t.has_enable() && !m_simulatorEnabled) {
            if (t.enable()) {
                openTransceiver();
            } else {
                closeTransceiver();
            }
        }

        if (t.has_charge()) {
            m_charge = t.charge();
        }
    }

    if (command->has_set_team_blue()) {
        handleTeam(command->set_team_blue());
    }

    if (command->has_set_team_yellow()) {
        handleTeam(command->set_team_yellow());
    }

    for (const auto &generation : m_transceivers) {
        for (auto& transceiver : generation) {
            const auto maybeError = transceiver->handleCommand(command);
            if (maybeError.has_value()) {
                transceiverErrorOccurred(*maybeError);
            }
        }
    }
}

void RadioSystem::handleTeam(const robot::Team &team)
{
    for (int i = 0; i < team.robot_size(); ++i) {
        const robot::Specs &spec = team.robot(i);
        m_ir_param[qMakePair(uintToGeneration(spec.generation()), spec.id())] = spec.ir_param();
    }
}

void RadioSystem::openTransceiver()
{
    m_transceivers = {};

#ifdef USB_FOUND
    auto [transceivers2015, errors2015] = Transceiver2015::tryOpen(m_context, m_timer, this);
    auto [transceiversHBC, errorsHBC] = TransceiverHBC::tryOpen(m_context, m_timer, this);

    m_transceivers[0] = std::move(transceivers2015);
    m_transceivers[1] = std::move(transceiversHBC);

    const bool foundWorkingTransceiver = anyTransceiverPresent();
    for (const auto& errors : {errors2015, errorsHBC}) {
        for (const auto& error : errors) {
            if (foundWorkingTransceiver) {
                Status status { new amun::Status };
                status->mutable_transceiver()->set_active(false);
                if (!error.m_deviceName.isNull()) {
                    status->mutable_transceiver()->set_name(error.m_deviceName.toStdString());
                }
                status->mutable_transceiver()->set_error(error.m_errorMessage.toStdString());
                emit sendStatus(status);
            } else {
                transceiverErrorOccurred(error);
            }
        }
    }

    if (foundWorkingTransceiver) {
        m_timeoutTimer->start(500);
    } else {
        transceiverErrorOccurred({"T2015|HBC", "No devices found!", {}});
    }
#else
    transceiverErrorOccurred({"USB", "No USB Support", {}});
#endif // USB_FOUND
}

void RadioSystem::closeTransceiver()
{
    m_transceivers = {};

    m_timeoutTimer->stop();
}

bool RadioSystem::ensureOpen()
{
    if (m_onlyRestartAfterTimestamp.has_value() && Timer::systemTime() > m_onlyRestartAfterTimestamp.value()) {
        m_onlyRestartAfterTimestamp.reset();
        openTransceiver();
    }
    return anyTransceiverPresent();
}

bool RadioSystem::anyTransceiverPresent() const
{
    return std::ranges::any_of(m_transceivers, ([](const auto& transceiversForGen) { return !transceiversForGen.empty(); }));
}

void RadioSystem::transceiverErrorOccurred(const TransceiverError &transceiverError)
{
    closeTransceiver();

    Status status { new amun::Status };
    status->mutable_transceiver()->set_active(false);
    if (!transceiverError.m_deviceName.isNull()) {
        status->mutable_transceiver()->set_name(transceiverError.m_deviceName.toStdString());
    }
    status->mutable_transceiver()->set_error(transceiverError.m_errorMessage.toStdString());
    emit sendStatus(status);

    if (transceiverError.m_restartDelayInNs.has_value()) {
        m_onlyRestartAfterTimestamp = Timer::systemTime() + transceiverError.m_restartDelayInNs.value();
    } else {
        m_onlyRestartAfterTimestamp = {};
    }
}

void RadioSystem::transceiverResponded(const QString &transceiverName)
{
    Q_ASSERT(!transceiverName.isNull());
    m_timeoutTimer->stop();

    if (m_droppedCommands > 0) {
        Status status { new amun::Status };
        status->mutable_transceiver()->set_active(true);
        status->mutable_transceiver()->set_name(transceiverName.toStdString());
        status->mutable_transceiver()->set_dropped_commands(m_droppedCommands);

        m_droppedCommands = 0;
    }
}

void RadioSystem::timeout()
{
    transceiverErrorOccurred({QString{}, "Some transceiver is not responding", (qint64)100*1000*1000});
}

void RadioSystem::onRawRadioResponse(qint64 receiveTime, const QList<QByteArray> &rawResponses)
{
    QList<robot::RadioResponse> responses;

    for (const QByteArray &packet : rawResponses) {
        handleResponsePacket(responses, packet.data(), packet.size(), receiveTime);
    }

    emit sendRadioResponses(responses);
}

float RadioSystem::calculateDroppedFramesRatio(Radio::Generation generation, uint id, uint8_t counter, int skipedFrames)
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
        // as the robot can only reply if it got a frame, skip the frames it didn't get (only 2014 / Pasta)
        c.droppedFramesRatio = (c.lastDroppedFrames - skipedFrames)
                / (256.f - c.startValue - skipedFrames);
        c.startValue = 0;
        c.lastDroppedFrames = -1;
    }

    c.lastFrameCounter = counter;

    return c.droppedFramesRatio;
}

robot::RadioResponse RadioSystem::handleRobot2014Response(uint8_t id, int64_t time, const RadioResponse2014 *packet) {
    robot::RadioResponse r;
    r.set_time(time);
    r.set_generation((uint)Radio::Generation::Gen2014);
    r.set_id(packet->id);

    int packet_loss = (packet->extension_id == EXTENSION_BASIC_STATUS) ? packet->packet_loss : -1;
    float df = calculateDroppedFramesRatio(Radio::Generation::Gen2014, packet->id, packet->counter, packet_loss);
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
        robot::LocalSpeed *estimatedSpeed = r.mutable_estimated_speed();
        estimatedSpeed->set_v_f(packet->v_f / 1000.f);
        estimatedSpeed->set_v_s(packet->v_s / 1000.f);
        estimatedSpeed->set_omega(packet->omega / 1000.f);
        r.set_error_present(packet->error_present);

        r.set_ball_detected(packet->ball_detected);
        r.set_cap_charged(packet->cap_charged);
    }
    if (m_frameTimes.contains(packet->counter)) {
        r.set_radio_rtt((time - m_frameTimes[packet->counter]) * 1E-9f);
    }
    return r;
}

robot::RadioResponse RadioSystem::handleRobotPastaResponse(uint8_t id, int64_t time, const RadioResponsePasta *packet) {
    robot::RadioResponse r;
    r.set_time(time);
    r.set_generation((uint)Radio::Generation::Gen2025);
    r.set_id(packet->id);

    int packet_loss = (packet->extension_id == EXTENSION_BASIC_STATUS) ? packet->packet_loss : -1;
    float df = calculateDroppedFramesRatio(Radio::Generation::Gen2025, packet->id, packet->counter, packet_loss);
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
        robot::LocalSpeed *estimatedSpeed = r.mutable_estimated_speed();
        estimatedSpeed->set_v_f(packet->v_f / 1000.f);
        estimatedSpeed->set_v_s(packet->v_s / 1000.f);
        estimatedSpeed->set_omega(packet->omega / 1000.f);
        r.set_error_present(packet->error_present);

        r.set_ball_detected(packet->ball_detected);
        r.set_cap_charged(packet->cap_charged);
    }
    if (m_frameTimes.contains(packet->counter)) {
        r.set_radio_rtt((time - m_frameTimes[packet->counter]) * 1E-9f);
    }
    return r;
}

static void write_robot_state(robot::RobotState *msg, const RadioCommand2025State radio) {
    msg->set_x(radio.coords.x);
    msg->set_y(radio.coords.y);
    msg->set_angle(radio.angle);
}

static void write_motor_status(robot::MotorStatus *status, const MotorStatusFlags2025 flags) {
    status->set_error(flags.error);
    status->set_overheated(flags.overheated);
    status->set_encoder_error(flags.encoder_error);
}

static void write_kicker_status(robot::KickerStatus *status, const KickerStatusFlags2025 flags) {
    status->set_error(flags.error);
    status->set_break_beam_error(flags.break_beam_error);
}

static void write_imu_status(robot::IMUStatus *status, const IMUStatusFlags2025 flags) {
    status->set_error(flags.error);
}

static void write_sd_status(robot::SDStatus *status, const SDStatusFlags2025 flags) {
    status->set_error(flags.error);
    status->set_mounted(flags.mounted);
    status->set_full(flags.full);
}

static bool any_motor_error(const robot::MotorStatus &status) {
    return (status.has_error() && status.error())
        || (status.has_overheated() && status.overheated())
        || (status.has_encoder_error() && status.encoder_error());
}

static bool any_kicker_error(const robot::KickerStatus &status) {
    return (status.has_error() && status.error())
        || (status.has_break_beam_error() && status.break_beam_error());
}

static bool any_imu_error(const robot::IMUStatus &status) {
    return (status.has_error() && status.error());
}

static bool any_sd_error(const robot::SDStatus &status) {
    return (status.has_error() && status.error())
        //|| (status.has_mounted() && status.mounted())  // mounted is NOT an error!
        || (status.has_full() && status.full());
}

static void board_status_to_extended_error(robot::ExtendedError *ee, const robot::BoardStatus &status) {
    bool any_motor_overheated = false;
    bool any_motor_encoder_error = false;

    if (status.has_dribbler_status()) {
        const auto s = status.dribbler_status();
        ee->set_dribbler_error(any_motor_error(s));
        any_motor_overheated |= (s.has_overheated() && s.overheated());
        any_motor_encoder_error |= (s.has_encoder_error() && s.encoder_error());
    }
    if (status.has_motor_fl_status()) {
        const auto s = status.motor_fl_status();
        ee->set_motor_1_error(any_motor_error(s));
        any_motor_overheated |= (s.has_overheated() && s.overheated());
        any_motor_encoder_error |= (s.has_encoder_error() && s.encoder_error());
    }
    if (status.has_motor_bl_status()) {
        const auto s = status.motor_bl_status();
        ee->set_motor_2_error(any_motor_error(s));
        any_motor_overheated |= (s.has_overheated() && s.overheated());
        any_motor_encoder_error |= (s.has_encoder_error() && s.encoder_error());
    }
    if (status.has_motor_br_status()) {
        const auto s = status.motor_br_status();
        ee->set_motor_3_error(any_motor_error(s));
        any_motor_overheated |= (s.has_overheated() && s.overheated());
        any_motor_encoder_error |= (s.has_encoder_error() && s.encoder_error());
    }
    if (status.has_motor_fr_status()) {
        const auto s = status.motor_fr_status();
        ee->set_motor_4_error(any_motor_error(s));
        any_motor_overheated |= (s.has_overheated() && s.overheated());
        any_motor_encoder_error |= (s.has_encoder_error() && s.encoder_error());
    }
    if (any_motor_overheated) {
        ee->set_motor_overheated_error(true);
    }
    if (any_motor_encoder_error) {
        ee->set_motor_encoder_error(true);
    }

    if (status.has_kicker_status()) {
        const auto s = status.kicker_status();
        ee->set_kicker_error(any_kicker_error(s));
        if (s.has_break_beam_error()) {
            ee->set_kicker_break_beam_error(s.break_beam_error());
        }
    }

    if (status.has_imu_status()) {
        const auto s = status.imu_status();
        ee->set_main_sensor_error(any_imu_error(s));
    }
}

static bool any_error_in_extended_error(const robot::ExtendedError &ee) {
    return (ee.has_motor_1_error() && ee.motor_1_error())
        || (ee.has_motor_2_error() && ee.motor_2_error())
        || (ee.has_motor_3_error() && ee.motor_3_error())
        || (ee.has_motor_4_error() && ee.motor_4_error())
        || (ee.has_dribbler_error() && ee.dribbler_error())
        || (ee.has_kicker_error() && ee.kicker_error())
        || (ee.has_motor_overheated_error() && ee.motor_overheated_error())
        || (ee.has_kicker_break_beam_error() && ee.kicker_break_beam_error())
        || (ee.has_motor_encoder_error() && ee.motor_encoder_error())
        || (ee.has_main_sensor_error() && ee.main_sensor_error());
}

robot::RadioResponse RadioSystem::handleRobot2025Response(uint8_t id, int64_t time, const RadioResponse2025 *packet) {
    if (packet->header.datagram) {
        // TODO handle datagrams?
        assert(false);
        return {};
    } else {
        const RegularResponsePayload2025 *regular = &packet->payload.regular;

        RadioCommand2025Response packet_data;
        read_response(&packet_data, regular);

        robot::RadioResponse r;
        r.set_time(time);
        r.set_generation((uint)Radio::Generation::Gen2025);
        r.set_id(id);

        r.set_battery(packet_data.battery);
        r.set_packet_loss_rx(packet_data.packet_loss);
        r.set_packet_loss_tx(packet_data.packet_loss);  // TODO compute rx and tx loss separately
        r.set_ball_detected(packet_data.ball_detected);
        r.set_power_enabled(packet_data.power_enabled);

        // write board status
        robot::BoardStatus *boardStatus = r.mutable_board_status();
        write_motor_status(boardStatus->mutable_motor_fl_status(), packet_data.motor_status[MOTOR_FL]);
        write_motor_status(boardStatus->mutable_motor_fr_status(), packet_data.motor_status[MOTOR_FR]);
        write_motor_status(boardStatus->mutable_motor_bl_status(), packet_data.motor_status[MOTOR_BL]);
        write_motor_status(boardStatus->mutable_motor_br_status(), packet_data.motor_status[MOTOR_BR]);
        write_motor_status(boardStatus->mutable_dribbler_status(), packet_data.motor_status[DRIBBLER]);
        write_kicker_status(boardStatus->mutable_kicker_status(), packet_data.kicker_status);
        write_imu_status(boardStatus->mutable_imu_status(), packet_data.imu_status);
        write_sd_status(boardStatus->mutable_sd_status(), packet_data.sd_status);

        // convert board status to legacy extended error
        robot::ExtendedError *e = r.mutable_extended_error();
        board_status_to_extended_error(e, *boardStatus);
        r.set_error_present(any_error_in_extended_error(*e));

        // write measured position and velocity
        write_robot_state(r.mutable_measured_pos(), packet_data.measured_pos);
        write_robot_state(r.mutable_measured_vel(), packet_data.measured_vel);

        // convert measured *global* position and velocity to legacy *local* velocity
        const float phi = packet_data.measured_pos.angle;
        const float v_x = packet_data.measured_vel.coords.x;
        const float v_y = packet_data.measured_vel.coords.y;
        robot::LocalSpeed *l = r.mutable_estimated_speed();
        l->set_v_f(v_x * cosf(phi) + v_y * sinf(phi));
        l->set_v_s(-v_x * sinf(phi) + v_y * cosf(phi));
        l->set_omega(packet_data.measured_vel.angle);

        // write load torques
        r.set_motor_fl_load_torque(packet_data.motor_load_torque[MOTOR_FL]);
        r.set_motor_fr_load_torque(packet_data.motor_load_torque[MOTOR_FR]);
        r.set_motor_bl_load_torque(packet_data.motor_load_torque[MOTOR_BL]);
        r.set_motor_br_load_torque(packet_data.motor_load_torque[MOTOR_BR]);
        r.set_dribbler_load_torque(packet_data.motor_load_torque[DRIBBLER]);

        return r;
    }
}

void RadioSystem::handleResponsePacket(QList<robot::RadioResponse> &responses, const char *data, uint size, qint64 time)
{
    const RadioResponseHeader *header = (const RadioResponseHeader *)data;
    size -= sizeof(RadioResponseHeader);
    data += sizeof(RadioResponseHeader);

    if (header->command == RESPONSE_2014_DEFAULT && size == sizeof(RadioResponse2014)) {
        const RadioResponse2014 *packet = (const RadioResponse2014 *)data;
        responses.append(handleRobot2014Response(packet->id, time, packet));
    } else if (header->command == RESPONSE_PASTA_DEFAULT && size == sizeof(RadioResponsePasta)) {
        const RadioResponsePasta *packet = (const RadioResponsePasta *)data;
        responses.append(handleRobotPastaResponse(packet->id, time, packet));
    } else if (header->command == RESPONSE_2025_DEFAULT && size == sizeof(RadioResponse2025) + 1) {
        const uint8_t id = data[0];
        size -= sizeof(uint8_t);
        data += sizeof(uint8_t);

        const RadioResponse2025 *packet = (const RadioResponse2025*)data;
        responses.append(handleRobot2025Response(id, time, packet));
    }
}

void RadioSystem::addRobot2014Command(int id, const robot::Command &command, quint8 packetCounter)
{
    // copy command
    RadioCommand2014 data;
    data.charge = m_charge;
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
    data.ir_param = qBound<quint8>(0, m_ir_param[qMakePair(Generation::Gen2014, id)], 63);
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

    for (const auto& transceiver : m_transceivers[IndexGen2014]) {
        transceiver->addSendCommand(
            Address { Unicast, Generation::Gen2014, id },
            sizeof(RadioResponseHeader) + sizeof(RadioResponse2014),
            reinterpret_cast<const char *>(&data), sizeof(data));
    }
}

void RadioSystem::addRobot2014Sync(qint64 processingDelay, quint8 packetCounter)
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

    for (const auto& transceiver : m_transceivers[IndexGen2014]) {
        transceiver->addSendCommand(
            Address { Broadcast, Generation::Gen2014 },
            // Use a expected response size of 1 to add a delay of 240 us to
            // workaround reception issues our custom built nrf receivers fail to
            // receive their command packet if it immediatelly follows the sync
            // packet adding the delay fixes the problem reliably
            1,
            reinterpret_cast<const char *>(&data), sizeof(data));
    }
}

void RadioSystem::addRobotPastaCommand(int id, const robot::Command &command, quint8 packetCounter, qint64 processingDelay)
{
    // copy command
    RadioCommandPasta data;
    data.charge = m_charge;
    data.standby = command.standby();
    data.counter = packetCounter;
    data.dribbler = qBound<qint32>(-RADIOCOMMANDPASTA_DRIBBLER_MAX, command.dribbler() * RADIOCOMMANDPASTA_DRIBBLER_MAX, RADIOCOMMANDPASTA_DRIBBLER_MAX);
    data.chip = command.kick_style() == robot::Command::Chip;
    if (data.chip) {
        data.shot_power = qMin<quint32>(command.kick_power() / RADIOCOMMANDPASTA_CHIP_MAX * RADIOCOMMANDPASTA_KICK_MAX, RADIOCOMMANDPASTA_KICK_MAX);
    } else {
        data.shot_power = qMin<quint32>(command.kick_power() / RADIOCOMMANDPASTA_LINEAR_MAX * RADIOCOMMANDPASTA_KICK_MAX, RADIOCOMMANDPASTA_KICK_MAX);
    }
    data.v_x = qBound<qint32>(-RADIOCOMMANDPASTA_V_MAX, command.output0().v_x() * 1000.0f, RADIOCOMMANDPASTA_V_MAX);
    data.v_y = qBound<qint32>(-RADIOCOMMANDPASTA_V_MAX, command.output0().v_y() * 1000.0f, RADIOCOMMANDPASTA_V_MAX);
    data.omega = qBound<qint32>(-RADIOCOMMANDPASTA_OMEGA_MAX, command.output0().omega() * 1000.0f, RADIOCOMMANDPASTA_OMEGA_MAX);

    const int OMEGA_QUANTIZATION = 5;
    const int V_QUANTIZATION = 2;
    const float delta1_v_x = command.output1().v_x() - command.output0().v_x();
    const float delta1_v_y = command.output1().v_y() - command.output0().v_y();
    const float delta1_omega = command.output1().omega() - command.output0().omega();
    data.delta1_v_x = qBound<qint32>(-RADIOCOMMANDPASTA_DELTA_V_MAX, delta1_v_x * 1000.0f / V_QUANTIZATION, RADIOCOMMANDPASTA_DELTA_V_MAX);
    data.delta1_v_y = qBound<qint32>(-RADIOCOMMANDPASTA_DELTA_V_MAX, delta1_v_y * 1000.0f / V_QUANTIZATION, RADIOCOMMANDPASTA_DELTA_V_MAX);
    data.delta1_omega = qBound<qint32>(-RADIOCOMMANDPASTA_DELTA_OMEGA_MAX, delta1_omega * (1000.0f / OMEGA_QUANTIZATION), RADIOCOMMANDPASTA_DELTA_OMEGA_MAX);

    const float delta2_v_x = command.output2().v_x() - command.output1().v_x();
    const float delta2_v_y = command.output2().v_y() - command.output1().v_y();
    // compensate for possible quantization errors
    const float sent_delta1_omega = data.delta1_omega * (OMEGA_QUANTIZATION / 1000.0f);
    const float omegaWithDelta1 = command.output0().omega() + sent_delta1_omega;
    const float delta2_omega = command.output2().omega() - omegaWithDelta1;
    data.delta2_v_x = qBound<qint32>(-RADIOCOMMANDPASTA_DELTA_V_MAX, delta2_v_x * 1000.0f / V_QUANTIZATION, RADIOCOMMANDPASTA_DELTA_V_MAX);
    data.delta2_v_y = qBound<qint32>(-RADIOCOMMANDPASTA_DELTA_V_MAX, delta2_v_y * 1000.0f / V_QUANTIZATION, RADIOCOMMANDPASTA_DELTA_V_MAX);
    data.delta2_omega = qBound<qint32>(-RADIOCOMMANDPASTA_DELTA_OMEGA_MAX, delta2_omega * (1000.0f / OMEGA_QUANTIZATION), RADIOCOMMANDPASTA_DELTA_OMEGA_MAX);

    data.id = id;
    data.force_kick = command.force_kick();
    data.ir_param = qBound<quint8>(0, m_ir_param[qMakePair(Radio::Generation::Gen2025, id)], 63);
    data.eject_sdcard = command.eject_sdcard();
    data.unused = 0;

    if (command.has_cur_v_s()) {
        data.cur_v_s = qBound<qint32>(-RADIOCOMMANDPASTA_V_MAX, command.cur_v_s() * 1000.0f, RADIOCOMMANDPASTA_V_MAX);
        data.cur_v_f = qBound<qint32>(-RADIOCOMMANDPASTA_V_MAX, command.cur_v_f() * 1000.0f, RADIOCOMMANDPASTA_V_MAX);

        float phi = normalizeAngle(command.cur_phi());
        data.cur_phi = qBound<qint32>(-RADIOCOMMANDPASTA_PHI_MAX, phi * RADIOCOMMANDPASTA_PHI_MAX / std::numbers::pi, RADIOCOMMANDPASTA_PHI_MAX);
    } else {
        data.cur_v_s = RADIOCOMMANDPASTA_INVALID_SPEED;
        data.cur_v_f = RADIOCOMMANDPASTA_INVALID_SPEED;
        data.cur_phi = RADIOCOMMANDPASTA_INVALID_SPEED;
    }

    // processing usually takes a few hundred microseconds, bound to 2ms to avoid outliers
    processingDelay = qMin((qint64)2*1000*1000, processingDelay);

    // times are in nanoseconds
    constexpr qint64 US_TO_NS = 1000;
    // just an estimate
    constexpr qint64 usbTransferTime = 250 * US_TO_NS;
    constexpr qint64 nrfRadioStartupTime = 130 * US_TO_NS;
    constexpr int nrfPacketHeaderBits = 65;
    // TODO check if this even makes sense anymore since we don't directly send the sync packet and instead flush after preparing all robot commands
    constexpr int syncPacketPayloadBytes = sizeof(RadioSync2014);
    constexpr int BITS_PER_BYTE = 8;
    // transfer rate: 1MBit/s
    constexpr int BIT_TRANSFER_TIME = 1 * US_TO_NS;
    qint64 syncPacketTransmissionTime = (nrfPacketHeaderBits + BITS_PER_BYTE * syncPacketPayloadBytes) * BIT_TRANSFER_TIME;
    qint64 syncPacketDelay = usbTransferTime + nrfRadioStartupTime + syncPacketTransmissionTime;
    data.counter = packetCounter;
    data.time_offset = (processingDelay + syncPacketDelay) / 1000;

    for (const auto& transceiver : m_transceivers[IndexGen2025]) {
        transceiver->addSendCommand(
            Address { Unicast, Generation::Gen2025, id },
            sizeof(RadioResponseHeader) + sizeof(RadioResponsePasta),
            reinterpret_cast<const char *>(&data), sizeof(data));
    }
}

bool static writeTrajectoryPath(robot::ControllerInput const &controller, RadioCommand2025 &radioCommand) {
    if (controller.trajectory_size() == 0) {
        return false;
    }
    robot::AlphaTimeTrajectory traj0 = controller.trajectory(0);
    if (!traj0.has_start_pos()
            || !traj0.has_start_vel()
            || !traj0.has_end_vel()
            || !traj0.has_start_angle()
            || !traj0.has_end_angle()
            || !traj0.has_alpha()
            || !traj0.has_time()
            || !traj0.has_acceleration()
            || !traj0.has_v_max()
            || !traj0.has_end_speed_type()
            || !traj0.has_slow_down_time()) {
        return false;
    }

    RadioCommand2025TrajectoryPath trajectoryPath = {
        .start_state = {
            .coords = {
                .x = traj0.start_pos().x(),
                .y = traj0.start_pos().y(),
            },
            .angle = normalizeAngle(traj0.start_angle()),
        },
        .start_vel = {
            .x = traj0.start_vel().x(),
            .y = traj0.start_vel().y(),
        },
        .end_angle = normalizeAngle(traj0.end_angle()),
        .end_vel = {
            .x = traj0.end_vel().x(),
            .y = traj0.end_vel().y(),
        },

        .alpha = normalizeAngle(traj0.alpha()),
        .t = traj0.time(),
        .acceleration = traj0.acceleration(),
        .v_max = traj0.v_max(),

        .slow_down_time = traj0.slow_down_time(),
        .is_fast_endspeed = traj0.end_speed_type() == robot::AlphaTimeTrajectory::EndSpeedType::AlphaTimeTrajectory_EndSpeedType_Fast,
    };
    write_trajectory_path(&trajectoryPath, &radioCommand.payload.regular);
    return true;
}

bool static writeSpline(robot::ControllerInput const &controller, RadioCommand2025 &radioCommand) {
    if (controller.global_spline_size() == 0 && controller.local_spline_size() == 0) {
        return false;
    }

    bool isLocal = controller.local_spline_size() > 0;
    robot::Spline spline0 = isLocal ? controller.local_spline(0) : controller.global_spline(0);
    // The spline is a polynomial in time with vector (x, y, phi) coefficients
    // descripting the position of the robot at a certain time:
    //     pos(t) = a0 + a1 * t + a2 * t^2 + a3 * t^3
    // To get the the speed, acceleration and jerk, we need to differentiate once, twice or thrice and set t=0:
    //     vel(t) = a1 + 2 * a2 * t + 3 * a3 * t^2
    //     acc(t) = 2 * a2 + 6 * a3 * t
    //     jerk(t) = 6 * a3
    RadioCommand2025Spline spline = {
        .pos = {
            .coords = {
                .x = spline0.x().a0(),
                .y = spline0.y().a0(),
            },
            .angle = normalizeAngle(spline0.phi().a0()),
        },
        .vel = {
            .coords = {
                .x = spline0.x().a1(),
                .y = spline0.y().a1(),
            },
            .angle = spline0.phi().a1(),
        },
        .acc {
            .coords = {
                .x = 2 * spline0.x().a2(),
                .y = 2 * spline0.y().a2(),
            },
            .angle = 2 * spline0.phi().a2(),
        },
        .jerk {
            .coords = {
                .x = 6 * spline0.x().a3(),
                .y = 6 * spline0.y().a3(),
            },
            .angle = 6 * spline0.phi().a3(),
        },
    };
    write_spline(&spline, &radioCommand.payload.regular, isLocal);
    return true;
}


void RadioSystem::addRobot2025Command(int id, const robot::Command &command, quint8 packetCounter, qint64 processingDelay)
{
    // copy command
    RadioCommand2025 data;
    data.header.counter = packetCounter;
    data.header.acknum = 0; // TODO
    data.header.datagram = false;

    robot::RobotState lastDetection = command.last_detection();
    RadioCommand2025Common common = {
        // processing usually takes a few hundred microseconds, bound to 2ms to avoid outliers
        .time_offset = fminf(2000.0f, processingDelay / 1000.0f), // TODO

        .standby = command.standby(),
        .eject_sd_card = command.eject_sdcard(),

        .dribbler = command.dribbler(),
        .shot_power = command.kick_power(),
        .chip = command.kick_style() == robot::Command_KickStyle_Chip,
        .charge = m_charge,
        .force_kick = command.force_kick(),

        .has_detection = lastDetection.has_x() && lastDetection.has_y() && lastDetection.has_angle(),
        .detection = {
            .coords = {
                .x = lastDetection.has_x() ? lastDetection.x() : 0,
                .y = lastDetection.has_y() ? lastDetection.y() : 0,
            },
            .angle = normalizeAngle(lastDetection.has_angle() ? lastDetection.angle() : 0),
        },
    };
    write_common(&common, &data.payload.regular);
    set_halt(&data.payload.regular);

    const robot::ControllerInput &controller = command.controller();
    writeTrajectoryPath(controller, data);
    writeSpline(controller, data);
    // TODO

    for (const auto& transceiver : m_transceivers[IndexGen2025]) {
        transceiver->addSendCommand(
            Address { Unicast, Generation::Gen2025, id },
            sizeof(RadioResponse2025) + 1,
            reinterpret_cast<const char *>(&data), sizeof(data));
    }
}

void RadioSystem::sendCommand(const QList<robot::RadioCommand> &commands, qint64 processingStart)
{
    if (!ensureOpen()) {
        return;
    }

    typedef QList<robot::RadioCommand> RobotList;

    QMap<Radio::Generation, RobotList> generations;
    foreach (const robot::RadioCommand &robot, commands) {
        // group by generation
        generations[uintToGeneration(robot.generation())].append(robot);
    }

    m_packetCounter++;
    // remember when the packetCounter was used
    const qint64 time = Timer::systemTime();
    m_frameTimes[m_packetCounter] = time;

    for (const auto &generation : m_transceivers) {
        for (auto& transceiver : generation) {
            transceiver->newCycle();
        }
    }

    const qint64 completionTime = m_timer->currentTime();
    const qint64 syncTime = processingStart - completionTime;
    bool hasRobot2014Commands = generations.contains(Radio::Generation::Gen2014);
    if (hasRobot2014Commands) {
        addRobot2014Sync(syncTime, m_packetCounter);
    }

    QMapIterator<Radio::Generation, RobotList> it(generations);
    while (it.hasNext()) {
        it.next();

        foreach (const robot::RadioCommand &radio_command, it.value()) {
            if (it.key() == Radio::Generation::Gen2014) {
                addRobot2014Command(radio_command.id(), radio_command.command(), m_packetCounter);
            } else if (it.key() == Radio::Generation::Gen2025) {
                addRobot2025Command(radio_command.id(), radio_command.command(), m_packetCounter, syncTime);
            }
        }
    }

    for (const auto &generation : m_transceivers) {
        for (auto& transceiver : generation) {
            transceiver->addPingPacket(time);
            if (m_packetCounter == 255) {
                transceiver->addStatusPacket();
            }

            const auto maybeError = transceiver->flush(time);
            if (maybeError.has_value()) {
                transceiverErrorOccurred(*maybeError);
                return;
            }
        }
    }

    // only restart timeout if not yet active
    if (!m_timeoutTimer->isActive()) {
        m_timeoutTimer->start(1000);
    }
}
