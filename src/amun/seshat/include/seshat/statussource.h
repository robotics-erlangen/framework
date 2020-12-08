/***************************************************************************
 *   Copyright 2017 Andreas Wendler                                        *
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

#ifndef STATUSSOURCE_H
#define STATUSSOURCE_H

#include "protobuf/status.h"
#include <QString>
#include <QObject>

class StatusSource : public QObject
{
    Q_OBJECT
public:
    virtual ~StatusSource() {}
    StatusSource(const StatusSource&) = delete;
    StatusSource& operator=(const StatusSource&) = delete;
    virtual bool isOpen() const = 0;

    virtual const QList<qint64>& timings() const = 0;
    // equals timings().size()
    virtual int packetCount() const = 0;
    virtual Status readStatus(int packet) = 0;
    virtual QString logUID() = 0;

public slots:
    virtual void readPackets(int startPacket, int count) = 0;

signals:
    void gotStatus(int packet, const Status &status);

protected:
    StatusSource() = default;
};

#endif // STATUSSOURCE_H
