/***************************************************************************
 *   Copyright 2020 Tobias Heineken                                        *
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

#ifndef BUFFEREDSTATUSSOURCE_H
#define BUFFEREDSTATUSSOURCE_H

#include <QObject>
#include <QPair>
#include <QQueue>
#include "protobuf/status.h"
#include "statussource.h"

namespace BufferedStatusSourceInternal {
    class SignalSource;
}

class BufferedStatusSource : public QObject
{
    Q_OBJECT

public:
    BufferedStatusSource(std::shared_ptr<StatusSource> status, QObject* parent = nullptr);

public slots:
    void addStatus(int packet, const Status &status);
    void updateBufferSize(int playspeed);

signals:
    void gotNewData(); // can be used to restart playing after missing data stopped it.

public:
    bool hasData();
    QPair<int, Status> peek() const;
    void pop();
    void requestPackets(int startPacket, int count);
    int requestedBufferSize(); // something like this is needed in logmanager to spool packets instead of seeking if the data is already there.
    const std::shared_ptr<StatusSource>& getStatusSource() const {
        return m_statusSource;
    }
    void checkBuffer();

private:
    int m_bufferLimit;
    std::shared_ptr<StatusSource> m_statusSource;
    QQueue<Status> m_nextPackets;
    int m_expectedPacket;
    int m_nextRequestPacket;
    BufferedStatusSourceInternal::SignalSource* m_signalSource;
};
#endif
