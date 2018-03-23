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
#include "protobuf/ssl_radio_protocol.pb.h"
#include <QUdpSocket>

NetworkTransceiver::NetworkTransceiver(QObject *parent) : QObject(parent),
    m_charge(false),
    m_simulatorEnabled(false)
{
    m_udpSocket = new QUdpSocket(this);
}

NetworkTransceiver::~NetworkTransceiver() { }

void NetworkTransceiver::handleRadioCommands(const QList<robot::RadioCommand> &commands, qint64 processingDelay)
{
    (void)processingDelay;
    Status status(new amun::Status);
    const qint64 transceiver_start = Timer::systemTime();

    // charging the condensator can be enabled / disable separately
    SSL_RadioProtocolWrapper wrapper;
    foreach (const robot::RadioCommand &robot, commands) {
        SSL_RadioProtocolCommand *cmd = wrapper.add_command();
        cmd->set_robot_id(robot.id());
        cmd->set_velocity_x(robot.command().output1().v_f());
        cmd->set_velocity_y(-robot.command().output1().v_s());
        cmd->set_velocity_r(robot.command().output1().omega());
        if (robot.command().kick_power() > 0 && m_charge) {
            if (robot.command().kick_style() == robot::Command::Chip) {
                cmd->set_chip_kick(qBound(0.f, robot.command().kick_power(), 20.f));
            } else {
                cmd->set_flat_kick(qBound(0.f, robot.command().kick_power(), 20.f));
            }
        }
        if (robot.command().dribbler() != 0) {
            cmd->set_dribbler_spin(qBound(-1.f, robot.command().dribbler(), 1.f));
        }
    }

    bool sendingSuccessful = false;
    if (m_configuration.IsInitialized()) {
        QHostAddress address(QString::fromStdString(m_configuration.host()));

        QByteArray data;
        data.resize(wrapper.ByteSize());
        if (wrapper.SerializeToArray(data.data(), data.size())) {
            sendingSuccessful = m_udpSocket->writeDatagram(data, address, m_configuration.port()) == data.size();
        }
    }

    status->mutable_timing()->set_transceiver((Timer::systemTime() - transceiver_start) / 1E9);
    status->mutable_transceiver()->set_active(sendingSuccessful);
    status->mutable_transceiver()->set_error("Network");
    emit sendStatus(status);
}

void NetworkTransceiver::handleCommand(const Command &command)
{
    if (command->has_simulator()) {
        if (command->simulator().has_enable()) {
            m_simulatorEnabled = command->simulator().enable();
        }
    }

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

