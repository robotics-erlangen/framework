/***************************************************************************
 *   Copyright 2015 Philipp Nordhus                                        *
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

#ifndef RECEIVER_H
#define RECEIVER_H

#include <QUdpSocket>
#include "protobuf/status.h"

class Timer;

class Receiver : public QObject
{
    Q_OBJECT

public:
    Receiver(const QHostAddress &groupAddress, quint16 port, Timer *timer);
    ~Receiver() override;
    Receiver(const Receiver&) = delete;
    Receiver& operator=(const Receiver&) = delete;

signals:
    void gotPacket(const QByteArray &data, qint64 time, QString sender);
    void sendStatus(const Status &status);

public slots:
    void startListen();
    void stopListen();
    void updateInterface(const QNetworkInterface& interface);
    void updatePort(quint16 port);

private slots:
    void readData();

private:
    QHostAddress m_groupAddress;
    quint16 m_port;
    QUdpSocket *m_socket;
    Timer *m_timer;
};

#endif // RECEIVER_H
