/***************************************************************************
 *   Copyright 2022 Michael Eischer, Tobias Heineken, Andreas Wendler      *
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
#ifndef LONGLIVINGSTATUSCACHE_H
#define LONGLIVINGSTATUSCACHE_H
#include "protobuf/status.h"
#include "protobuf/command.h"

#include <QObject>
#include <QMap>

class LongLivingStatusCache: public QObject
{
    Q_OBJECT

public:
    LongLivingStatusCache(QObject *parent): QObject(parent) {}
    ~LongLivingStatusCache() {}

signals:
    void sendStatus(const Status& s);

public:
    Status getTeamStatus();
    void publish(bool debug = false);
    void handleStatus(const Status& s);

private:
    Status getVisionGeometryStatus();
    Status getGitStatus();

private:
    robot::Team m_yellowTeam;
    robot::Team m_blueTeam;
    // camera id -> geometry (each geometry only has at most 1 camera calibration)
    QMap<int, Status> m_lastVisionGeometryStatus;
    QMap<amun::GitInfo::Kind, Status> m_lastGitInfos;
    qint64 m_lastTime = 0;
};
#endif
