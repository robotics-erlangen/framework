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

#ifndef VISIONLOGWRITER_H
#define VISIONLOGWRITER_H

#include <QObject>
#include <QString>
#include <fstream>

#include "protobuf/ssl_wrapper.pb.h"
#include "protobuf/ssl_referee.pb.h"
#include "messagetype.h"

class VisionLogWriter: public QObject
{
    Q_OBJECT
public:
    explicit VisionLogWriter() = default;
    explicit VisionLogWriter(const QString& filename);

    void addVisionPacket(const SSL_WrapperPacket& frame, qint64 time);
    void addRefereePacket(const SSL_Referee& state, qint64 time);

    void open(const QString &filename);
    bool isOpen() const;

private:
    void writePacket(const QByteArray &data, qint64 time, VisionLog::MessageType type);

private:
    std::ofstream out_stream;
};


#endif //VISIONLOGWRITER_H
