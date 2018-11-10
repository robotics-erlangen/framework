/***************************************************************************
 *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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
#include <QNetworkProxy>
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
 * \fn void Receiver::gotPacket(QByteArray data, qint64 time, QString sender)
 * \brief This signal is emitted whenever a new packet has been received
 * \param data  The received packet
 * \param time  Timestamp at which the packet has been received
 * \param sender The sender of the packet
 */

/*!
 * \brief Constructor
 * \param groupAddress Address of the multicast group to listen on
 * \param port Port to listen on
 */
Receiver::Receiver(const QHostAddress &groupAddress, quint16 port, Timer *timer) :
    m_groupAddress(groupAddress),
    m_port(port),
    m_socket(nullptr),
    m_timer(timer)
{ }

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
    // Proxying vision / referee packets won't work
    // ssh can't handle udp proxying
    // unsure if IP Multicast has even the slightest chance of working
    m_socket->setProxy(QNetworkProxy::NoProxy);
    connect(m_socket, SIGNAL(readyRead()), SLOT(readData()));
    m_socket->bind(QHostAddress::AnyIPv4, m_port, QUdpSocket::ShareAddress | QUdpSocket::ReuseAddressHint);

    if (m_socket->state() != QAbstractSocket::BoundState) {
        // if the socket can't be bound, its probably cause by ssl vision
        Status status(new amun::Status);
        status->mutable_amun_state()->mutable_port_bind_error()->set_port(m_port);
        emit sendStatus(status);

        qWarning() << "Failed to bind the receiver to" << m_port << m_socket->errorString();
        if (!m_groupAddress.isNull()) {
            qWarning() << "  requested multicast group" << m_groupAddress;
        }
        return;
    }

    if (!m_groupAddress.isNull()) {
        foreach (const QNetworkInterface& iface, QNetworkInterface::allInterfaces()) {
            m_socket->joinMulticastGroup(m_groupAddress, iface);
        }
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
 * \brief Join multicast group for this interface, as it has changed
 * \param interface the interface for which the change occured
 */
void Receiver::updateInterface(const QNetworkInterface& interface)
{
    if (m_socket == nullptr) {
        return;
    }
    if (!m_groupAddress.isNull()) {
        // just try joining
        m_socket->joinMulticastGroup(m_groupAddress, interface);
    }
}

/*!
 * \brief Update the port listened on
 * \param port New port to listen on
 */
void Receiver::updatePort(quint16 port)
{
    // don't reconnect if the port didn't change
    if (port == m_port) {
        return;
    }

    stopListen();
    m_port = port;
    startListen();
}

/*!
 * \brief Read a packet from the socket and emit \ref gotPacket
 */
void Receiver::readData()
{
    while (m_socket->hasPendingDatagrams()) {
        QByteArray data;
        data.resize(m_socket->pendingDatagramSize());
        QHostAddress senderAdddress;
        m_socket->readDatagram(data.data(), data.size(), &senderAdddress);
        emit gotPacket(data, m_timer->currentTime(), senderAdddress.toString());
    }
}
