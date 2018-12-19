/***************************************************************************
 *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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

#ifndef SPEEDTRACKER_H
#define SPEEDTRACKER_H

#include "protobuf/command.pb.h"
#include "protobuf/status.h"
#include "protobuf/world.pb.h"
#include <memory>
#include <QMap>
#include <QPair>
#include <QByteArray>

class RobotFilter;
class SSL_DetectionFrame;
class SSL_DetectionRobot;
class FieldTransform;

class SpeedTracker
{
private:
    typedef QMap<uint, QList<RobotFilter*> > RobotMap;

public:
    SpeedTracker();
    ~SpeedTracker();
    SpeedTracker(const SpeedTracker&) = delete;
    SpeedTracker& operator=(const SpeedTracker&) = delete;

public:
    void process(qint64 currentTime);
    Status worldState(qint64 currentTime);

    void setFlip(bool flip);
    void queuePacket(const QByteArray &packet, qint64 time);
    void handleCommand(const amun::CommandTracking &command);
    void reset();

private:
    template<class Filter>
    static void invalidate(QList<Filter*> &filters, const qint64 maxTime, const qint64 maxTimeLast, qint64 currentTime);
    static void invalidateRobots(RobotMap &map, qint64 currentTime);

    QList<RobotFilter *> getBestRobots(qint64 currentTime);

    void trackRobot(RobotMap& robotMap, const SSL_DetectionRobot &robot, qint64 receiveTime, qint32 cameraId, qint64 visionProcessingTime);

    template<class Filter>
    static Filter* bestFilter(QList<Filter*> &filters, int minFrameCount);
private:
    typedef QPair<QByteArray, qint64> Packet;

    qint64 m_systemDelay;
    qint64 m_resetTime;

    bool m_hasVisionData;

    qint64 m_lastUpdateTime;
    QList<Packet> m_visionPackets;

    RobotMap m_robotFilterYellow;
    RobotMap m_robotFilterBlue;
    robot::Team m_blueTeam;
    robot::Team m_yellowTeam;

    std::unique_ptr<FieldTransform> m_fieldTransform;
};

#endif // SPEEDTRACKER_H
