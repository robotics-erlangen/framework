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

#include "uicommandserver.h"
#include <QtNetwork>
#include <QColor>

UiCommandServer::UiCommandServer(const quint16 sendPort, const quint16 bindPort) :
    m_port(sendPort),
    m_net_address(QHostAddress(QHostAddress::LocalHost))
{
    m_socket.bind(m_net_address, bindPort);
}

bool UiCommandServer::send(const Command& command)
{
    QByteArray datagram;
    datagram.resize(command->ByteSize());
    if (!command->SerializeToArray(datagram.data(), datagram.size())) {
        datagram = {};
    }

    quint64 bytes_sent = m_socket.writeDatagram(datagram, m_net_address, m_port);
    if (bytes_sent != datagram.size()) {
        qDebug() << QString("Sending UDP datagram failed (maybe too large?). Size was: %1 byte(s).").arg(datagram.size()), QColor("red");
        return false;
    }

    return true;
}
