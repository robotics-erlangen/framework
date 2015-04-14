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

#include <QNetworkConfigurationManager>
#include <QNetworkSession>

NetworkInterfaceWatcher::NetworkInterfaceWatcher(QObject *parent) :
    QObject(parent)
{
    m_ncm = new QNetworkConfigurationManager(this);

    connect(m_ncm, &QNetworkConfigurationManager::configurationChanged, this, &NetworkInterfaceWatcher::configurationUpdate);
    connect(m_ncm, &QNetworkConfigurationManager::configurationAdded, this, &NetworkInterfaceWatcher::configurationUpdate);
}

// configuration updates are triggered whenever something is added / changed
void NetworkInterfaceWatcher::configurationUpdate(const QNetworkConfiguration &config)
{
    if (!config.state().testFlag(QNetworkConfiguration::Undefined)) {
        QNetworkSession qns(config);
        // a interface is only accessible if the configuration is connected
        if (qns.interface().isValid()) {
            emit interfaceUpdated(qns.interface());
        }
    }
}
