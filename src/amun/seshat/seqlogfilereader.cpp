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
    m_file(new QFile()),
    m_stream(new QDataStream(m_file.get()))
{
    m_mutex = new QMutex(QMutex::Recursive);
    // ensure compatibility across qt versions
    m_stream->setVersion(QDataStream::Qt_4_6);
}

SeqLogFileReader::~SeqLogFileReader()
{
    close();
    delete m_mutex;
}

SeqLogFileReader::SeqLogFileReader(SeqLogFileReader&& o) :
    m_mutex(new QMutex(QMutex::Recursive)),
    m_file(std::move(o.m_file)),
    m_stream(std::move(o.m_stream)),
    m_version(std::move(o.m_version)),
    m_currentGroup(std::move(o.m_currentGroup)),
    m_currentGroupOffsets(std::move(o.m_currentGroupOffsets)),
    m_currentGroupIndex(std::move(o.m_currentGroupIndex)),
    m_currentGroupMaxIndex(std::move(o.m_currentGroupMaxIndex)),
    m_packageGroupSize(std::move(o.m_packageGroupSize)),
    m_baseOffset(std::move(o.m_baseOffset)),
    m_readingTimstamps(std::move(o.m_readingTimstamps)),
    m_startOffset(std::move(o.m_startOffset))
{
    //leave o in a valid state
    o.m_file.reset(new QFile());
    o.m_stream.reset(new QDataStream(o.m_file.get()));
}

bool SeqLogFileReader::open(const QString &filename)
{
    // lock for atomar opening
    QMutexLocker locker(m_mutex);
    if (m_file->isOpen()) {
        close();
    }

    // try to open the requested file
    m_file->setFileName(filename);
    if (!m_file->open(QIODevice::ReadOnly)) {
        close();
        m_errorMsg = "Opening logfile failed";
        return false;
    }

    // packageGroupSize will be updated in readVersion, if a new Version is detected.
    // This makes sure that m_startOffset = m_baseOffset = m_file->pos(), which is important for .reset()
    m_packageGroupSize = 0;

    // check for known version
    if (!readVersion()) {
        m_file->close();
        return false;
    }

    // initialize variables
    m_currentGroupIndex = 0;
    m_baseOffset = m_file->pos() + sizeof(qint64) * m_packageGroupSize;
    m_startOffset = m_baseOffset;
    m_readingTimstamps = true;
    //assume its a full packet. As we are reading timestamps, thats fine. If we swap to read packets, we update m_currentGroupMaxIndex
    m_currentGroupMaxIndex = m_packageGroupSize;

    return true;
}

void SeqLogFileReader::close()
{
    // cleanup everything and close file
    QMutexLocker locker(m_mutex);
    m_file->close();

    m_errorMsg.clear();
    m_currentGroup.clear();
}

QList<SeqLogFileReader::Memento> SeqLogFileReader::createMementos(const QList<qint64>& offsets, qint32 groupedPackages)
{
    int groupIndex = 0;
    QList<Memento> out;
    for (qint64 offset : offsets) {
        out.append(Memento(offset - sizeof(qint64) * groupIndex + sizeof(qint64) * groupedPackages, groupIndex));
        groupIndex++;
        if (groupIndex >= groupedPackages) {
            groupIndex -= groupedPackages;
        }
    }
    return out;
}

bool SeqLogFileReader::readNextGroup()
{
    QMutexLocker locker(m_mutex);
    qint64 baseOffset = m_file->pos() + sizeof(qint64) * m_packageGroupSize;
    //assume its a full group
    m_currentGroupMaxIndex = m_packageGroupSize;
    for (int i=0; i < m_packageGroupSize; ++i) {
        qint64 time;
        *m_stream >> time;
        //time 0 stands for invalid packets
        if (time == 0) {
            m_currentGroupMaxIndex = i;
            m_file->seek(baseOffset);
            break;
        }
    }
    m_baseOffset = baseOffset;
    // read and decompress group
    m_currentGroup.clear();
    *m_stream >> m_currentGroup;
    m_currentGroup = qUncompress(m_currentGroup);
    if (m_currentGroup.isEmpty()) {
        return false;
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
    m_currentGroupIndex = 0;
    m_readingTimstamps = false;
    return true;
}

//readCurrentGroup reads the group that is referenced by m_baseOffset
bool SeqLogFileReader::readCurrentGroup()
{
    QMutexLocker locker(m_mutex);
    m_file->seek(m_baseOffset - sizeof(qint64) * m_packageGroupSize);
    return readNextGroup();
}

bool SeqLogFileReader::readVersion()
{
    QString name;
    *m_stream >> name;
    m_version = Version0;

    // first version misses prefix
    if (name == "AMUN-RA LOG") {
        int v;
        *m_stream >> v;
        switch (v) {
        case 1:
            m_version = Version1;
            break;

        case 2:
            m_version = Version2;
            *m_stream >> m_packageGroupSize;
            break;

        default:
            m_errorMsg = "File format not supported!";
            return false;
        }
    } else {
        m_file->seek(0);
        // try to read a Status. If the Status is unparsable, it is most likely not a logfile.
        qint64 time = readTimestampVersion0();
        if (time <= 0) {
            m_errorMsg = "File format not supported!";
            return false;
        }
        m_file->seek(0);
    }
    return true;
}

qint64 SeqLogFileReader::readTimestampVersion0()
{
    // read the whole packet and decompress it
    QByteArray packet;
    *m_stream >> packet;
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
    *m_stream >> time;
    *m_stream >> size;
    m_file->seek(m_file->pos() + size);

    // simple sanity check
    if (size == 0) {
        return 0;
    }
    return time;
}

qint64 SeqLogFileReader::readTimestampVersion2()
{
    if (!m_readingTimstamps && !m_currentGroup.isEmpty()) {
        Status s = readStatus(false);
        if (m_currentGroupIndex >= m_currentGroupMaxIndex) {
            m_readingTimstamps = true;
            m_currentGroup.clear();
            m_currentGroupIndex = 0;
            m_baseOffset = m_file->pos() + sizeof(qint64) * m_packageGroupSize;
        }
        return s->time();
    }
    if (!m_readingTimstamps) {
        m_file->seek(m_baseOffset - sizeof(qint64) * (m_packageGroupSize - m_currentGroupIndex));
        m_readingTimstamps = true;
    }
    qint64 time;
    *m_stream >> time;
    m_currentGroupIndex++;

    if (!m_stream->atEnd() && m_currentGroupIndex % m_packageGroupSize == 0) {
        quint32 size;
        *m_stream >> size;
        m_file->seek(m_file->pos() + size);
        m_currentGroupIndex = 0;
        m_baseOffset = m_file->pos() + sizeof(qint64) * m_packageGroupSize;
        m_currentGroup.clear();
    }

    return time;
}

qint64 SeqLogFileReader::readTimestamp()
{
    // lock to prevent intermediate file changes
    QMutexLocker locker(m_mutex);
    switch (m_version) {
        case Version0: return readTimestampVersion0();
        case Version1: return readTimestampVersion1();
        case Version2: return readTimestampVersion2();
        default: qFatal("unknown Version");
    }
}

void SeqLogFileReader::applyMemento(const Memento& mem){
    // handle old versions
    if (m_version != Version2) {
        m_file->seek(mem.baseOffset);
        return;
    }

    if (mem.baseOffset != m_baseOffset) {
        m_baseOffset = mem.baseOffset;
        //we are not in the correct group, so load it
        //readCurrentGroup handles everything as soon as baseOffset is correct
        readCurrentGroup();
    }
    m_currentGroupIndex = mem.groupIndex;
}

Status SeqLogFileReader::readStatus()
{
    return readStatus(true);
}

Status SeqLogFileReader::readStatus(bool loadNextGroup)
{
    // lock to prevent intermediate file changes
    QMutexLocker locker(m_mutex);
    if (m_version == Version2) {
        // if the group is not loaded yet, do so.
        if (m_currentGroup.isEmpty()) {
            // There's no need to check m_readingTimstamps, as readCurrentGroup does not care about that and resets it to false
            if (!readCurrentGroup()) {
                return Status();
            }
        }
        // if the index is out of bounds, we're at the end of the logfile and recognized that during readCurrentGroup.
        // This cannot happen if we're just at the end of a group, as we change groups at the end of readStatus / readTimestamp,
        // to have relieable atEnd()
        if (m_currentGroupIndex >= m_currentGroupMaxIndex) {
            return Status();
        }

        qint32 packetOffset = m_currentGroupOffsets[m_currentGroupIndex];
        m_currentGroupIndex++;
        Status res;
        //check for invalid offset
        if (packetOffset < m_currentGroup.size() && packetOffset >= 0) {
            qint32 packetSize;
            if (m_currentGroupIndex < m_packageGroupSize) {
                packetSize = m_currentGroupOffsets[m_currentGroupIndex] - packetOffset;
            } else {
                packetSize = m_currentGroup.size() - sizeof(qint32) * m_packageGroupSize - packetOffset;
            }

            Status status = Status::createArena();
            if (status->ParseFromArray(m_currentGroup.data() + packetOffset, packetSize)) {
                res = status;
            }
        }

        //load next group if possible
        if (loadNextGroup && m_currentGroupIndex >= m_currentGroupMaxIndex && !m_stream->atEnd()) {
            readNextGroup();
        }
        return res;

    } else {
        // skip timestamp of version one
        if (m_version == Version1) {
            qint64 time;
            *m_stream >> time;
        }

        // read and parse status
        QByteArray packet;
        *m_stream >> packet;
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
