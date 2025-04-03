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

#include "networkinterfacewatcher.h"

#include <algorithm>
#include <QAbstractSocket>
#include <QNetworkInterface>

NetworkInterfaceWatcher::NetworkInterfaceWatcher(QObject *parent) :
    QObject(parent),
    m_interfaceCheckTimer(new QTimer(this))
{
    connect(m_interfaceCheckTimer, &QTimer::timeout, this, &NetworkInterfaceWatcher::checkInterfaces);
    m_interfaceCheckTimer->start(1000);
}

// checks whether something is added / changed
void NetworkInterfaceWatcher::checkInterfaces()
{
    const auto currentInterfaces = QNetworkInterface::allInterfaces();
    QList<QNetworkInterface> newInterfaces;
    for (const auto& interface : currentInterfaces) {
        const auto addressEntries = interface.addressEntries();
        const bool hasValidIpV4Address = std::any_of(addressEntries.begin(), addressEntries.end(), [] (const auto address) {
                                                return address.ip().protocol() == QAbstractSocket::IPv4Protocol;
                                            });

        // the udp joinMulticast in the receiver fails if no ipv4 address is found
        if (hasValidIpV4Address) {

            // check if the interface is not in the previous m_currentInterfaces
            const auto equivalentInterface = std::find_if(
                                                m_currentConnectedInterfaces.begin(),
                                                m_currentConnectedInterfaces.end(),
                                                [&] (const auto prevInterface) { return interface.hardwareAddress() == prevInterface.hardwareAddress();
                                            });

            if (equivalentInterface == m_currentConnectedInterfaces.end()) {
                emit interfaceUpdated(interface);
            }

            newInterfaces.append(interface);
        }
    }

    m_currentConnectedInterfaces = newInterfaces;
}
