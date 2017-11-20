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
}

LogFileReader * LogFileWriter::makeStatusSource()
{
    m_packetOffsets.erase(m_packetOffsets.begin() + m_writtenPackages, m_packetOffsets.end());
    m_timeStamps.erase(m_timeStamps.begin() + m_writtenPackages, m_timeStamps.end());
    LogFileReader * reader = new LogFileReader(m_timeStamps, m_packetOffsets);
    reader->open(m_file.fileName());
    return reader;
}

bool LogFileWriter::open(const QString &filename)
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

    return true;
}

void LogFileWriter::close()
{
    // cleanup everything and close file
    QMutexLocker locker(m_mutex);
    if (!m_file.isOpen()) {
        return;
    }

    // write the last header part and compressed data
    if (m_packageBufferCount > 0) {
        // packet with time 0 get discarded
        while (m_packageBufferCount > 0) {
            writePackageEntry(0, QByteArray());
        }
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

    QByteArray data;
    data.resize(status->ByteSize());
    if (status->IsInitialized() && status->SerializeToArray(data.data(), data.size())) {
        writePackageEntry(status->time(), data);
        return true;
    }
    return false;
}

void LogFileWriter::writePackageEntry(qint64 time, const QByteArray &data)
{
    m_timeStamps.append(time);
    m_packetOffsets.append(m_file.pos());

    m_packageBufferOffsets[m_packageBufferCount] = m_packageBuffer.size();
    m_packageBuffer.append(data);
    m_packageBufferCount++;
    m_stream << time;
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
