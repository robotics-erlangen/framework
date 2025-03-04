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

#ifndef TRACKER_H
#define TRACKER_H

#include "core/areaofinterest.h"
#include "protobuf/command.pb.h"
#include "protobuf/debug.pb.h"
#include "protobuf/ssl_detection.pb.h"
#include "protobuf/world.pb.h"
#include <QMap>
#include <QPair>
#include <QByteArray>
#include <QObject>

class BallTracker;
class RobotFilter;
class SSL_DetectionBall;
class SSL_DetectionFrame;
class SSL_DetectionRobot;
class SSL_GeometryFieldSize;
class SSL_FieldCircularArc;
class SSL_FieldLineSegment;
class SSL_GeometryCameraCalibration;
class WorldParameters;
struct CameraInfo;

class Tracker : public QObject
{
    Q_OBJECT

private:
    typedef QMap<uint, QList<RobotFilter*> > RobotMap;
    struct Packet {
        Packet(const SSL_DetectionFrame &detection, qint64 time) : detection(detection), time(time) {}
        SSL_DetectionFrame detection;
        qint64 time;
    };

public:
    Tracker(bool robotsOnly, bool isSpeedTracker, WorldParameters *m_worldParameters);
    ~Tracker();
    Tracker(const Tracker&) = delete;
    Tracker& operator=(const Tracker&) = delete;

public:
    void process(qint64 currentTime);
    void worldState(world::State *worldState, qint64 currentTime, bool resetRaw);
    bool injectDebugValues(qint64 currentTime, amun::DebugValues *debug);
    void clearDebugValues();

    void queuePacket(const SSL_DetectionFrame &detection, qint64 time);
    void queueRadioCommands(const QList<robot::RadioCommand> &radio_commands, qint64 time);
    void handleCommand(const amun::CommandTracking &command, qint64 time);
    void reset();
    void updateTeam(const robot::Team &team, bool isBlue);

public slots:
    void setBallModel(const world::BallModel &ballModel) { m_ballModel.CopyFrom(ballModel); }
    void updateCamera(const SSL_GeometryCameraCalibration &c, const QString &sender);

private:
    void invalidateRobotFilter(QList<RobotFilter*> &filters, const qint64 maxTime, const qint64 maxTimeLast, qint64 currentTime);
    void invalidateBall(qint64 currentTime);
    void invalidateRobots(RobotMap &map, qint64 currentTime);

    QList<RobotFilter*> getBestRobots(qint64 currentTime, int desiredCamera);
    void trackBallDetections(const SSL_DetectionFrame &frame, qint64 sourceTime, qint64 visionProcessingDelay);
    void trackRobot(RobotMap& robotMap, const SSL_DetectionRobot &robot, qint64 sourceTime, qint32 cameraId, qint64 visionProcessingDelay,
                    bool teamIsYellow);

    BallTracker* bestBallFilter();
    void prioritizeBallFilters();

private:
    typedef QPair<robot::RadioCommand, qint64> RadioCommand;
    CameraInfo * const m_cameraInfo;

    qint64 m_visionTransmissionDelay;
    qint64 m_timeSinceLastReset;
    // used to delay the reset, to avoid accepting invalid vision frames that were sent before reset was triggered
    qint64 m_timeToReset = std::numeric_limits<qint64>::max();

    world::BallModel m_ballModel;

    QMap<qint32, qint64> m_lastUpdateTime; // indexed by camera id
    QList<Packet> m_visionPackets;

    /** The last time a slow vision frame was received. Timestamp on a local clock */
    qint64 m_lastSlowVisionFrame;
    /** The number of slow vision frames received in the recent past */
    int m_numSlowVisionFrames;

    QList<BallTracker*> m_ballFilter;
    BallTracker* m_currentBallFilter;

    RobotMap m_robotFilterYellow;
    RobotMap m_robotFilterBlue;

    bool m_aoiEnabled;
    AreaOfInterest m_aoi;

    QList<QString> m_errorMessages;
    WorldParameters *m_worldParameters = nullptr;

    // if possible, select robots from this camera
    int m_desiredRobotCamera = -1;

    // differences between tracker and speedtracker
    const bool m_robotsOnly;
    const qint64 m_resetTimeout;
    // Maximum tracking time for last robot
    const qint64 m_maxTimeLast;
};

#endif // TRACKER_H
