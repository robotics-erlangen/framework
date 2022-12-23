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

#include "gamecontrollersocket.h"
#include <google/protobuf/util/delimited_message_util.h>

GameControllerSocket::GameControllerSocket(quint16 port, QObject *parent) :
    m_gameControllerSocket(parent),
    m_port(port)
{
    m_gameControllerSocket.setSocketOption(QAbstractSocket::LowDelayOption, 1);
}

void GameControllerSocket::closeConnection()
{
    m_gameControllerSocket.close();
}

bool GameControllerSocket::connectGameController()
{
    if (m_gameControllerSocket.state() == QAbstractSocket::ConnectedState) {
        return true;
    }
    if (m_gameControllerSocket.state() == QAbstractSocket::UnconnectedState) {
        m_gameControllerSocket.connectToHost(m_gameControllerHost, m_port);
    }
    return false;
}

bool GameControllerSocket::receiveGameControllerMessage(google::protobuf::Message *type)
{
    if (connectGameController()) {
        QByteArray data = m_gameControllerSocket.readAll();
        m_partialPacket.append(data);
        if (m_nextPackageSize < 0 && m_partialPacket.size() > 0) {
            while (m_sizeBytesPosition < static_cast<unsigned int>(m_partialPacket.size())) {
                if ((m_partialPacket[m_sizeBytesPosition] & 0x80) == 0) {
                    const uint8_t *buffer = reinterpret_cast<unsigned char*>(data.data());
                    google::protobuf::io::CodedInputStream varIntReader(buffer, m_sizeBytesPosition + 1);
                    unsigned int packageSize = 0;
                    varIntReader.ReadVarint32(&packageSize);
                    m_nextPackageSize = static_cast<int>(packageSize);
                    m_partialPacket.remove(0, m_sizeBytesPosition + 1);
                    m_sizeBytesPosition = 0;
                    break;
                } else {
                    m_sizeBytesPosition++;
                }
            }
        }
        if (m_nextPackageSize >= 0 && m_partialPacket.size() >= m_nextPackageSize) {
            bool hasResult = type->ParseFromArray(m_partialPacket.data(), m_nextPackageSize);
            m_partialPacket.remove(0, m_nextPackageSize);
            m_nextPackageSize = -1;
            return hasResult;
        }
        return false;
    }
    return false;
}

bool GameControllerSocket::sendGameControllerMessage(const google::protobuf::Message *message)
{
    if (connectGameController()) {
        google::protobuf::uint32 messageLength = message->ByteSize();
        int bufferLength = messageLength + 20; // for some extra space
        std::vector<google::protobuf::uint8> buffer(bufferLength);

        google::protobuf::io::ArrayOutputStream arrayOutput(buffer.data(), bufferLength);
        google::protobuf::io::CodedOutputStream codedOutput(&arrayOutput);
        if (!google::protobuf::util::SerializeDelimitedToCodedStream(*message, &codedOutput)) {
            return false;
        }

        QByteArray serializedMessage((char*)buffer.data(), (int)codedOutput.ByteCount());

        auto count = m_gameControllerSocket.write(serializedMessage);
        return count == serializedMessage.size();
    }
    return false;
}

void GameControllerSocket::setRefereeHost(QString host)
{
    QHostAddress hostAddress(host);
    if (hostAddress != m_gameControllerHost) {
        m_gameControllerHost = hostAddress;
        m_gameControllerSocket.close();
    }
}
