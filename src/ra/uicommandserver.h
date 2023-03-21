/***************************************************************************
 *   Copyright 2023 Michel Schmid                                          *
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

#ifndef UI_COMMAND_SERVER_H
#define UI_COMMAND_SERVER_H

#include <QtNetwork>

#include "protobuf/command.h"

class UiCommandServer
{
public:
    UiCommandServer(const quint16 sendPort = 10060, const quint16 bindPort = 10059);

    bool send(const Command& command);

private:
    QUdpSocket m_socket;
    quint16 m_port;
    QHostAddress m_net_address;
};

#endif // UI_COMMAND_SERVER

