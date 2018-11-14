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

#include "timelinereader.h"

TimelineReader::TimelineReader():
    m_file(),
    m_stream(&m_file)
{
    // ensure compatibility across qt versions
    m_stream.setVersion(QDataStream::Qt_4_6);
}

TimelineReader::~TimelineReader()
{
    close();
}

bool TimelineReader::open(const QString& filename)
{
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

    QString name;
    m_stream >> name;

    if (name != "TIMELINE") {
        m_file.seek(0);
        m_errorMsg = "Invalid format";
        return false;
    }

    qint32 version;
    m_stream >> version;

    switch (version) {
        case 0:
            break;
        default:
            m_errorMsg = "File format not supported!";
            return false;
    }
    return true;
}

void TimelineReader::close()
{
    if (!m_file.isOpen()) {
        return;
    }
    m_file.close();
}

static bool deserializeMessage(google::protobuf::Message& message, QDataStream& stream)
{
    // read and parse status
    QByteArray packet;
    stream >> packet;
    packet = qUncompress(packet);
    if (!packet.isEmpty()) {
        if (message.ParseFromArray(packet.data(), packet.size())) {
            return true;
        }
    }
    return false;
}

bool TimelineReader::readFile(QList<timeline::Status>& list, timeline::TimelineInit& init)
{
    if (!isOpen()) {
        return false;
    }
    if (!deserializeMessage(init, m_stream)) {
        close();
        return false;
    }
    while (!atEnd()) {
        timeline::Status s;
        if (!deserializeMessage(s, m_stream)) {
            close();
            return false;
        }
        list.append(s);
    }
    return true;
}
