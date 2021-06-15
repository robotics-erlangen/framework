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
#include "ballgroundcollisionfilter.h"
#include <algorithm>
#include <QDebug>

BallGroundCollisionFilter::BallGroundCollisionFilter(const VisionFrame &frame, CameraInfo* cameraInfo) :
    AbstractBallFilter(frame, cameraInfo),
    m_groundFilter(frame, cameraInfo),
    m_pastFilter(frame, cameraInfo)
{

}

BallGroundCollisionFilter::BallGroundCollisionFilter(const BallGroundCollisionFilter& filter, qint32 primaryCamera) :
    AbstractBallFilter(filter, primaryCamera),
    m_groundFilter(filter.m_groundFilter, primaryCamera),
    m_pastFilter(filter.m_pastFilter, primaryCamera)
{

}

void BallGroundCollisionFilter::processVisionFrame(const VisionFrame& frame)
{
    m_lastVisionTime = frame.time;
    m_groundFilter.processVisionFrame(frame);
    m_pastFilter.processVisionFrame(frame);
}

bool BallGroundCollisionFilter::acceptDetection(const VisionFrame& frame)
{
    return m_groundFilter.acceptDetection(frame);
}

static auto intersectLineCircle(Eigen::Vector2f offset, Eigen::Vector2f dir, Eigen::Vector2f center, float radius)
    -> std::vector<std::pair<Eigen::Vector2f, float>>
{
    dir = dir.normalized();
    const Eigen::Vector2f constPart = offset - center;
    // |offset + lambda*dir - center| = radius
    // l^2 VxV + l 2(CxV) + CxC == R^2

    const float a = dir.dot(dir);
    const float b = 2 * dir.dot(constPart);
    const float c = constPart.dot(constPart) - radius * radius;

    const float det = b * b - 4 * a * c;

    if (det < 0) {
        return {};
    }

    if (det < 0.00001) {
        const float lambda1 = (-b) / (2 * a);
        return {{offset + dir * lambda1, lambda1}};
    }

    const float lambda1 = (-b + std::sqrt(det)) / (2 * a);
    const float lambda2 = (-b - std::sqrt(det)) / (2 * a);
    const Eigen::Vector2f point1 = offset + dir * lambda1;
    const Eigen::Vector2f point2 = offset + dir * lambda2;
    return {{point1, lambda1}, {point2, lambda2}};
}

static std::optional<Eigen::Vector2f> intersectLineSegmentCircle(Eigen::Vector2f p1, Eigen::Vector2f p2, Eigen::Vector2f center, float radius)
{
    const float dist = (p2 - p1).norm();
    auto intersections = intersectLineCircle(p1, p2 - p1, center, radius);
    if (intersections.size() == 0) {
        return {};
    }
    if (intersections.size() == 1) {
        if (intersections[0].second >= 0 && intersections[0].second <= dist) {
            return intersections[0].first;
        } else {
            return {};
        }
    }
    // TODO: is this complexity necessary?
    if (intersections[0].second > intersections[1].second) {
        std::swap(intersections[0], intersections[1]);
    }
    for (const auto &intersection : intersections) {
        if (intersection.second >= 0 && intersection.second <= dist) {
            return intersection.first;
        }
    }
    return {};
}

static Eigen::Vector2f perpendicular(const Eigen::Vector2f dir)
{
    return Eigen::Vector2f(dir.y(), -dir.x());
}

// return value is the lambda of the intersection point p, p = pos1 + dir1 * returnvalue
// and the same for the second line
std::optional<std::pair<float, float>> intersectLineLine(Eigen::Vector2f pos1, Eigen::Vector2f dir1, Eigen::Vector2f pos2, Eigen::Vector2f dir2)
{
    // check whether the directions are collinear
    if (std::abs(perpendicular(dir1).dot(dir2)) / (dir1.norm() * dir2.norm()) < 0.0001) {
        return {};
    }

    const Eigen::Vector2f normal1 = perpendicular(dir1);
    const Eigen::Vector2f normal2 = perpendicular(dir2);
    const Eigen::Vector2f diff = pos2 - pos1;
    const float t1 = normal2.dot(diff) / normal2.dot(dir1);
    const float t2 = -normal1.dot(diff) / normal1.dot(dir2);

    return {{t1, t2}};
}

// TODO: ball radius
static std::optional<Eigen::Vector2f> intersectLineSegmentRobot(Eigen::Vector2f p1, Eigen::Vector2f p2, const RobotInfo &robot, float robotRadius)
{
    const float DRIBBLER_WIDTH = 0.07f;

    const auto toDribbler = (robot.dribblerPos - robot.robotPos).normalized();
    const auto dribblerSideways = perpendicular(toDribbler);
    const auto dribblerIntersection = intersectLineLine(robot.dribblerPos, dribblerSideways, p1, p2 - p1);
    std::optional<Eigen::Vector2f> dribblerIntersectionPos;
    if (dribblerIntersection.has_value() && std::abs(dribblerIntersection->first) <= DRIBBLER_WIDTH / 2.0f &&
            dribblerIntersection->second >= 0 && dribblerIntersection->second <= 1) {
        dribblerIntersectionPos = robot.dribblerPos + dribblerSideways * dribblerIntersection->first;
        if ((p1 - robot.dribblerPos).dot(toDribbler) >= 0) {
            // the line segment comes from in front of the robot, the line intersection is the correct one
            return dribblerIntersectionPos;
        }
    }
    auto hullIntersection = intersectLineSegmentCircle(p1, p2, robot.robotPos, robotRadius);
    if (dribblerIntersectionPos && hullIntersection) {
        // select the closer of the two intersections
        if ((*hullIntersection - p1).norm() < (*dribblerIntersectionPos - p1).norm()) {
            return hullIntersection;
        } else {
            return dribblerIntersectionPos;
        }
    }
    return hullIntersection;
}

static bool isInsideRobot(Eigen::Vector2f pos, const RobotInfo &robot, float robotRadius)
{
    if ((pos - robot.robotPos).norm() > robotRadius) {
        return false;
    }
    const auto toDribbler = (robot.dribblerPos - robot.robotPos).normalized();
    return (pos - robot.dribblerPos).dot(toDribbler) <= 0;
}

void BallGroundCollisionFilter::writeBallState(world::Ball *ball, qint64 time, const QVector<RobotInfo> &robots)
{
    const qint64 RESET_SPEED_TIME = 150000000; // 150 ms

    // TODO: test sides flipped
    m_groundFilter.writeBallState(ball, time, robots);

    world::Ball pastState;
    m_pastFilter.writeBallState(&pastState, m_lastVisionTime + 1, robots);

    // remove this once all issues are fixed
    return;

    if (time - m_lastVisionTime > RESET_SPEED_TIME && m_localBallOffset) {
        const int identifier = m_localBallOffset->robotIdentifier;
        auto robot = std::find_if(robots.begin(), robots.end(), [identifier](const RobotInfo &robot) { return robot.identifier == identifier; });
        if (robot != robots.end()) {
            const auto toDribbler = (robot->dribblerPos - robot->robotPos).normalized();
            const Eigen::Vector2f relativeBallPos = m_localBallOffset->ballOffset.x() * toDribbler +
                                                    m_localBallOffset->ballOffset.y() * perpendicular(toDribbler);
            const auto ballPos = robot->robotPos + relativeBallPos;
            ball->set_p_x(ballPos.x());
            ball->set_p_y(ballPos.y());
            ball->set_v_x(robot->speed.x());
            ball->set_v_y(robot->speed.y());
            return;
        }
    }
    if (time - m_lastVisionTime <= RESET_SPEED_TIME) {
        m_localBallOffset.reset();
    }

    const Eigen::Vector2f pastPos{pastState.p_x(), pastState.p_y()};
    Eigen::Vector2f currentPos{ball->p_x(), ball->p_y()};
    Eigen::Vector2f currentSpeed;
    bool hasIntersection = false;
    for (const RobotInfo &robot : robots) {

        // TODO: robot radius
        const float ROBOT_RADIUS = 0.09f;
        if (isInsideRobot(pastPos, robot, ROBOT_RADIUS)) {
            const Eigen::Vector2f pastSpeed{pastState.v_x(), pastState.v_y()};
            const Eigen::Vector2f relativeSpeed = pastSpeed - robot.speed;
            const Eigen::Vector2f projectDir = relativeSpeed.isZero(0.001f) ? Eigen::Vector2f(pastPos - robot.robotPos) : -relativeSpeed;
            const auto closeLineIntersection = intersectLineSegmentRobot(pastPos, projectDir * 1000.0f, robot, ROBOT_RADIUS);
            const auto farLineIntersection = intersectLineSegmentRobot(pastPos, -projectDir * 1000.0f, robot, ROBOT_RADIUS);
            if (closeLineIntersection && farLineIntersection) {
                const float closeDist = (*closeLineIntersection - pastPos).norm();
                const float farDist = (*farLineIntersection - pastPos).norm();
                Eigen::Vector2f projected;
                if (closeDist < farDist * 2) {
                    projected = *closeLineIntersection;
                } else {
                    projected = *farLineIntersection;
                }
                ball->set_p_x(projected.x());
                ball->set_p_y(projected.y());
                if (time - m_lastVisionTime > RESET_SPEED_TIME) {
                    ball->set_v_x(robot.speed.x());
                    ball->set_v_y(robot.speed.y());
                }

                BallOffsetInfo offset;
                offset.robotIdentifier = robot.identifier;
                const auto toDribbler = (robot.dribblerPos - robot.robotPos).normalized();
                offset.ballOffset = Eigen::Vector2f{(projected - robot.robotPos).dot(toDribbler),
                                                    (projected - robot.robotPos).dot(perpendicular(toDribbler))};
                m_localBallOffset = offset;

                debugLine("ball line intersection", pastPos.x(), pastPos.y(), projected.x(), projected.y(), 2);
                return;
            }
        }

        auto intersection = intersectLineSegmentRobot(pastPos, currentPos, robot, ROBOT_RADIUS);
        if (intersection) {
            currentPos = *intersection;
            currentSpeed = robot.speed;
            hasIntersection = true;
            debugLine("ball line intersection", pastPos.x(), pastPos.y(), currentPos.x(), currentPos.y(), 1);
        }
    }

    if (hasIntersection) {
        ball->set_p_x(currentPos.x());
        ball->set_p_y(currentPos.y());
        // TODO: fully enable these again
        if (time - m_lastVisionTime > RESET_SPEED_TIME) {
            ball->set_v_x(currentSpeed.x());
            ball->set_v_y(currentSpeed.y());
        }
    }

    debugCircle("past ball state", pastState.p_x(), pastState.p_y(), 0.015);
}

std::size_t BallGroundCollisionFilter::chooseBall(const std::vector<VisionFrame> &frames)
{
    return m_groundFilter.chooseBall(frames);
}
