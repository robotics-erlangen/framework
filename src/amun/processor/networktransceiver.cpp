/***************************************************************************
 *   Copyright 2015 Michael Eischer                                        *
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
#include "networktransceiver.h"
#include "core/timer.h"
#include "core/run_out_of_scope.h"
#include "core/coordinates.h"
#include "protobuf/grsim_commands.pb.h"
#include "protobuf/grsim_replacement.pb.h"
#include "protobuf/geometry.h"
#include "protobuf/ssl_simulation_robot_feedback.pb.h"
#include "protobuf/ssl_simulation_custom_erforce_robot_spec.pb.h"
#include <QUdpSocket>
#include <QNetworkDatagram>
#include <cmath>

NetworkTransceiver::NetworkTransceiver(const Timer* timer, QObject *parent) : QObject(parent), m_timer(timer)
{
    m_udpSocket = new QUdpSocket(this);
    connect(m_udpSocket, &QUdpSocket::readyRead, this, &NetworkTransceiver::handleResponse);
}

NetworkTransceiver::~NetworkTransceiver() { }

bool NetworkTransceiver::sendSSLSimPacket(const sslsim::RobotControl& control, bool blueTeam)
{
    bool sendMessage = blueTeam ? getControlBlue() : getControlYellow();
    if (!sendMessage) return true;
    bool sendingSuccessful = false;
    if (isConfigInitialized()) {
        QHostAddress address(getHost());

        QByteArray data;
        data.resize(control.ByteSize());
        if (control.SerializeToArray(data.data(), data.size())) {
            int port = getPortBlue();
            if (!blueTeam) {
                port = getPortYellow();
            }
            sendingSuccessful = m_udpSocket->writeDatagram(data, address, port) == data.size();
        }
    }
    return sendingSuccessful;

}

bool NetworkTransceiver::sendSSLSimCommand(const sslsim::SimulatorCommand& cmd)
{
    bool sendingSuccessful = false;
    if (!getControlSimulator()) {
        return true;
    }
    if (isConfigInitialized()) {
        QHostAddress address(getHost());

        QByteArray data;
        data.resize(cmd.ByteSize());
        if (cmd.SerializeToArray(data.data(), data.size())) {
            int port = getPortControl();
            sendingSuccessful = m_udpSocket->writeDatagram(data, address, port) == data.size();
        }
    }
    return sendingSuccessful;
}

void NetworkTransceiver::handleSSLSimCommand(const SSLSimRobotControl& rc, bool blue, qint64)
{
    Status status(new amun::Status);
    const qint64 transceiver_start = Timer::systemTime();
    bool sendingSuccessful = sendSSLSimPacket(*rc, blue);

    status->mutable_timing()->set_transceiver((Timer::systemTime() - transceiver_start) * 1E-9f);
    status->mutable_transceiver()->set_active(sendingSuccessful);
    status->mutable_transceiver()->set_error("Network");
    emit sendStatus(status);
}

#define SCALE_DOWN(OBJ, X) do{if ((OBJ) . has_##X()) (OBJ) . set_##X((OBJ) . X() * 1e-3);} while(0)

static void convertUnits(sslsim::TeleportBall* ball) {
    SCALE_DOWN(*ball, x);
    SCALE_DOWN(*ball, y);
    SCALE_DOWN(*ball, z);
    SCALE_DOWN(*ball, vx);
    SCALE_DOWN(*ball, vy);
    SCALE_DOWN(*ball, vz);

}

static void convertUnits(sslsim::TeleportRobot& robot) {
    SCALE_DOWN(robot, x);
    SCALE_DOWN(robot, y);
    SCALE_DOWN(robot, v_x);
    SCALE_DOWN(robot, v_y);
}

#define MAX_WITH_OPTION(OBJ, X, Y, BOOL_OUT, FLOAT_OUT) do{BOOL_OUT = false; float tmp##X##Y; \
if ((OBJ) . has_##X()) { tmp##X##Y = (OBJ). X(); BOOL_OUT = true;} \
if ((OBJ) . has_##Y()) { if(BOOL_OUT) tmp##X##Y = std::max(tmp##X##Y, (OBJ) . Y()); else { tmp##X##Y = (OBJ) . Y(); BOOL_OUT = true;}} \
if (BOOL_OUT) FLOAT_OUT = tmp##X##Y; } while(0)


template<class T>
static void convertSpecs(const robot::Specs& in, T outGen, bool blueTeam, bool* success)
{
    bool useSpecialFields = false;
    sslsim::RobotSpecErForce rsef;
    sslsim::RobotSpecs* out = outGen();
    out->mutable_id()->set_id(in.id());
    out->mutable_id()->set_team(blueTeam? gameController::BLUE : gameController::YELLOW);
    if (in.has_radius()) {
        out->set_radius(in.radius());
    }
    if (in.has_height()) {
        out->set_height(in.height());
    }
    if (in.has_mass()) {
        out->set_mass(in.mass());
    }
    if (in.has_angle()) {
        // cos(angle / 2) = d / r
        const float centerToDribbler = std::cos(in.angle() / 2) * in.radius();
        out->set_center_to_dribbler(centerToDribbler);
    }
    if (in.has_v_max()) {
        out->mutable_limits()->set_vel_absolute_max(in.v_max());
    }
    if (in.has_omega_max()) {
        out->mutable_limits()->set_vel_angular_max(in.omega_max());
    }
    if (in.has_shot_linear_max()) {
        out->set_max_linear_kick_speed(in.shot_linear_max());
    }
    if (in.has_shot_chip_max()) {
        out->set_max_chip_kick_speed(coordinates::chipVelFromChipDistance(in.shot_chip_max()));
    }
    if (in.has_dribbler_width()) {
        rsef.set_dribbler_width(in.dribbler_width());
        useSpecialFields = true;
    }
    if (in.has_strategy()) {
        auto* robotLimits = out->mutable_limits();
        bool found;
        float result;
        MAX_WITH_OPTION(in.strategy(), a_speedup_f_max, a_speedup_s_max, found, result);
        if (found) {
            robotLimits->set_acc_speedup_absolute_max(result);
        }
        MAX_WITH_OPTION(in.strategy(), a_brake_f_max, a_brake_s_max, found, result);
        if (found) {
            robotLimits->set_acc_brake_absolute_max(result);
        }
        if (in.strategy().has_a_speedup_phi_max()) {
            robotLimits->set_acc_speedup_angular_max(in.strategy().a_speedup_phi_max());
        }
        if (in.strategy().has_a_brake_phi_max()) {
            robotLimits->set_acc_brake_angular_max(in.strategy().a_brake_phi_max());
        }
    }
    if (in.has_shoot_radius()) {
        rsef.set_shoot_radius(in.shoot_radius());
        useSpecialFields = true;
    }
    if (in.has_dribbler_height()) {
        rsef.set_dribbler_height(in.dribbler_height());
        useSpecialFields = true;
    }
    // ignore simulation_limits
    if (useSpecialFields) {
        out->add_custom()->PackFrom(rsef);
    }
    *success = true;
}

void NetworkTransceiver::handleCommand(const Command &command)
{
    if (command->has_set_team_blue()) {
        m_teamCommand->mutable_set_team_blue()->CopyFrom(command->set_team_blue());
        m_teamCommandModified = true;
    }
    if (command->has_set_team_yellow()) {
        m_teamCommand->mutable_set_team_yellow()->CopyFrom(command->set_team_yellow());
        m_teamCommandModified = true;
    }
    if (command->has_transceiver()) {
        const amun::CommandTransceiver &t = command->transceiver();

        if (t.has_network_configuration()) {
            m_configuration.m_hostAddress = t.network_configuration();
        }
        if (t.has_simulator_configuration()) {
            m_configuration.m_simulatorConfig = t.simulator_configuration();
        }

        if (t.has_enable()) {
            if (!t.enable()) {
                Status status(new amun::Status);
                status->mutable_transceiver()->set_active(false);
                emit sendStatus(status);
            }
        }
    }
    if (command->has_simulator() && command->simulator().has_ssl_control() && m_sendCommands) {
       const auto& sslControl = command->simulator().ssl_control();
       sslsim::SimulatorCommand cmd;
       sslsim::SimulatorControl *cntr = cmd.mutable_control();
       cntr->CopyFrom(sslControl);
       if (cntr->has_teleport_ball()) {
           convertUnits(cntr->mutable_teleport_ball());
       }
       for(sslsim::TeleportRobot& robot : *cntr->mutable_teleport_robot()) {
           convertUnits(robot);
       }
       sendSSLSimCommand(cmd);
    }
    if (command->has_simulator() && command->simulator().has_simulator_setup() && m_sendCommands) {
        sslsim::SimulatorCommand cmd;
        SSL_GeometryData *data = cmd.mutable_config()->mutable_geometry();
        for(const auto& camSetup : command->simulator().simulator_setup().camera_setup()) {
            data->add_calib()->CopyFrom(camSetup);
        }
        convertToSSlGeometry(command->simulator().simulator_setup().geometry(), data->mutable_field());
        sendSSLSimCommand(cmd);
    }
    if (command->has_simulator() && command->simulator().has_realism_config() && m_sendCommands) {
        sslsim::SimulatorCommand cmd;
        cmd.mutable_config()->mutable_realism_config()->add_custom()->PackFrom(command->simulator().realism_config());
        sendSSLSimCommand(cmd);
    }
    static bool sendMessage = true;
    if (sendMessage) {
        const int highest_field = 21;
        const int expected_fields = highest_field - 1;
        auto* desc = robot::Specs::descriptor();
        int real_fields = desc->field_count();
        for(int i=0; i<desc->reserved_range_count(); ++i){
            const auto* rr = desc->reserved_range(i);
            real_fields += rr->end - rr->start;
        }
        // FIXME: Always keep this number updated to the transported fields in convertSpecs (m_teamCommandModified ...)
        if(real_fields != expected_fields) {
            Status s{new amun::Status};
            auto* debug = s->add_debug();
            debug->set_source(amun::DebugSource::NetworkTransceiver);
            auto* log = debug->add_log();
            log->set_timestamp(m_timer->currentTime());
            std::string msg = "BUG: The number of fields for the specs has a different number compared to expected!";
            msg += " expected: " + std::to_string(expected_fields);
            msg += ", but found: " + std::to_string(real_fields);
            msg += " (in ";
            msg += __FILE__;
            msg += ": ";
            msg += std::to_string(__LINE__);
            log->set_text(msg + ")");
            emit sendStatus(s);
        }
    }
    if (m_teamCommandModified && m_sendCommands) {
        m_teamCommandModified = false;
        sslsim::SimulatorCommand cmd;

        const auto reportIssue = [this](const robot::Specs& spec) {
            Status s{new amun::Status};
            auto* debug = s->add_debug();
            debug->set_source(amun::DebugSource::NetworkTransceiver);
            auto* log = debug->add_log();
            log->set_timestamp(m_timer->currentTime());
            std::string msg = "The following spec couldn't be converted a valid spec for the remote simulator, skipping:";
            msg += spec.DebugString();
            log->set_text(msg);
            emit sendStatus(s);
        };

        const auto convertTeam = [&reportIssue](const robot::Team& team, sslsim::SimulatorConfig* config, bool isBlue) {
            for(const robot::Specs& spec : team.robot()) {
                bool result;
                convertSpecs(spec, [config](){return config->add_robot_specs();}, isBlue, &result);
                if (!result) {
                    reportIssue(spec);
                }
            }
        };
        sslsim::SimulatorConfig* cfg = cmd.mutable_config();
        convertTeam(m_teamCommand->set_team_blue(), cfg, true);
        convertTeam(m_teamCommand->set_team_yellow(), cfg, false);
        sendSSLSimCommand(cmd);
    }
}

void NetworkTransceiver::handleResponse()
{

    QList<robot::RadioResponse> out;
    while(m_udpSocket->hasPendingDatagrams()) {
        auto datagram = m_udpSocket->receiveDatagram();
        sslsim::RobotControlResponse res;
        QList<SSLSimError> sslErrors;
        bool hadErrors = false;
        Status errors = Status::createArena();
        RUN_WHEN_OUT_OF_SCOPE({
                if (hadErrors) {
                    emit sendStatus(errors);
                }
                if (sslErrors.size() != 0) {
                    emit sendSSLSimError(sslErrors);
                }
            });
        const QByteArray data = datagram.data();
        if (!res.ParseFromArray(data.data(), data.size())) {
            errors->set_time(m_timer->currentTime());
            hadErrors = true;
            std::string result = "Error connected simulator (response unreadable)";
            auto dV = errors->add_debug();
            dV->set_time(m_timer->currentTime());
            auto log = dV->add_log();
            log->set_timestamp(m_timer->currentTime());
            log->set_text(result);
            return;
        }

        for(const auto& feedback : res.feedback()) {
            if (feedback.has_dribbler_ball_contact() && feedback.dribbler_ball_contact()) {
                robot::RadioResponse rr;
                rr.set_id(feedback.id());
                rr.set_generation(3); // FIXME: Just a guess
                rr.set_ball_detected(true);
                out.push_back(std::move(rr));
            }
        }


        for (const auto& error : res.errors()) {
            SSLSimError cError{new sslsim::SimulatorError};
            cError->CopyFrom(error);
            sslErrors.push_back(std::move(cError));
        }

    }

    emit sendRadioResponses(out);
}

bool NetworkTransceiver::isConfigInitialized() const
{
    return m_configuration.m_hostAddress.IsInitialized() && m_configuration.m_simulatorConfig.IsInitialized();
}

uint32_t NetworkTransceiver::getPortControl() const
{
    return m_configuration.m_hostAddress.port();
}

uint32_t NetworkTransceiver::getPortBlue() const
{
    return m_configuration.m_simulatorConfig.port_blue();
}

uint32_t NetworkTransceiver::getPortYellow() const
{
    return m_configuration.m_simulatorConfig.port_yellow();
}

bool NetworkTransceiver::getControlSimulator() const
{
    return m_configuration.m_simulatorConfig.control_simulator();
}

bool NetworkTransceiver::getControlBlue() const
{
    return m_configuration.m_simulatorConfig.control_blue();
}

bool NetworkTransceiver::getControlYellow() const
{
    return m_configuration.m_simulatorConfig.control_yellow();
}

QString NetworkTransceiver::getHost() const
{
    return QString::fromStdString(m_configuration.m_hostAddress.host());
}
