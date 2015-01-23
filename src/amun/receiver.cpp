/***************************************************************************
 *   Copyright 2014 Michael Eischer, Philipp Nordhus                       *
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

#include "receiver.h"
#include "core/timer.h"
#include <QNetworkInterface>
#include <QUdpSocket>

/*!
 * \class Receiver
 * \ingroup amun
 * \brief UDP multicast receiver
 *
 * This class is designed to timestamp an incoming packet as early as possible
 * by being moved to a dedicated worker thread.
 */

/*!
 * \fn void Receiver::gotPacket(QByteArray data, qint64 time)
 * \brief This signal is emitted whenever a new packet has been received
 * \param data  The received packet
 * \param time  Timestamp at which the packet has been received
 */

/*!
 * \brief Constructor
 * \param groupAddress Address of the multicast group to listen on
 * \param port Port to listen on
 */
Receiver::Receiver(const QHostAddress &groupAddress, quint16 port) :
    m_groupAddress(groupAddress),
    m_port(port),
    m_socket(NULL)
{
}

/*!
 * \brief Destructor
 */
Receiver::~Receiver()
{
    stopListen();
}

/*!
 * \brief Start listening on the socket
 */
void Receiver::startListen()
{
    stopListen();

    m_socket = new QUdpSocket(this);
    connect(m_socket, SIGNAL(readyRead()), SLOT(readData()));
    m_socket->bind(QHostAddress::AnyIPv4, m_port, QUdpSocket::ShareAddress | QUdpSocket::ReuseAddressHint);
    foreach (const QNetworkInterface& iface, QNetworkInterface::allInterfaces()) {
        m_socket->joinMulticastGroup(m_groupAddress, iface);
    }
}

/*!
 * \brief Stop listening on the socket
 */
void Receiver::stopListen()
{
    delete m_socket;
    m_socket = NULL;
}

/*!
 * \brief Read a packet from the socket and emit \ref gotPacket
 */
void Receiver::readData()
{
    QByteArray data;
    data.resize(m_socket->pendingDatagramSize());
    m_socket->readDatagram(data.data(), data.size());
    emit gotPacket(data, Timer::systemTime());
}
