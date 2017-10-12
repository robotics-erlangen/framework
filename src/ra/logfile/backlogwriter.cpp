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

#include "backlogwriter.h"
#include "logfilewriter.h"
#include <QString>
#include <QByteArray>

BacklogStatusSource::BacklogStatusSource(QContiguousCache<QByteArray> &backlog, QContiguousCache<qint64> &timings)
    : m_packets(backlog)
{
    m_timings.reserve(timings.size());
    for (int i = timings.firstIndex();i<=timings.lastIndex();i++) {
        m_timings.append(timings[i]);
    }
}

Status BacklogStatusSource::readStatus(int packet)
{
    if (packet < 0 || packet >= m_timings.size()) {
        return Status();
    }
    QByteArray uncompressed = qUncompress(m_packets.at(packet + m_packets.firstIndex()));
    Status status(new amun::Status);
    status->ParseFromArray(uncompressed.data(), uncompressed.size());
    return status;
}

void BacklogStatusSource::readPackets(int startPacket, int count)
{
    for (int i = startPacket; i < startPacket + count; ++i) {
        emit gotStatus(i, readStatus(i));
    }
}


BacklogWriter::BacklogWriter(unsigned seconds)
{
    m_packets.setCapacity(BACKLOG_SIZE_PER_SECOND * seconds);
    m_timings.setCapacity(BACKLOG_SIZE_PER_SECOND * seconds);
    connect(this, SIGNAL(clearData()), this, SLOT(clear()), Qt::QueuedConnection);
}

BacklogStatusSource * BacklogWriter::makeStatusSource()
{
    return new BacklogStatusSource(m_packets, m_timings);
}

void BacklogWriter::handleStatus(const Status &status)
{
    QByteArray packetData;
    packetData.resize(status->ByteSize());
    if (status->IsInitialized() && status->SerializeToArray(packetData.data(), packetData.size())) {
        // compress the status to save a lot of memory, but be quick
        // the packets are uncompressed before writing to a logfile
        m_packets.append(qCompress(packetData, 1));
        m_timings.append(status->time());
    }
}

Status BacklogWriter::packetFromByteArray(QByteArray packetData)
{
    QByteArray uncompressed = qUncompress(packetData);
    Status status(new amun::Status);
    status->ParseFromArray(uncompressed.data(), uncompressed.size());
    return status;
}

void BacklogWriter::saveBacklog(QString filename, Status teamStatus)
{
    if (m_packets.size() == 0) {
        return;
    }
    emit enableBacklogSave(false);
    LogFileWriter writer;
    if (writer.open(filename)) {
        teamStatus->set_time(packetFromByteArray(m_packets.first())->time());
        writer.writeStatus(teamStatus);
        while (m_packets.size() > 0) {
            Status status = packetFromByteArray(m_packets.takeFirst());
            writer.writeStatus(status);
        }
        writer.close();
    }
    emit clearData();
    emit enableBacklogSave(true);
}

void BacklogWriter::clear()
{
    m_packets.clear();
    m_timings.clear();
}
