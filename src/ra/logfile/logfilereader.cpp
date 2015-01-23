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

bool LogFileReader::open(QString filename)
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

    // index the whole file
    while (!m_stream.atEnd()) {
        const qint64 offset = m_file.pos();

        qint64 time;
        if (m_version == Version0) {
            time = readTimestampVersion0();
        } else if (m_version == Version1) {
            time = readTimestampVersion1();
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

Status LogFileReader::readStatus(int packetNum)
{
    // lock to prevent intermediate file changes
    QMutexLocker locker(m_mutex);
    if (packetNum < 0 || packetNum >= m_packets.size()) {
        return Status();
    }

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
