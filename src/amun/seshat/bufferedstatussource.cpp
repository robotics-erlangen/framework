/***************************************************************************
 *   Copyright 2020 Tobias Heineken, Andreas Wendler                       *
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

#include "bufferedstatussource.h"

namespace BufferedStatusSourceInternal {
    class SignalSource: public QObject {
        Q_OBJECT

    public:
        SignalSource(QObject* parent = nullptr) : QObject(parent) {}

    signals:
        void readPackets(int startPacket, int count);
    };
}

using BufferedStatusSourceInternal::SignalSource;

BufferedStatusSource::BufferedStatusSource(std::shared_ptr<StatusSource> statusSource, QObject* parent):
        QObject(parent),
        m_statusSource(statusSource),
        m_expectedPacket(0),
        m_nextRequestPacket(0),
        m_signalSource(new SignalSource(this))
{
    updateBufferSize(100); // assume 100% speed
    connect(m_signalSource, &SignalSource::readPackets, &*m_statusSource, &StatusSource::readPackets);
    connect(&*m_statusSource, &StatusSource::gotStatus, this, &BufferedStatusSource::addStatus);
}

void BufferedStatusSource::requestPackets(int start, int size) {
    m_expectedPacket = start;
    m_nextPackets.clear();
    m_nextRequestPacket = start + size;
    emit m_signalSource->readPackets(start, size);
    return;
}

void BufferedStatusSource::addStatus(int packet, const Status& s) {
    if (packet != m_expectedPacket) {
        // drop outdated packets
        return;
    }
    bool sendSignal = false;
    if (m_nextPackets.size() == 0) {
        sendSignal = true;
    }

    m_nextPackets.enqueue(s);
    m_expectedPacket++;

    if (sendSignal) {
        emit gotNewData();
    }
    return;
}

void BufferedStatusSource::updateBufferSize(int playspeed) {
    // about 500 status per second, prefetch 0.1 seconds
    m_bufferLimit = 50 * qMax(1., playspeed / 100.);
}

QPair<int, Status> BufferedStatusSource::peek() const {
    int packet = m_expectedPacket - m_nextPackets.size();
    Status s = m_nextPackets[0];
    return qMakePair(packet, s);
}

void BufferedStatusSource::pop() {
    Q_ASSERT(m_nextPackets.size() > 0);
    m_nextPackets.dequeue();
}

void BufferedStatusSource::checkBuffer() {
    if (m_nextPackets.size() + (m_nextRequestPacket - m_expectedPacket) < m_bufferLimit && m_nextRequestPacket < m_statusSource->packetCount()) {
        int lastRequest = m_nextRequestPacket;
        m_nextRequestPacket = std::min(m_nextRequestPacket + m_bufferLimit/5, m_statusSource->packetCount());
        int packetCount = m_nextRequestPacket - lastRequest;
        emit m_signalSource->readPackets(lastRequest, packetCount);
    }
}

bool BufferedStatusSource::hasData() {
    return m_nextPackets.size() > 0;
}

int BufferedStatusSource::requestedBufferSize() {
    return m_nextPackets.size() + m_nextRequestPacket - m_expectedPacket;
}

#include "bufferedstatussource.moc"
