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
    m_packets(SeqLogFileReader::createMementos(offsets, groupedPackages)),
    m_timings(timings)
{
}

LogFileReader::~LogFileReader()
{
    close();
}

LogFileReader::LogFileReader(SeqLogFileReader&& reader) : m_reader(std::move(reader))
{
    m_reader.reset();
    m_headerCorrect = true;
    if (m_reader.isOpen() && !indexFile()) {
        m_reader.close();
    }
}

QPair<std::shared_ptr<StatusSource>, QString> LogFileReader::tryOpen(QString filename)
{
    LogFileReader *reader = new LogFileReader();
    if (reader->open(filename)) {
        return QPair<std::shared_ptr<StatusSource>, QString>(std::shared_ptr<StatusSource>(reader), "");
    }
    QString errorMessage = reader->errorMsg();
    bool headerCorrect = reader->m_headerCorrect;
    delete reader;
    if(headerCorrect) {
        return QPair<std::shared_ptr<StatusSource>, QString>(nullptr, errorMessage);
    } else {
        return QPair<std::shared_ptr<StatusSource>, QString>(nullptr, "");
    }
}

bool LogFileReader::open(const QString &filename)
{
    m_headerCorrect = false;
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
    qint64 lastTime = 0;
    bool atEnd = false;
    while (!m_reader.atEnd()) {
        SeqLogFileReader::Memento mem = m_reader.createMemento();

        qint64 time = m_reader.readTimestamp();
        // a timestamp of 0 indicates a invalid packet
        if (time != 0) {
            if (atEnd) {
                m_errorMsg = "Packet with timestamp zero in the middle of the log found!";
                return false;
            }
            // timestamps that are too far apart mean that the logfile is corrupt
            if (lastTime != 0 && (time - lastTime < 0 || time - lastTime > 200000000000LL)) {
                m_errorMsg = "Invalid or corrupt logfile %1, %2";
                m_errorMsg = m_errorMsg.arg(time).arg(lastTime);
                return false;
            }

            // remember the start of the current frame
            m_packets.append(mem);
            m_timings.append(time);
        } else {
            atEnd = true;
        }
        lastTime = time;
    }

    if (m_packets.size() == 0) {
        m_errorMsg = "Invalid or empty logfile";
        return false;
    }

    return true;
}

Status LogFileReader::readStatus(int packetNum)
{
    if (packetNum < 0 || packetNum >= m_packets.size()) {
        return Status();
    }
    //seek to the requested packetgroup
    m_reader.applyMemento(m_packets.at(packetNum));
    return m_reader.readStatus();
}

void LogFileReader::readPackets(int startPacket, int count)
{
    // read requested packets
    for (int i = startPacket; i < startPacket + count; ++i) {
        emit gotStatus(i, readStatus(i));
    }
}

QString LogFileReader::logUID()
{
    SeqLogFileReader::Memento mem = m_reader.createMemento();
    m_reader.reset();
    Status status = m_reader.readStatus();
    QString out = "";
    if (!status->has_log_id()) {
        out = "This log does not contain a log UID. To create one, just use the Logcutter on this log.";
    } else {
        auto id = status->log_id();
        const char* sep = "";
        for (const auto& part : id.parts()) {
            out += sep;
            out += QString::fromStdString(part.hash());
            if (part.flags() != 0) {
                out += ":";
                out += QString::number(part.flags(), 16);
            }
            sep = "+";
        }
    }
    m_reader.applyMemento(mem);
    int sz = out.size();
    for (int i=50; i < sz; i += 50) {
        out.insert(i, "\n");
    }
    return out;
}
