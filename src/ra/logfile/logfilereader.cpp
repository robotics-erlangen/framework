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

#include "logfilereader.h"

#include <QMutex>
#include <QMutexLocker>


LogFileReader::LogFileReader()
{
}

LogFileReader::LogFileReader(const QList<qint64> &timings, const QList<qint64> &offsets, const qint32 groupedPackages):
    m_timings(timings)
{
    int inGroupIndex = 0;
    for(qint64 off: offsets){
        m_packets.append(QPair<qint64, int>(off, inGroupIndex));
        inGroupIndex++;
        if(inGroupIndex >= groupedPackages){
            inGroupIndex -= groupedPackages;
        }
    }
}

LogFileReader::~LogFileReader()
{
    close();
}

QPair<StatusSource*, QString> LogFileReader::tryOpen(QString filename)
{
    LogFileReader *reader = new LogFileReader();
    if (reader->open(filename)) {
        return QPair<StatusSource*, QString>(reader, "");
    }
    QString errorMessage = reader->errorMsg();
    bool headerCorrect = reader->m_headerCorrect;
    delete reader;
    if(headerCorrect) {
        return QPair<StatusSource*, QString>(nullptr, errorMessage);
    } else {
        return QPair<StatusSource*, QString>(nullptr, "");
    }
}

bool LogFileReader::open(const QString &filename)
{
    m_headerCorrect = false;
    // lock for atomar opening
    if (m_reader.isOpen()) {
        close();
    }

    // try to open the requested file
    if (!m_reader.open(filename)) {
        close();
        m_errorMsg = m_reader.errorMsg();
        return false;
    }

    m_headerCorrect = true;

    // index the whole file
    if (m_timings.size() == 0 && !indexFile()) {
        m_reader.close();
        return false;
    }

    if (m_packets.size() == 0) {
        m_errorMsg = "Invalid or empty logfile";
        m_reader.close();
        return false;
    }

    return true;
}

void LogFileReader::close()
{
    // cleanup everything and close file
    m_reader.close();

    m_errorMsg.clear();
    m_packets.clear();
    m_timings.clear();
}

bool LogFileReader::indexFile()
{
    int packetIndex = 0;
    qint64 lastTime = 0;
    while (!m_reader.atEnd()) {
        const qint64 offset = m_reader.pos();
        packetIndex++;

        QPair<qint64,int> pair = m_reader.readTimestamp(packetIndex);
        qint64 time = pair.first;

        // a timestamp of 0 indicates a invalid packet
        if (time != 0) {
            // timestamps that are too far apart mean that the logfile is corrupt
            if (lastTime != 0 && (time - lastTime < 0 || time - lastTime > 200000000000L)) {
                m_errorMsg = "Invalid or corrupt logfile";
                return false;
            }

            // remember the start of the current frame
            m_packets.append(QPair<qint64, int>(offset, pair.second));
            m_timings.append(time);
        }
        lastTime = time;
    }
    return true;
}

Status LogFileReader::readStatus(int packetNum)
{
    if (packetNum < 0 || packetNum >= m_packets.size()) {
        return Status();
    }
    //seek to the requested packetgroup
    QPair<qint64, int> pos = m_packets.value(packetNum);
    m_reader.seek(pos.first, pos.second);
    return m_reader.readStatus();
}

void LogFileReader::readPackets(int startPacket, int count)
{
    // read requested packets
    for (int i = startPacket; i < startPacket + count; ++i) {
        emit gotStatus(i, readStatus(i));
    }
}
