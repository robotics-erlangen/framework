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

#ifndef BALLFILTER_H
#define BALLFILTER_H

#include "filter.h"
#include "kalmanfilter.h"
#include "quadraticleastsquaresfitter.h"
#include "protobuf/world.pb.h"
#include "protobuf/ssl_detection.pb.h"
#include <QList>
#include <QPair>
#include <QMap>

class BallFilter : public Filter
{
public:
    BallFilter(const SSL_DetectionBall &ball, qint64 last_time);
    ~BallFilter();

public:
    void update(qint64 time);
    void get(world::Ball *ball, bool flip);

    void addVisionFrame(qint32 cameraId, const Eigen::Vector3f &cameraPos, const SSL_DetectionBall &ball, qint64 time, const world::Robot &nearestRobot);

    float distanceTo(const SSL_DetectionBall &ball, const Eigen::Vector3f &cameraPos) const;
    static bool isInAOI(const SSL_DetectionBall &ball, bool flip, float x1, float y1, float x2, float y2);

private:
    struct VisionFrame
    {
        VisionFrame(qint32 cameraId, const Eigen::Vector3f &cameraPos,
                    const SSL_DetectionBall &detection, qint64 time, const world::Robot &nearestRobot)
            : cameraId(cameraId), cameraPos(cameraPos), detection(detection), time(time), nearestRobot(nearestRobot) {}
        qint32 cameraId;
        Eigen::Vector3f cameraPos;
        SSL_DetectionBall detection;
        qint64 time;
        world::Robot nearestRobot;
    };
    typedef KalmanFilter<6, 3> Kalman;

    void predict(qint64 time, bool cameraSwitched);
    void applyVisionFrame(const VisionFrame &frame);
    void restartFlyFitting(const world::BallPosition &p);
    void stopFlyFitting();
    void detectNearRobot(const world::Robot &nearestRobot, const world::BallPosition &p);
    Eigen::Vector3f unprojectBall(const world::BallPosition &p, const Eigen::Vector3f &cameraPos);

    QMap<int, world::BallPosition> m_lastRaw;
    world::BallPosition m_lastNearRobotPos;
    world::Robot m_lastNearRobot;
    float m_lastMoveDist;
    QList<world::BallPosition> m_measurements;

    Kalman *m_kalman;
    QList<VisionFrame> m_visionFrames;
    QuadraticLeastSquaresFitter m_flyFitter;
    int m_flyResetCounter;
    float m_flyHeight;
    qint64 m_flyPushTime;
};

#endif // BALLFILTER_H
