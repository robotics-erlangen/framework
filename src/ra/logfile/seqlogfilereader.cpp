/***************************************************************************
 *   Copyright 2018 Michael Eischer, Tobias Heineken, Andreas Wendler      *
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

#include "seqlogfilereader.h"

#include <QMutex>
#include <QMutexLocker>

SeqLogFileReader::SeqLogFileReader() :
    m_stream(&m_file)
{
    m_mutex = new QMutex(QMutex::Recursive);
    // ensure compatibility across qt versions
    m_stream.setVersion(QDataStream::Qt_4_6);
}

SeqLogFileReader::~SeqLogFileReader()
{
    close();
}

bool SeqLogFileReader::open(const QString &filename)
{
    // lock for atomar opening
    QMutexLocker locker(m_mutex);
    if (m_file.isOpen()) {
        close();
    }

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
    m_currentGroupIndex = -1;
    m_baseOffset = -1;

    return true;
}

void SeqLogFileReader::close()
{
    // cleanup everything and close file
    QMutexLocker locker(m_mutex);
    m_file.close();

    m_errorMsg.clear();
    m_currentGroup.clear();
}

void SeqLogFileReader::seek(qint64 offset, int num)
{
    // lock to prevent intermediate file changes
    QMutexLocker locker(m_mutex);
    qint64 v2BaseOffset = offset + sizeof(qint64) * (m_packageGroupSize - num);
    if(m_version == Version2 && v2BaseOffset != m_baseOffset){
        m_currentGroupMaxIndex = m_packageGroupSize;
        m_file.seek(v2BaseOffset - sizeof(qint64) * m_packageGroupSize);
        for(int i=0; i < m_packageGroupSize; ++i){
            qint64 time;
            m_stream >> time;
            if (time == 0){
                m_currentGroupMaxIndex = i;
                break;
            }
        }
        m_file.seek(v2BaseOffset);
        m_baseOffset = v2BaseOffset;
            // read and decompress group
            m_currentGroup.clear();
            m_stream >> m_currentGroup;
            m_currentGroup = qUncompress(m_currentGroup);
            if (m_currentGroup.isEmpty()) {
                return ;
            }
            // get offsets in package
            m_currentGroupOffsets.clear();
            QDataStream ds(m_currentGroup);
            ds.setVersion(QDataStream::Qt_4_6);
            ds.skipRawData(m_currentGroup.size() - sizeof(qint32) * m_packageGroupSize);
            for (int i = 0; i < m_packageGroupSize; ++i) {
                qint32 offset;
                ds >> offset;
                m_currentGroupOffsets.append(offset);
            }
            m_currentGroupIndex = num;
    }
    else if (m_version != Version2){
        m_file.seek(offset);
    }
}

bool SeqLogFileReader::readVersion()
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
            m_stream >> m_packageGroupSize;
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

qint64 SeqLogFileReader::readTimestampVersion0()
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

qint64 SeqLogFileReader::readTimestampVersion1()
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

QPair<qint64, int> SeqLogFileReader::readTimestampVersion2(int packetIndex)
{
    qint64 time;
    m_stream >> time;

    if (packetIndex % m_packageGroupSize == 0) {
        quint32 size;
        m_stream >> size;
        m_file.seek(m_file.pos() + size);
    }

    return QPair<qint64, int>(time, (packetIndex-1) % m_packageGroupSize);
}

QPair<qint64, int> SeqLogFileReader::readTimestamp(int packetIndex)
{
    // lock to prevent intermediate file changes
    QMutexLocker locker(m_mutex);
    switch (m_version) {
        case Version0: return QPair<qint64, int>(readTimestampVersion0(), 0);
        case Version1: return QPair<qint64, int>(readTimestampVersion1(), 0);
        case Version2: return readTimestampVersion2(packetIndex);
        default: qFatal("unknown Version");
    }
}

Status SeqLogFileReader::readStatus()
{
    // lock to prevent intermediate file changes
    QMutexLocker locker(m_mutex);
    if (m_version == Version2) {
        // if the packet is new and must be decompressed first
        if (m_currentGroupIndex == -1 || ++m_currentGroupIndex >= m_currentGroupMaxIndex) {
            //if the end is near
            if(m_currentGroupMaxIndex != m_packageGroupSize) {
                return Status();
            }
            //seek to the requested packetgroup
            seek(m_file.pos(), 0);
        }

        qint32 packetOffset = m_currentGroupOffsets[m_currentGroupIndex];
        //check for invalid offset
        if (packetOffset >= m_currentGroup.size() || packetOffset < 0) {
            return Status();
        }

        qint32 packetSize;
        if (m_currentGroupIndex < m_packageGroupSize - 1) {
            packetSize = m_currentGroupOffsets[m_currentGroupIndex + 1] - packetOffset;
        } else {
            packetSize = m_currentGroup.size() - sizeof(qint32) * m_packageGroupSize - packetOffset;
        }

        Status status = Status::createArena();
        if (status->ParseFromArray(m_currentGroup.data() + packetOffset, packetSize)) {
            return status;
        }
    } else {
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
            Status status = Status::createArena();
            if (status->ParseFromArray(packet.data(), packet.size())) {
                return status;
            }
        }
    }

    // invalid packet
    return Status();
}
