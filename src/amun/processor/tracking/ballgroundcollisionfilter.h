/***************************************************************************
 *   Copyright 2021 Andreas Wendler                                       *
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

#ifndef BALLGROUNDCOLLISIONFILTER_H
#define BALLGROUNDCOLLISIONFILTER_H

#include "abstractballfilter.h"
#include "ballgroundfilter.h"
#include "protobuf/ssl_detection.pb.h"
#include "protobuf/world.pb.h"
#include "protobuf/debug.pb.h"
#include <optional>

class BallGroundCollisionFilter : public AbstractBallFilter
{
public:
    explicit BallGroundCollisionFilter(const VisionFrame &frame, CameraInfo* cameraInfo, const FieldTransform &transform);
    BallGroundCollisionFilter(const BallGroundCollisionFilter& filter, qint32 primaryCamera);

    void processVisionFrame(const VisionFrame& frame) override;
    void updateEmptyFrame(qint64 frameTime, const QVector<RobotInfo> &robots);
    bool acceptDetection(const VisionFrame& frame) override;
    void writeBallState(world::Ball *ball, qint64 time, const QVector<RobotInfo> &robots, qint64 lastCameraFrameTime) override;
    std::size_t chooseBall(const std::vector<VisionFrame> &frames) override;

    bool isFeasiblyInvisible() const { return m_feasiblyInvisible; };

private:
    struct BallOffsetInfo {
        BallOffsetInfo(Eigen::Vector2f projectedBallPos, const RobotInfo &robot, bool forceDribbling, bool intersecting);

        Eigen::Vector2f ballOffset;
        // the position the ball would be in assuming the robot does not dribble (but possibly pushes the ball)
        Eigen::Vector2f pushingBallPos;
        int robotIdentifier;
        bool forceDribbleMode;
        bool isIntersecting;
    };

private:
    void computeBallState(world::Ball *ball, qint64 time, const QVector<RobotInfo> &robots, qint64 lastCameraFrameTime);
    bool checkFeasibleInvisibility(const QVector<RobotInfo> &robots);
    bool handleDribbling(world::Ball *ball, const QVector<RobotInfo> &robots, bool overwriteBallSpeed);
    bool checkBallRobotIntersection(world::Ball *ball, const RobotInfo &robot, bool overwriteBallSpeed,
                                    const Eigen::Vector2f pastPos, const Eigen::Vector2f currentPos);
    void updateDribbling(const QVector<RobotInfo> &robots);
    void updateDribbleAndRotate(const VisionFrame &frame);
    void checkVolleyShot(const VisionFrame &frame);

private:
    GroundFilter m_groundFilter;
    qint64 m_lastUpdateTime = 0;
    // is always at the time of m_lastUpdateTime
    world::Ball m_pastBallState;
    std::optional<BallOffsetInfo> m_dribbleOffset;
    Eigen::Vector2f m_lastReportedBallPos = Eigen::Vector2f(10000000, 0);
    bool m_feasiblyInvisible = false;
    VisionFrame m_lastVisionFrame;
    int m_invisibleFrames = 0;

    // volley shot detection
    bool m_hadRobotIntersection = false;
    float m_lastValidSpeed = 0;

    // dribble and rotate
    qint32 m_inDribblerFrames = 0;
    std::optional<BallOffsetInfo> m_rotateAndDribbleOffset;

    const float DRIBBLING_ROBOT_VISIBILITY_FACTOR = 1.03f;
};

#endif // BALLGROUNDCOLLISIONFILTER_H
