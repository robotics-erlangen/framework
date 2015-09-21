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
    m_stream << (int) 1; // log file version

    return true;
}

void LogFileWriter::close()
{
    // cleanup everything and close file
    QMutexLocker locker(m_mutex);
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
    if (status->SerializeToArray(data.data(), data.size())) {
        m_stream << (qint64) status->time();
        m_stream << qCompress(data);
        return true;
    }
    return false;
}
