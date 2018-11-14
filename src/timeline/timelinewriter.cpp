/***************************************************************************
 *   Copyright 2018 Tobias Heineken                                        *
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

#include "timelinewriter.h"

TimelineWriter::TimelineWriter():
    m_file(),
    m_stream(&m_file)
{
    // ensure compatibility across qt versions
    m_stream.setVersion(QDataStream::Qt_4_6);
}

TimelineWriter::~TimelineWriter()
{
    close();
}

bool TimelineWriter::open(const QString& filename)
{
    m_file.setFileName(filename);

    if (!m_file.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
        close();
        return false;
    }
    // write log header
    m_stream << QString("TIMELINE");
    m_stream << (qint32) 0; // log file version
    return true;
}

void TimelineWriter::close()
{
    if (!m_file.isOpen()) {
        return;
    }
    m_file.close();
}

static bool serializeMessage(const google::protobuf::Message& message, QDataStream& stream)
{
    QByteArray data;
    data.resize(message.ByteSize());
    if (!message.IsInitialized() || !message.SerializeToArray(data.data(), data.size())) {
        return false;
    }
    stream << qCompress(data);
    return true;
}

bool TimelineWriter::writeFile(const QList<timeline::Status>& list, const timeline::TimelineInit& init)
{
    if (!isOpen()) {
        return false;
    }
    if (!serializeMessage(init, m_stream)) {
        return false;
    }
    for (const auto& event: list) {
        if (!serializeMessage(event, m_stream)) {
            return false;
        }
    }
    return true;
}
