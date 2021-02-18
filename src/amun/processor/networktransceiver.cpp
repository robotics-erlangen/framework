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
#include "protobuf/grsim_commands.pb.h"
#include "protobuf/grsim_replacement.pb.h"
#include "protobuf/ssl_simulation_robot_control.pb.h"
#include <QUdpSocket>
#include <cmath>

static constexpr bool USE_GRSIM = true;

NetworkTransceiver::NetworkTransceiver(QObject *parent) : QObject(parent),
    m_charge(false)
{
    m_udpSocket = new QUdpSocket(this);
}

NetworkTransceiver::~NetworkTransceiver() { }

bool NetworkTransceiver::sendSSLSimPacket(const QList<robot::RadioCommand> &commands, bool blueTeam) {
    sslsim::RobotControl control;
    for (const robot::RadioCommand &robot : commands) {
        if (robot.is_blue() != blueTeam) {
            continue;
        }
        auto* robotCommand = control.add_robot_commands();
        robotCommand->set_id(robot.id());
        if (robot.command().kick_power() > 0 && m_charge) {
            robotCommand->set_kick_speed(robot.command().kick_power());
            if (robot.command().kick_style() == robot::Command::Chip) {
                robotCommand->set_kick_angle(45);
            }
        }
        if (robot.command().has_dribbler()) {
            robotCommand->set_dribbler_speed(robot.command().dribbler() * 150 * 60 * .5f / M_PI ); // convert from 1 - 0 to rpm, where 1 is 150 rad/s
        }
        if (robot.command().has_output1()) {
            auto* moveCommand  = robotCommand->mutable_move_command()->mutable_local_velocity();
            moveCommand->set_forward(robot.command().output1().v_f());
            moveCommand->set_left(1);
            moveCommand->set_angular(10.f / 360 * M_PI);
        }
    }

    bool sendingSuccessful = false;
    if (m_configuration.IsInitialized()) {
        QHostAddress address(QString::fromStdString(m_configuration.host()));

        QByteArray data;
        data.resize(control.ByteSize());
        if (control.SerializeToArray(data.data(), data.size())) {
            sendingSuccessful = m_udpSocket->writeDatagram(data, address, m_configuration.port()) == data.size();
        }
    }
    return sendingSuccessful;

}

bool NetworkTransceiver::sendGrSimPacket(const QList<robot::RadioCommand> &commands, bool blueTeam)
{
    grSim_Packet packet;
    packet.mutable_commands()->set_timestamp(0);
    packet.mutable_commands()->set_isteamyellow(!blueTeam);
    for (const robot::RadioCommand &robot : commands) {
        if (robot.is_blue() != blueTeam) {
            continue;
        }
        grSim_Robot_Command *command = packet.mutable_commands()->add_robot_commands();
        command->set_id(robot.id());
        command->set_kickspeedx(0);
        command->set_kickspeedz(0);
        if (robot.command().kick_power() > 0 && m_charge) {
            if (robot.command().kick_style() == robot::Command::Linear) {
                command->set_kickspeedx(robot.command().kick_power());
            } else {
                command->set_kickspeedx(robot.command().kick_power() / 2);
                command->set_kickspeedz(robot.command().kick_power() / 2);
            }
        }
        command->set_veltangent(robot.command().output1().v_f());
        command->set_velnormal(-robot.command().output1().v_s());
        command->set_velangular(robot.command().output1().omega());
        command->set_spinner(robot.command().dribbler() > 0);
        command->set_wheelsspeed(false);
    }

    bool sendingSuccessful = false;
    if (m_configuration.IsInitialized()) {
        QHostAddress address(QString::fromStdString(m_configuration.host()));

        QByteArray data;
        data.resize(packet.ByteSize());
        if (packet.SerializeToArray(data.data(), data.size())) {
            sendingSuccessful = m_udpSocket->writeDatagram(data, address, m_configuration.port()) == data.size();
        }
    }

    return sendingSuccessful;
}

void NetworkTransceiver::handleRadioCommands(const QList<robot::RadioCommand> &commands, qint64 processingStart)
{
    (void)processingStart;
    Status status(new amun::Status);
    const qint64 transceiver_start = Timer::systemTime();

    const auto& sendPacket = (USE_GRSIM)? &NetworkTransceiver::sendGrSimPacket : &NetworkTransceiver::sendSSLSimPacket;

    bool sendingSuccessful = (this->*sendPacket)(commands, false);
    sendingSuccessful &= (this->*sendPacket)(commands, true);

    status->mutable_timing()->set_transceiver((Timer::systemTime() - transceiver_start) * 1E-9f);
    status->mutable_transceiver()->set_active(sendingSuccessful);
    status->mutable_transceiver()->set_error("Network");
    emit sendStatus(status);
}

void NetworkTransceiver::handleCommand(const Command &command)
{
    if (command->has_transceiver()) {
        const amun::CommandTransceiver &t = command->transceiver();

        if (t.has_charge()) {
            m_charge = t.charge();
        }

        if (t.has_network_configuration()) {
            m_configuration = t.network_configuration();
        }

        if (t.has_enable()) {
            if (!t.enable()) {
                Status status(new amun::Status);
                status->mutable_transceiver()->set_active(false);
                emit sendStatus(status);
            }
        }
    }
}

