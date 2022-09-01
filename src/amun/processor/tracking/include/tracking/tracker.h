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

#include "protobuf/command.pb.h"
#include "protobuf/status.h"
#include "protobuf/world.pb.h"
#include <QMap>
#include <QPair>
#include <QByteArray>

class BallTracker;
class RobotFilter;
class SSL_DetectionBall;
class SSL_DetectionFrame;
class SSL_DetectionRobot;
class SSL_GeometryFieldSize;
class SSL_FieldCircularArc;
class SSL_FieldLineSegment;
class SSL_GeometryCameraCalibration;
class FieldTransform;
struct CameraInfo;

class Tracker
{
private:
    typedef QMap<uint, QList<RobotFilter*> > RobotMap;
    struct Packet {
        Packet(const QByteArray &data, qint64 time, QString sender) : data(data), time(time), sender(sender) {}
        QByteArray data;
        qint64 time;
        QString sender;
    };

public:
    Tracker(bool robotsOnly, bool isSpeedTracker);
    ~Tracker();
    Tracker(const Tracker&) = delete;
    Tracker& operator=(const Tracker&) = delete;

public:
    void process(qint64 currentTime);
    Status worldState(qint64 currentTime, bool resetRaw);

    void setFlip(bool flip);
    void queuePacket(const QByteArray &packet, qint64 time, QString sender);
    void queueRadioCommands(const QList<robot::RadioCommand> &radio_commands, qint64 time);
    void handleCommand(const amun::CommandTracking &command, qint64 time);
    void reset();
    void finishProcessing(); // has to be called after all calls to worldState for one frame
    void setGeometryUpdated() { m_geometryUpdated = true; }
    void setBallModel(const world::BallModel &ballModel) { m_ballModel.CopyFrom(ballModel); }

private:
    void updateCamera(const SSL_GeometryCameraCalibration &c, QString sender);

    void invalidateRobotFilter(QList<RobotFilter*> &filters, const qint64 maxTime, const qint64 maxTimeLast, qint64 currentTime);
    void invalidateBall(qint64 currentTime);
    void invalidateRobots(RobotMap &map, qint64 currentTime);

    QList<RobotFilter*> getBestRobots(qint64 currentTime, int desiredCamera);
    void trackBallDetections(const SSL_DetectionFrame &frame, qint64 receiveTime, qint64 visionProcessingDelay);
    void trackRobot(RobotMap& robotMap, const SSL_DetectionRobot &robot, qint64 receiveTime, qint32 cameraId, qint64 visionProcessingDelay,
                    bool teamIsYellow);

    BallTracker* bestBallFilter();
    void prioritizeBallFilters();

private:
    typedef QPair<robot::RadioCommand, qint64> RadioCommand;
    CameraInfo * const m_cameraInfo;

    qint64 m_systemDelay;
    qint64 m_timeSinceLastReset;
    // used to delay the reset, to avoid accepting invalid vision frames that were sent before reset was triggered
    qint64 m_timeToReset = std::numeric_limits<qint64>::max();

    world::Geometry m_geometry;
    world::Geometry m_virtualFieldGeometry;
    bool m_geometryUpdated;
    bool m_hasVisionData;
    bool m_virtualFieldEnabled;
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
    float m_aoi_x1;
    float m_aoi_y1;
    float m_aoi_x2;
    float m_aoi_y2;

    QList<QString> m_errorMessages;
    QList<std::pair<SSL_WrapperPacket, qint64>> m_detectionWrappers;
    std::unique_ptr<FieldTransform> m_fieldTransform;

    // if possible, select robots from this camera
    int m_desiredRobotCamera = -1;

    // differences between tracker and speedtracker
    const bool m_robotsOnly;
    const qint64 m_resetTimeout;
    // Maximum tracking time for last robot
    const qint64 m_maxTimeLast;
};

#endif // TRACKER_H
