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

void NetworkTransceiver::handleCommand(const Command &command)
{
    if (command->has_transceiver()) {
        const amun::CommandTransceiver &t = command->transceiver();

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

void NetworkTransceiver::handleResponse()
{

    QList<robot::RadioResponse> out;
    while(m_udpSocket->hasPendingDatagrams()) {
        auto datagram = m_udpSocket->receiveDatagram();
        sslsim::RobotControlResponse res;
        bool hadErrors = false;
        Status errors = Status::createArena();
        amun::DebugValues* dV = nullptr;
        RUN_WHEN_OUT_OF_SCOPE({
                if (hadErrors) {
                    emit sendStatus(errors);
                }
            });
        if (!res.ParseFromArray(datagram.data().data(), datagram.data().size())) {
            errors->set_time(m_timer->currentTime());
            hadErrors = true;
            std::string result = "Error connected simulator (response unreadable)";
            dV = errors->add_debug();
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
            errors->set_time(m_timer->currentTime());
            hadErrors = true;
            std::string result = "Error within connected simulator: ";
            if (error.has_message()) {
                result += error.message();
            }
            if (error.has_code()) {
                result += "[" + error.code() + "]";
            }

            if(dV == nullptr) {
                dV = errors->add_debug();
                dV->set_time(m_timer->currentTime());
            }

            auto log = dV->add_log();
            log->set_timestamp(m_timer->currentTime());
            log->set_text(result);
        }

    }

    emit sendRadioResponses(out);
}
