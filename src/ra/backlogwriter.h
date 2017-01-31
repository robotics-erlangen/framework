/***************************************************************************
 *   Copyright 2017 Andreas Wendler                                        *
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

#ifndef BACKLOGWRITER_H
#define BACKLOGWRITER_H

#include "protobuf/status.h"
#include <QContiguousCache>
#include <QObject>

class QString;
class QByteArray;

class BacklogWriter : public QObject
{
    Q_OBJECT
public:
    BacklogWriter();

signals:
    void enableBacklogSave(bool enabled);

private slots:
    // these slots must be called in the same thread
    void clear();
    void handleStatus(const Status &status);
    void saveBacklog(QString filename, Status teamStatus);

private:
    Status packetFromByteArray(QByteArray packetData);

private:
    QContiguousCache<QByteArray> m_packets;

    // with both strategys running around 70 seconds
    const int BACKLOG_SIZE = 40000;
};

#endif // BACKLOGWRITER_H
