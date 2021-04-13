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
#ifndef NETWORKTRANSCEIVER_H
#define NETWORKTRANSCEIVER_H

#include <QObject>

#include "protobuf/command.h"
#include "protobuf/status.h"
#include "protobuf/sslsim.h"

class QUdpSocket;
class Timer;

class NetworkTransceiver : public QObject
{
    Q_OBJECT
public:
    explicit NetworkTransceiver(const Timer *m_timer, QObject *parent = nullptr);
    ~NetworkTransceiver() override;
    NetworkTransceiver(const NetworkTransceiver&) = delete;
    NetworkTransceiver& operator=(const NetworkTransceiver&) = delete;
    void setSendCommands(bool send) {
        m_sendCommands = send;
    }

signals:
    void sendStatus(const Status &status);
    void sendRadioResponses(const QList<robot::RadioResponse> &responses);
    void sendSSLSimError(const QList<SSLSimError> errors);

public slots:
    void handleSSLSimCommand(const SSLSimRobotControl& rc, bool blue, qint64 processingStart);
    void handleCommand(const Command &command);

private slots:
    void handleResponse();

private:
    bool sendSSLSimPacket(const sslsim::RobotControl& control, bool blueTeam);
    bool isConfigInitialized() const;
    QString getHost() const;
    bool getControlSimulator() const;
    bool getControlBlue() const;
    bool getControlYellow() const;
    uint32_t getPortControl() const;
    uint32_t getPortBlue() const;
    uint32_t getPortYellow() const;
    bool sendSSLSimCommand(const sslsim::SimulatorCommand& cmd);

private:
    struct NetworkConfig {
        amun::HostAddress m_hostAddress;
        amun::SimulatorNetworking m_simulatorConfig;
    };
    NetworkConfig m_configuration;
    QUdpSocket *m_udpSocket;
    const Timer *m_timer;
    Command m_teamCommand{new amun::Command};
    bool m_sendCommands = false;
    bool m_teamCommandModified = false;
};

#endif // NETWORKTRANSCEIVER_H
