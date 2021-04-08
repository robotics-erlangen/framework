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
#include "protobuf/grsim_commands.pb.h"
#include "protobuf/grsim_replacement.pb.h"
#include "protobuf/geometry.h"
#include "protobuf/ssl_simulation_robot_feedback.pb.h"
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

void NetworkTransceiver::handleCommand(const Command &command)
{
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
        if (!res.ParseFromArray(datagram.data().data(), datagram.data().size())) {
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
