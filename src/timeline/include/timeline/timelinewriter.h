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

#ifndef TIMELINEWRITER_H
#define TIMELINEWRITER_H

#include "protobuf/timeline.pb.h"
#include <QObject>
#include <QString>
#include <QDataStream>
#include <QFile>
#include <QList>

class TimelineWriter
{
public:
    explicit TimelineWriter();
    ~TimelineWriter();
    TimelineWriter(const TimelineWriter &) = delete;
    TimelineWriter& operator=(const TimelineWriter &) = delete;

    bool open(const QString &filename);
    void close();
    bool isOpen() const { return m_file.isOpen(); }

    QString filename() const { return m_file.fileName(); }
    bool writeFile(const QList<timeline::Status>& list, const timeline::TimelineInit& init);

private:
    QFile m_file;
    QDataStream m_stream;
};

#endif // TIMELINEWRITER_H
