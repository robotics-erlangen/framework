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
    bool acceptDetection(const VisionFrame& frame) override;
    void writeBallState(world::Ball *ball, qint64 time, const QVector<RobotInfo> &robots) override;
    std::size_t chooseBall(const std::vector<VisionFrame> &frames) override;

    bool isFeasiblyInvisible() const { return m_feasiblyInvisible; };

private:
    struct BallOffsetInfo {
        Eigen::Vector2f ballOffset;
        // the position the ball would be in assuming the robot does not dribble (but possibly pushes the ball)
        Eigen::Vector2f pushingBallPos;
        int robotIdentifier;
    };

private:
    void computeBallState(world::Ball *ball, qint64 time, const QVector<RobotInfo> &robots);
    BallOffsetInfo getDribblingInfo(Eigen::Vector2f projectedBallPos, const RobotInfo &robot);
    bool checkFeasibleInvisibility(const QVector<RobotInfo> &robots);

private:
    GroundFilter m_groundFilter;
    GroundFilter m_pastFilter;
    qint64 m_lastVisionTime;
    std::optional<BallOffsetInfo> m_localBallOffset;
    std::optional<BallOffsetInfo> m_insideRobotOffset;
    Eigen::Vector2f m_lastReportedBallPos = Eigen::Vector2f(10000000, 0);
    bool m_feasiblyInvisible = false;
    bool m_resetFilters = false;
    std::optional<VisionFrame> m_lastVisionFrame;
    qint64 m_lastResetTime = 0;
    float m_lastValidSpeed = 0;

    // dribble and rotate
    qint32 m_inDribblerFrames = 0;
    BallOffsetInfo m_lastDribbleOffset;

    const float ROBOT_RADIUS = 0.09f;
    const float ROBOT_HEIGHT = 0.15f;
};

#endif // BALLGROUNDCOLLISIONFILTER_H
