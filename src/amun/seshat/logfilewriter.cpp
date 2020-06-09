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

#include "logfilewriter.h"
#include <QByteArray>
#include <QMutexLocker>
#include <functional>

#include "logfilereader.h"

LogFileWriter::LogFileWriter() :
    QObject(), m_stream(&m_file)
{
    m_mutex = new QMutex(QMutex::Recursive);
    // ensure compatibility across qt versions
    m_stream.setVersion(QDataStream::Qt_4_6);
}

LogFileWriter::~LogFileWriter()
{
    close();

    m_packageBuffer.clear();
    delete m_mutex;
}

std::shared_ptr<StatusSource> LogFileWriter::makeStatusSource()
{
    auto packetOffsets(m_packetOffsets);
    auto timeStamps(m_timeStamps);
    packetOffsets.erase(packetOffsets.begin() + m_writtenPackages, packetOffsets.end());
    timeStamps.erase(timeStamps.begin() + m_writtenPackages, timeStamps.end());
    LogFileReader * reader = new LogFileReader(timeStamps, packetOffsets, GROUPED_PACKAGES);
    reader->open(m_file.fileName());
    return std::shared_ptr<StatusSource>(reader);
}

static bool serializeStatus(std::function<void(LogFileWriter*, qint64, QByteArray&&)> lambda, const Status &status, LogFileWriter* self)
{
    QByteArray data;
    data.resize(status->ByteSize());
    if (status->IsInitialized() && status->SerializeToArray(data.data(), data.size())) {
        lambda(self, status->time(), std::move(data));
        return true;
    }
    return false;
}

bool LogFileWriter::open(const QString &filename, bool ignoreHashing)
{
    // lock for atomar opening
    QMutexLocker locker(m_mutex);
    close();

    m_file.setFileName(filename);
    if (!m_file.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
        close();
        return false;
    }

    // write log header
    m_stream << QString("AMUN-RA LOG");
    m_stream << (int) 2; // log file version
    m_stream << GROUPED_PACKAGES;

    // initialize variables
    m_packageBufferCount = 0;
    m_packageBuffer.clear();
    m_writtenPackages = 0;
    m_hasher.clear();
    m_hashState = HashingState::UNINITIALIZED;
    m_hashStatus->Clear();

    if (ignoreHashing) {
        m_hashState = HashingState::HAS_HASHING;
    }

    return true;
}

void LogFileWriter::close()
{
    // cleanup everything and close file
    QMutexLocker locker(m_mutex);
    if (!m_file.isOpen()) {
        return;
    }
    if (m_hashState == HashingState::NEEDS_HASHING) {
        //first: fill m_packageTimeStamps
        while (m_packageBufferCount < LogFileHasher::HASHED_PACKAGES - 2) {
            writePackageEntry(0, QByteArray());
        }
        //second: insert hash
        m_hashStatus->mutable_log_id()->add_parts()->set_hash(m_hasher.takeResult());
        serializeStatus(&LogFileWriter::addFirstPackage, m_hashStatus, this);
        m_hashState = HashingState::HAS_HASHING;
        //third: continue as usual
    }

    // write the last header part and compressed data
    while (m_packageBufferCount > 0) {
        // packet with time 0 get discarded
        writePackageEntry(0, QByteArray());
    }
    m_file.close();
}

bool LogFileWriter::writeStatus(const Status &status)
{
    // lock to prevent intermediate file changes
    QMutexLocker locker(m_mutex);
    if (!isOpen()) {
        return false;
    }

    bool serialize = true;
    if (m_hashState == HashingState::UNINITIALIZED && status->has_log_id()) {
        m_hashState = HashingState::HAS_HASHING;
        m_hashStatus->mutable_log_id()->CopyFrom(status->log_id());
    } else if (m_hashState == HashingState::UNINITIALIZED) {
        m_hashStatus->CopyFrom(*status);
        serialize = false;
        m_hashState = HashingState::NEEDS_HASHING;
    }

    if (m_hashState == HashingState::NEEDS_HASHING) {
        m_hasher.add(status);
    }

    if (m_hashState == HashingState::NEEDS_HASHING && m_hasher.isFinished()) {
        m_hashStatus->mutable_log_id()->add_parts()->set_hash(m_hasher.takeResult());
        serializeStatus(&LogFileWriter::addFirstPackage, m_hashStatus, this);
        m_hashState = HashingState::HAS_HASHING;
        m_hasher.clear();
    }

    if (serialize) {
        return serializeStatus(&LogFileWriter::writePackageEntry, status, this);
    }
    return true;
}

void LogFileWriter::writePackageEntry(qint64 time, QByteArray&& data)
{
    m_timeStamps.append(time);

    m_packageBufferOffsets[m_packageBufferCount] = m_packageBuffer.size();
    m_packageBuffer.append(data);
    if ( m_hashState != HashingState::NEEDS_HASHING) {
        m_packetOffsets.append(m_file.pos());
        m_stream << time;
    } else {
        m_packageTimeStamps[m_packageBufferCount] = time;
    }
    m_packageBufferCount++;
    if (m_packageBufferCount == GROUPED_PACKAGES) {
        QDataStream ds(&m_packageBuffer, QIODevice::WriteOnly | QIODevice::Append);
        ds.setVersion(QDataStream::Qt_4_6);
        for (qint32 offset: m_packageBufferOffsets) {
            ds << offset;
        }
        m_stream << qCompress(m_packageBuffer);
        m_packageBufferCount = 0;
        m_packageBuffer.clear();
        m_writtenPackages += GROUPED_PACKAGES;
    }
}

void LogFileWriter::addFirstPackage(qint64 time, QByteArray&& data)
{
    m_timeStamps.prepend(time);
    m_packetOffsets.append(m_file.pos());
    m_stream << time;

    for (qint64 oldTime : m_packageTimeStamps) {
        m_packetOffsets.append(m_file.pos());
        m_stream << oldTime;
    }

    qint32 oldOffset = m_packageBufferOffsets[0];
    qint32 firstLength = data.size();
    data.append(m_packageBuffer);
    m_packageBuffer.swap(data);
    m_packageBufferOffsets[0] = 0;

    m_packageBufferCount++;
    for (int i = 1; i < m_packageBufferCount; ++i) {
        qint32 newOffset = oldOffset + firstLength;
        oldOffset = m_packageBufferOffsets[i];
        m_packageBufferOffsets[i] = newOffset;
    }

    if (m_packageBufferCount == GROUPED_PACKAGES) {
        qFatal("Some strange thing happend in addFirstPackage");
    }
}
