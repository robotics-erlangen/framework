/***************************************************************************
 *   Copyright 2017 Alexander Danzer                                       *
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

#ifndef VISIONLOGREADER_H
#define VISIONLOGREADER_H

#include <QObject>
#include <QString>
#include <QByteArray>
#include <QMap>
#include <QList>

#include <iostream>

#include "messagetype.h"

class VisionLogReader : public QObject
{
    Q_OBJECT
public:
    explicit VisionLogReader(const QString& filename);
    ~VisionLogReader() override;
    QList<std::pair<qint64, VisionLog::MessageType>> indexFile();
    // only call this function if the file has been indexed by indexFile
    std::pair<qint64, VisionLog::MessageType> visionPacketByIndex(int packet, QByteArray& data);
    std::pair<qint64, VisionLog::MessageType> nextVisionPacket(QByteArray& data);
    QString errorMessage() const { return m_errorMessage; }

private:
    std::pair<qint64, VisionLog::MessageType> readPacket(long fileOffset, QByteArray& data);

private:
    std::ifstream* in_stream;
    QMap<int, long> m_index; // packet number to position in the file (just before the packet header)
    QString m_errorMessage;
};

#endif // VISIONLOGREADER_H
