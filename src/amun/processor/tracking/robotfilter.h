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

#ifndef ROBOTFILTER_H
#define ROBOTFILTER_H

#include "filter.h"
#include "kalmanfilter.h"
#include "protobuf/world.pb.h"
#include "protobuf/robot.pb.h"
#include "protobuf/ssl_detection.pb.h"
#include <QList>
#include <QPair>

class SSL_DetectionRobot;

class RobotFilter : public Filter
{
public:
    RobotFilter(const SSL_DetectionRobot &robot, qint64 last_time);
    ~RobotFilter();

    void update(qint64 time);
    void get(world::Robot *robot, bool flip);

    void addVisionFrame(qint32 cameraId, const SSL_DetectionRobot &robot, qint64 time);
    void addRadioCommand(const robot::Command &radioCommand, qint64 time);

    float distanceTo(const SSL_DetectionRobot &robot) const;
    static bool isInAOI(const SSL_DetectionRobot &robot, bool flip, float x1, float y1, float x2, float y2);

private:
    struct VisionFrame
    {
        VisionFrame(qint32 cameraId, const SSL_DetectionRobot &detection, qint64 time)
            : cameraId(cameraId), detection(detection), time(time) {}
        qint32 cameraId;
        SSL_DetectionRobot detection;
        qint64 time;
    };
    typedef QPair<robot::Command, qint64> RadioCommand;
    typedef KalmanFilter<6, 3> Kalman;

    void resetFutureKalman();
    void predict(qint64 time, bool updateFuture, bool permanentUpdate, bool cameraSwitched);
    void applyVisionFrame(const VisionFrame &frame);
    void applyRobotCommand(const robot::Command &command);
    void invalidateRobotCommand(qint64 time);
    double limitAngle(double angle) const;

    // for debugging
    uint m_id;
    float m_x;
    float m_y;
    float m_phi;
    qint64 m_time;
    QList<world::RobotPosition> m_measurements;

    Kalman *m_kalman;
    // m_lastTime is inherited from Filter
    Kalman *m_futureKalman;
    qint64 m_futureTime;
    QList<VisionFrame> m_visionFrames;
    QList<RadioCommand> m_radioCommands;
};

#endif // ROBOTFILTER_H
