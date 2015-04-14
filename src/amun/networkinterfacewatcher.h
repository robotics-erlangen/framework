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

#ifndef NETWORKINTERFACEWATCHER_H
#define NETWORKINTERFACEWATCHER_H

#include <QObject>
#include <QNetworkConfiguration>
#include <QNetworkInterface>

class QNetworkConfigurationManager;

class NetworkInterfaceWatcher : public QObject
{
    Q_OBJECT
public:
    explicit NetworkInterfaceWatcher(QObject *parent = 0);

signals:
    void interfaceUpdated(const QNetworkInterface &interface);

private slots:
    void configurationUpdate(const QNetworkConfiguration &config);

private:
    QNetworkConfigurationManager *m_ncm;
};

#endif // NETWORKINTERFACEWATCHER_H
