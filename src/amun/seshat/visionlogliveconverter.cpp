/***************************************************************************
 *   Copyright 2018 Andreas Wendler                                        *
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

#include "visionlogliveconverter.h"
#include "visionlog/visionlogreader.h"

#include <QString>

static const QString SENDER_NAME_FOR_REFEREE = "VisionLogLiveConverter";

VisionLogLiveConverter::VisionLogLiveConverter(VisionLogReader *file) :
    m_referee(),
    m_tracker(false, false),
    m_lastPacket(0),
    m_lastFlipped(false),
    m_packetCache(2000) // the packets produced by the tracking are very small, many can be cached
{
    m_logFile = file;
    m_tracker.reset();
    auto packetIndex =  m_logFile->indexFile();
    if (packetIndex.size() == 0) {
        m_indexError = "Invalid or corrupt vision log!";
        return;
    }
    qint64 lastTime = packetIndex.last().first;
    // every 10 ms
    int counter = 0;
    int index = 0;
    for (qint64 time = packetIndex.first().first;time < lastTime;time += 10000000, counter++) {
        m_timings.append(time);
        while (index < packetIndex.size() && packetIndex[index].first < time) index++;
        m_timeIndex[counter] = index;
    }
}

VisionLogLiveConverter::~VisionLogLiveConverter()
{
    delete m_logFile;
}

QPair<std::shared_ptr<StatusSource>, QString> VisionLogLiveConverter::tryOpen(QString filename)
{
    VisionLogReader *reader = new VisionLogReader(filename);
    if (!reader->errorMessage().isEmpty()) {
        delete reader;
        return QPair<std::shared_ptr<StatusSource>, QString>(nullptr, "");
    }
    VisionLogLiveConverter *converter = new VisionLogLiveConverter(reader);
    QString errorMessage = converter->m_indexError;
    if (errorMessage.isEmpty()) {
        return QPair<std::shared_ptr<StatusSource>, QString>(std::shared_ptr<StatusSource>(converter), "");
    } else {
        delete converter;
        return QPair<std::shared_ptr<StatusSource>, QString>(nullptr, errorMessage);
    }
}

qint64 VisionLogLiveConverter::processPacket(int packet, qint64 nextProcess)
{
    auto header = m_logFile->visionPacketByIndex(packet, m_visionFrame);
    VisionLog::MessageType type = header.second;
    if (header.first > nextProcess) {
        m_tracker.process(nextProcess);
    }
    if (type == VisionLog::MessageType::MESSAGE_SSL_VISION_2014) {
        m_tracker.queuePacket(m_visionFrame, header.first, "logfile");
    } else if (type == VisionLog::MessageType::MESSAGE_SSL_REFBOX_2013) {
        m_referee.handlePacket(m_visionFrame, SENDER_NAME_FOR_REFEREE);
        if (m_referee.getFlipped() != m_lastFlipped) {
            m_tracker.setFlip(m_referee.getFlipped());
            m_lastFlipped = m_referee.getFlipped();
        }
    }
    return header.first;
}

Status VisionLogLiveConverter::readStatus(int packet)
{
    if (packet < 0 || packet >= packetCount()) {
        return Status();
    }

    // check if the packet was cached before
    Status *cached = m_packetCache.object(packet);
    if (cached != nullptr) {
        return *cached;
    }

    qint64 requestedTime = m_timings[packet];
    // if the time difference is short, process all packets in between
    int startPacket = m_lastPacket;
    const int PRELOAD_PACKETS = 200; // 2 seconds
    if (packet < m_lastPacket || packet - m_lastPacket > PRELOAD_PACKETS) {
        m_tracker.reset();
        startPacket = std::max(0, packet - PRELOAD_PACKETS);
    }
    for (int p = m_timeIndex[startPacket];p < m_timeIndex[packet];p++) {
        qint64 time = processPacket(p, m_timings[startPacket]);
        if (time > m_timings[startPacket]) {
            startPacket++;
        }
    }
    m_lastPacket = packet;

    m_tracker.process(requestedTime);
    Status status = m_tracker.worldState(requestedTime, true);
    status->set_time(requestedTime);

    m_referee.process(status->world_state());
    status->mutable_game_state()->CopyFrom(m_referee.gameState());

    // yes, it is really uncomfortable to use smart pointers this way
    m_packetCache.insert(packet, new Status(status));
    return status;
}

void VisionLogLiveConverter::readPackets(int startPacket, int count)
{
    // read requested packets
    for (int i = startPacket; i < startPacket + count; ++i) {
        emit gotStatus(i, readStatus(i));
    }
}
