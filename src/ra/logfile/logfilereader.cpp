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

LogFileReader::LogFileReader() :
    QObject(), m_stream(&m_file)
{
    m_mutex = new QMutex(QMutex::Recursive);
    // ensure compatibility across qt versions
    m_stream.setVersion(QDataStream::Qt_4_6);
    close();
}

LogFileReader::~LogFileReader()
{
    close();
}

bool LogFileReader::open(const QString &filename)
{
    // lock for atomar opening
    QMutexLocker locker(m_mutex);
    close();

    // try to open the requested file
    m_file.setFileName(filename);
    if (!m_file.open(QIODevice::ReadOnly)) {
        close();
        m_errorMsg = "Opening logfile failed";
        return false;
    }

    // check for known version
    if (!readVersion()) {
        m_file.close();
        return false;
    }

    // initialize variables
    m_groupStart = -1;
    m_packetIndex = 0;

    // index the whole file
    while (!m_stream.atEnd()) {
        const qint64 offset = m_file.pos();

        qint64 time;
        if (m_version == Version0) {
            time = readTimestampVersion0();
        } else if (m_version == Version1) {
            time = readTimestampVersion1();
        } else if (m_version == Version2) {
            time = readTimestampVersion2();
        } else {
            // internal bugcheck
            qFatal("This log format is not yet implemented!");
        }

        // a timestamp of 0 indicates a invalid packet
        if (time != 0) {
            // remember the start of the current frame
            m_packets.append(offset);
            m_timings.append(time);
        }
    }
    if (m_packets.size() == 0) {
        m_errorMsg = "Invalid or empty logfile";
        m_file.close();
        return false;
    }

    return true;
}

void LogFileReader::close()
{
    // cleanup everything and close file
    QMutexLocker locker(m_mutex);
    m_file.close();

    m_errorMsg.clear();
    m_packets.clear();
    m_timings.clear();
    m_currentGroup.clear();
}

bool LogFileReader::readVersion()
{
    QString name;
    m_stream >> name;
    m_version = Version0;

    // first version misses prefix
    if (name == "AMUN-RA LOG") {
        int v;
        m_stream >> v;
        switch (v) {
        case 1:
            m_version = Version1;
            break;

        case 2:
            m_version = Version2;
            m_stream >>m_groupedPackages;
            break;

        default:
            m_errorMsg = "File format not supported!";
            return false;
        }
    } else {
        m_file.seek(0);
    }
    return true;
}

qint64 LogFileReader::readTimestampVersion0()
{
    // read the whole packet and decompress it
    QByteArray packet;
    m_stream >> packet;
    packet = qUncompress(packet);

    // parse and get the timestamp
    amun::Status status;
    if (status.ParseFromArray(packet.data(), packet.size())) {
        return status.time();
    }
    return 0;
}

qint64 LogFileReader::readTimestampVersion1()
{
    qint64 time;
    quint32 size; // hack to avoid reading the whole bytearray
    m_stream >> time;
    m_stream >> size;
    m_file.seek(m_file.pos() + size);

    // simple sanity check
    if (size == 0) {
        return 0;
    }
    return time;
}

qint64 LogFileReader::readTimestampVersion2()
{
    qint64 time;
    m_stream >> time;

    if (++m_packetIndex == m_groupedPackages) {
        m_packetIndex = 0;
        quint32 size;
        m_stream >>size;
        m_file.seek(m_file.pos() + size);
    }

    return time;
}

Status LogFileReader::readStatus(int packetNum)
{
    // lock to prevent intermediate file changes
    QMutexLocker locker(m_mutex);
    if (packetNum < 0 || packetNum >= m_packets.size()) {
        return Status();
    }

    if (m_version == Version2) {
        int groupIndex = packetNum % m_groupedPackages;
        // if the packet is new and must be decompressed first
        if (packetNum < m_groupStart || packetNum >= m_groupStart + m_groupedPackages || m_groupStart == -1) {
            //seek to the requested packetgroup
            m_file.seek(m_packets.value(packetNum) + sizeof(qint64) * (m_groupedPackages - groupIndex));

            // read and decompress group
            m_groupStart = packetNum - groupIndex;
            m_currentGroup.clear();
            m_stream >> m_currentGroup;
            m_currentGroup = qUncompress(m_currentGroup);
            if (m_currentGroup.isEmpty()) {
                return Status();
            }
        }

        // pick the requested package from the group
        // in case the endianness is different on writing and reading system, this will create problems
        qint32 * offsetTable = (qint32*)(m_currentGroup.data() + m_currentGroup.size() -
                                         sizeof(qint32) * (m_groupedPackages));
        qint32 packetOffset = offsetTable[groupIndex];
        //check for invalid offset
        if (packetOffset >= m_currentGroup.size() || packetOffset < 0) {
            return Status();
        }

        qint32 packetSize;
        if (groupIndex < m_groupedPackages - 1 && packetNum < m_timings.size() - 1) {
            packetSize = offsetTable[groupIndex + 1] - packetOffset;
        } else {
            packetSize = m_currentGroup.size() - sizeof(qint32) * m_groupedPackages - packetOffset;
        }

        Status status(new amun::Status);
        if (status->ParseFromArray(m_currentGroup.data() + packetOffset, packetSize)) {
            return status;
        }
    } else {
        // seek to the requested packet
        m_file.seek(m_packets.value(packetNum));

        // skip timestamp of version one
        if (m_version == Version1) {
            qint64 time;
            m_stream >> time;
        }

        // read and parse status
        QByteArray packet;
        m_stream >> packet;
        packet = qUncompress(packet);
        if (!packet.isEmpty()) {
            Status status(new amun::Status);
            if (status->ParseFromArray(packet.data(), packet.size())) {
                return status;
            }
        }
    }

    // invalid packet
    return Status();
}

void LogFileReader::readPackets(int startPacket, int count)
{
    // read requested packets
    for (int i = startPacket; i < startPacket + count; ++i) {
        emit gotStatus(i, readStatus(i));
    }
}
