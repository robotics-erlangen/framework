/***************************************************************************
 *   Copyright 2020 Andreas Wendler                                        *
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

#ifndef EXTERNALGAMECONTROLLER_H
#define EXTERNALGAMECONTROLLER_H

#include <memory>
#include <QByteArray>
#include <QTcpSocket>
#include <QHostAddress>
#include <google/protobuf/message.h>

class QObject;

class GameControllerSocket
{
public:
    GameControllerSocket(quint16 port, QObject *parent = nullptr);
    bool connectGameController();
    void closeConnection();
    bool receiveGameControllerMessage(google::protobuf::Message *type);
    bool sendGameControllerMessage(const google::protobuf::Message *message);
    void setRefereeHost(QString host);
    void setPort(int port) { m_port = port; }

private:
    QTcpSocket m_gameControllerSocket;
    int m_nextPackageSize = -1; // negative if not known yet
    QByteArray m_partialPacket;
    unsigned int m_sizeBytesPosition = 0;
    QHostAddress m_gameControllerHost;

    quint16 m_port;
};

#endif // EXTERNALGAMECONTROLLER_H
