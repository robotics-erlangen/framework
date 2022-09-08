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

const float DRIBBLER_WIDTH = 0.07f;
const float BALL_RADIUS = 0.0215f;
const float ROBOT_RADIUS = 0.09f;
const float ROBOT_HEIGHT = 0.15f;

BallGroundCollisionFilter::BallGroundCollisionFilter(const VisionFrame &frame, CameraInfo* cameraInfo, const FieldTransform &transform, const world::BallModel &ballModel) :
    AbstractBallFilter(frame, cameraInfo, transform, ballModel),
    m_groundFilter(frame, cameraInfo, transform, ballModel),
    m_lastVisionFrame(frame)
{ }

BallGroundCollisionFilter::BallGroundCollisionFilter(const BallGroundCollisionFilter& filter, qint32 primaryCamera) :
    AbstractBallFilter(filter, primaryCamera),
    m_groundFilter(filter.m_groundFilter, primaryCamera),
    m_lastUpdateTime(filter.m_lastUpdateTime),
    m_pastBallState(filter.m_pastBallState),
    m_dribbleOffset(filter.m_dribbleOffset),
    m_lastReportedBallPos(filter.m_lastReportedBallPos),
    m_feasiblyInvisible(filter.m_feasiblyInvisible),
    m_lastVisionFrame(filter.m_lastVisionFrame),
    m_invisibleFrames(filter.m_invisibleFrames),
    m_hadRobotIntersection(filter.m_hadRobotIntersection),
    m_lastValidSpeed(filter.m_lastValidSpeed),
    m_inDribblerFrames(filter.m_inDribblerFrames),
    m_rotateAndDribbleOffset(filter.m_rotateAndDribbleOffset),
    m_maxSpeed(filter.m_maxSpeed),
    m_framesDecelerating(filter.m_framesDecelerating),
    m_ballWasNearRobot(filter.m_ballWasNearRobot),
    m_highestSpeed(filter.m_highestSpeed)
{ }

static Eigen::Vector2f perpendicular(const Eigen::Vector2f dir)
{
    return Eigen::Vector2f(dir.y(), -dir.x());
}

void BallGroundCollisionFilter::updateMaxSpeed(const VisionFrame &frame, float lastSpeedLength, Eigen::Vector2f lastPos)
{
    // this code was taken from base/ball, with improvements
    const float MAXSPEED_MIN_ROBOT_DIST = 0.1f;
    const int NUM_DECELERATION_FRAMES = 3;

    const Eigen::Vector2f speed{m_pastBallState.v_x(), m_pastBallState.v_y()};
    const float speedLength = speed.norm();
    const Eigen::Vector2f pos{m_pastBallState.p_x(), m_pastBallState.p_y()};

    if (speed.norm() - lastSpeedLength > 0.2f) {
        m_framesDecelerating = 0;
    } else {
        m_framesDecelerating++;
    }
    // if the ball does not accelerate extremely for NUM_DECELERATION_FRAMES frames straight, the current velocity
    // is taken as the maximum ball speed
    if (m_framesDecelerating <= NUM_DECELERATION_FRAMES) {
        if ((frame.robot.pastRobotPos - pos).norm() < MAXSPEED_MIN_ROBOT_DIST ||
                (frame.robot.pastRobotPos - lastPos).norm() < MAXSPEED_MIN_ROBOT_DIST) {
            m_ballWasNearRobot = true;
        }
        m_highestSpeed = std::max(m_highestSpeed, speedLength);
    }

    if (m_framesDecelerating == NUM_DECELERATION_FRAMES) {
        if (m_ballWasNearRobot) {
            m_maxSpeed = m_highestSpeed;
        }
        m_ballWasNearRobot = false;
        m_highestSpeed = 0;
    }
    if (m_maxSpeed < speedLength) {
        m_maxSpeed = m_maxSpeed + 0.5f * (speedLength - m_maxSpeed);
    }
}

void BallGroundCollisionFilter::updateDribbleAndRotate(const VisionFrame &frame)
{
    // detects if the ball is directly in front of the robots dribbler
    // and saves for how long this is the case

    const Eigen::Vector2f framePos{frame.x, frame.y};
    const Eigen::Vector2f toDribbler = (frame.robot.dribblerPos - frame.robot.robotPos).normalized();
    const Eigen::Vector2f sideways = perpendicular(toDribbler);

    const float frontDist = std::abs((framePos - frame.robot.dribblerPos).dot(toDribbler));
    const float sideDist = std::abs((framePos - frame.robot.dribblerPos).dot(sideways));

    const float maxFrontDist = BALL_RADIUS + 0.03;
    const float maxSideDist = DRIBBLER_WIDTH + 0.02;
    if (frontDist < maxFrontDist && sideDist < maxSideDist) {
        m_inDribblerFrames++;
    } else {
        m_inDribblerFrames = 0;
    }
    if (m_rotateAndDribbleOffset && m_rotateAndDribbleOffset->robotIdentifier != frame.robot.identifier) {
        m_inDribblerFrames = 0;
    }
    m_rotateAndDribbleOffset = BallOffsetInfo(framePos, frame.robot, true, true);
}

int BallGroundCollisionFilter::chooseDetection(const std::vector<VisionFrame> &frames) const
{
    const float ACCEPT_BALL_DIST = 0.45f;
    float minDistance = ACCEPT_BALL_DIST;
    int bestFrame = -1;
    for (std::size_t i = 0;i<frames.size();i++) {
        const VisionFrame &frame = frames[i];
        const Eigen::Vector2f framePos(frame.x, frame.y);
        const float reportedBallDist = m_dribbleOffset.has_value() ? (m_lastReportedBallPos - framePos).norm() : std::numeric_limits<float>::max();
        const float groundFilterDist = m_groundFilter.distanceTo(framePos);

        const float dist = std::min(reportedBallDist, groundFilterDist);
        if (dist < minDistance) {
            minDistance = dist;
            bestFrame = i;
        }
    }
    return bestFrame;
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

static std::optional<Eigen::Vector2f> intersectLineSegmentRobot(Eigen::Vector2f p1, Eigen::Vector2f p2, const RobotInfo &robot, float robotRadius,
                                                                float robotSizeFactor = 1.0f)
{
    Eigen::Vector2f dribblerPos = robot.dribblerPos;
    if (robotSizeFactor != 1.0f) {
        robotRadius *= robotSizeFactor;
        dribblerPos = robot.robotPos + (robot.dribblerPos - robot.robotPos) * robotSizeFactor;
    }

    const auto toDribbler = (dribblerPos - robot.robotPos).normalized();
    const auto dribblerSideways = perpendicular(toDribbler);
    const auto dribblerIntersection = intersectLineLine(dribblerPos, dribblerSideways, p1, p2 - p1);
    std::optional<Eigen::Vector2f> dribblerIntersectionPos;
    if (dribblerIntersection.has_value() && dribblerIntersection->second >= 0 && dribblerIntersection->second <= 1) {
        dribblerIntersectionPos = dribblerPos + dribblerSideways * dribblerIntersection->first;
        if ((*dribblerIntersectionPos - robot.robotPos).norm() > robotRadius) {
            dribblerIntersectionPos.reset();
        }
        if (dribblerIntersectionPos && (p1 - dribblerPos).dot(toDribbler) >= 0) {
            // the line segment comes from in front of the robot, the line intersection is the correct one
            return dribblerIntersectionPos;
        }
    }
    auto hullIntersection = intersectLineSegmentCircle(p1, p2, robot.robotPos, robotRadius);
    if (hullIntersection && (*hullIntersection - dribblerPos).dot(toDribbler) >= 0) {
        hullIntersection.reset();
    }
    if (dribblerIntersectionPos && !hullIntersection) {
        return dribblerIntersectionPos;
    }
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

static bool isInsideRobot(Eigen::Vector2f pos, Eigen::Vector2f robotPos, Eigen::Vector2f dribblerPos, float robotRadius, float sizeFactor = 1.0f)
{
    if ((pos - robotPos).norm() > robotRadius * sizeFactor) {
        return false;
    }
    const Eigen::Vector2f toDribbler = (dribblerPos - robotPos).normalized();
    const Eigen::Vector2f scaledDribblerPos = robotPos + (dribblerPos - robotPos) * sizeFactor;
    return (pos - scaledDribblerPos).dot(toDribbler) <= 0;
}

static bool isBallVisible(Eigen::Vector2f pos, const RobotInfo &robot, float robotRadius, float robotHeight, Eigen::Vector3f cameraPos)
{
    const Eigen::Vector3f toBall = Eigen::Vector3f(pos.x(), pos.y(), BALL_RADIUS) - cameraPos;
    const float length = (cameraPos.z() - robotHeight) / (cameraPos.z() - BALL_RADIUS);
    const Eigen::Vector3f projected = cameraPos + toBall * length;
    const Eigen::Vector2f projected2D(projected.x(), projected.y());
    // TODO: this assumes that the ball is only invisible if the center is overshadowed
    const bool inRadius = (robot.robotPos - projected2D).norm() <= robotRadius;
    const bool frontOfDribbler = (projected2D - robot.dribblerPos).dot(robot.dribblerPos - robot.robotPos) > 0;
    const bool hasIntersection = intersectLineSegmentRobot(pos, projected2D, robot, robotRadius, 0.98f).has_value();
    return (!inRadius || frontOfDribbler) && !hasIntersection;
}

static float distanceToLineSegment(Eigen::Vector2f lineStart, Eigen::Vector2f lineEnd, Eigen::Vector2f pos)
{
    const Eigen::Vector2f dir = (lineEnd - lineStart).normalized();
    const Eigen::Vector2f offset = pos - lineStart;
    if (offset.dot(dir) < 0) {
        return offset.norm();
    }
    const Eigen::Vector2f d = pos - lineEnd;
    if (d.dot(dir) > 0) {
        return d.norm();
    }
    return std::abs(d.x() * dir.y() - d.y() * dir.x());
}

// WARNING: in contrast to isBallVisible, this function assumes the robot to be a perfect cylinder, without indentation for the dribbler
static float distToRobotShadow(Eigen::Vector2f pos, const RobotInfo &robot, float robotRadius, float robotHeight, Eigen::Vector3f cameraPos)
{
    const Eigen::Vector3f toBall = Eigen::Vector3f(pos.x(), pos.y(), BALL_RADIUS) - cameraPos;
    const float length = (cameraPos.z() - robotHeight) / (cameraPos.z() - BALL_RADIUS);
    const Eigen::Vector3f projected = cameraPos + toBall * length;
    const Eigen::Vector2f projected2D(projected.x(), projected.y());
    return distanceToLineSegment(pos, projected2D, robot.robotPos) - robotRadius;
}

bool BallGroundCollisionFilter::isBallCloseToRobotShadow(const VisionFrame &frame) const
{
    const Eigen::Vector3f camPos = m_cameraInfo->cameraPosition[m_primaryCamera];
    const Eigen::Vector2f ballPos(frame.x, frame.y);
    const float shadowDist = distToRobotShadow(ballPos, frame.robot, ROBOT_RADIUS, ROBOT_HEIGHT, camPos);
    const float robotDist = (ballPos - frame.robot.robotPos).norm();
    return shadowDist < 0.02f && robotDist > ROBOT_RADIUS + 0.03f;
}

void BallGroundCollisionFilter::resetFilter(const VisionFrame &frame)
{
    m_groundFilter.reset(frame);
    m_framesDecelerating = 0;
    m_ballWasNearRobot = true;
}

static Eigen::Vector2f unprojectRelativePosition(Eigen::Vector2f relativePos, const RobotInfo &robot)
{
    const Eigen::Vector2f toDribbler = (robot.dribblerPos - robot.robotPos).normalized();
    const Eigen::Vector2f relativeBallPos = relativePos.x() * toDribbler +
                                            relativePos.y() * perpendicular(toDribbler);
    return robot.robotPos + relativeBallPos;
}

static Eigen::Vector2f computeDribblingBallSpeed(const RobotInfo &robot, Eigen::Vector2f relativePosition)
{
    const Eigen::Vector2f absoluteOffset = unprojectRelativePosition(relativePosition, robot) - robot.robotPos;
    const float distToRobot = absoluteOffset.norm();
    const float tangentialLength = robot.angularVelocity * distToRobot;
    const Eigen::Vector2f tangential = -perpendicular(absoluteOffset.normalized()) * tangentialLength;
    return robot.speed + tangential;
}

void BallGroundCollisionFilter::processVisionFrame(const VisionFrame &frame)
{
    // Filter out 'intersections' where the ball did not truly intersect the ball
    // but was just close and then got invisible for a frame.
    // In these cases rotateAndDribble or other code activates, but the filter does not need to be reset.
    const bool trueIntersection = m_dribbleOffset &&
            ((m_dribbleOffset->isIntersecting && !m_dribbleOffset->forceDribbleMode) || m_invisibleFrames > 5);
    if (trueIntersection) {
        // Reset the filter during dribbling so that the ball speed is
        // computed properly once the ball is visible again
        resetFilter(frame);
        const Eigen::Vector2f currentBallSpeed = computeDribblingBallSpeed(frame.robot, m_dribbleOffset->ballOffset);
        m_groundFilter.setSpeed(currentBallSpeed);
    }
    m_dribbleOffset.reset();

    m_feasiblyInvisible = false;
    m_lastUpdateTime = frame.time;
    m_lastVisionFrame = frame;
    m_invisibleFrames = 0;

    const bool closeToShadow = isBallCloseToRobotShadow(frame);
    m_groundFilter.setObservationStdDev(closeToShadow ? 0.02f : 0.003f);

    const Eigen::Vector2f lastSpeed{m_pastBallState.v_x(), m_pastBallState.v_y()};
    const Eigen::Vector2f lastPos{m_pastBallState.p_x(), m_pastBallState.p_y()};

    m_groundFilter.processVisionFrame(frame);
    // TODO: fix the 0 time and is the +1 still necessary?
    m_groundFilter.writeBallState(&m_pastBallState, frame.time + 1, {}, 0);

    checkVolleyShot(frame);
    updateDribbleAndRotate(frame);
    updateMaxSpeed(frame, lastSpeed.norm(), lastPos);
}

static Eigen::Vector2f computeRelativePosition(const Eigen::Vector2f &ballPos, const RobotInfo &robot)
{
    const Eigen::Vector2f toDribbler = (robot.dribblerPos - robot.robotPos).normalized();
    return Eigen::Vector2f{(ballPos - robot.robotPos).dot(toDribbler),
                           (ballPos - robot.robotPos).dot(perpendicular(toDribbler))};
}

BallGroundCollisionFilter::BallOffsetInfo::BallOffsetInfo(Eigen::Vector2f projectedBallPos, const RobotInfo &robot, bool forceDribbling, bool intersecting)
{
    robotIdentifier = robot.identifier;
    ballOffset = computeRelativePosition(projectedBallPos, robot);
    forceDribbleMode = forceDribbling;
    pushingBallPos = projectedBallPos;
    stopDribblingPos = projectedBallPos;
    isIntersecting = intersecting;
    dribblerActive = false;
}

static void setBallData(world::Ball *ball, Eigen::Vector2f pos, Eigen::Vector2f speed, bool writeSpeed)
{
    ball->set_p_x(pos.x());
    ball->set_p_y(pos.y());
    if (writeSpeed) {
        ball->set_v_x(speed.x());
        ball->set_v_y(speed.y());
    }
}

static RobotInfo pastToCurrentRobotInfo(const RobotInfo &robot)
{
    RobotInfo result = robot;
    result.robotPos = robot.pastRobotPos;
    result.dribblerPos = robot.pastDribblerPos;
    return result;
}

bool BallGroundCollisionFilter::checkFeasibleInvisibility(const QVector<RobotInfo> &robots) const
{
    Eigen::Vector2f ballPos(m_pastBallState.p_x(), m_pastBallState.p_y());
    if (m_dribbleOffset) {
        int id = m_dribbleOffset->robotIdentifier;
        auto robot = std::find_if(robots.begin(), robots.end(), [id](const RobotInfo &robot) { return robot.identifier == id; });
        if (robot != robots.end()) {
            ballPos = unprojectRelativePosition(m_dribbleOffset->ballOffset, pastToCurrentRobotInfo(*robot));
        }
    }
    const float sizeFactor = DRIBBLING_ROBOT_VISIBILITY_FACTOR;
    const Eigen::Vector3f camPos = m_cameraInfo->cameraPosition[m_primaryCamera];
    return std::any_of(robots.begin(), robots.end(), [=](const RobotInfo &r) {
        return !isBallVisible(ballPos, pastToCurrentRobotInfo(r), ROBOT_RADIUS * sizeFactor,
                              ROBOT_HEIGHT * sizeFactor, camPos);
    });
}

void BallGroundCollisionFilter::checkVolleyShot(const VisionFrame &frame)
{
    // After a shot, reset the filter so that the ball speed matches the true speed as soon as possible
    // This is especially important for volley shots, in order for the velocity to have the correct direction
    const Eigen::Vector2f currentPos(m_pastBallState.p_x(), m_pastBallState.p_y());
    const Eigen::Vector2f currentSpeed(m_pastBallState.v_x(), m_pastBallState.v_y());
    const int FUTURE_TIME_MS = 50;
    const Eigen::Vector2f futurePos = currentPos + currentSpeed * (FUTURE_TIME_MS * 0.001f);
    const bool hasIntersection = intersectLineSegmentRobot(currentPos, futurePos, frame.robot, ROBOT_RADIUS, 1.05f).has_value();

    const bool noDribbling = currentSpeed.norm() - frame.robot.speed.norm() > 2.0f
            || m_lastValidSpeed - frame.robot.speed.norm() > 2.0f;
    if (!hasIntersection && m_hadRobotIntersection && noDribbling) {
        resetFilter(frame);
        m_groundFilter.processVisionFrame(frame);
        m_groundFilter.writeBallState(&m_pastBallState, frame.time + 1, {}, 0);
    }
    if (!hasIntersection) {
        m_lastValidSpeed = currentSpeed.norm();
    }
    m_hadRobotIntersection = hasIntersection;
}

void BallGroundCollisionFilter::writeBallState(world::Ball *ball, qint64 time, const QVector<RobotInfo> &robots, qint64 lastCameraFrameTime)
{
    computeBallState(ball, time, robots, lastCameraFrameTime);
    debugLine("new speed", ball->p_x(), ball->p_y(), ball->p_x() + ball->v_x(), ball->p_y() + ball->v_y());
    m_lastReportedBallPos = Eigen::Vector2f(ball->p_x(), ball->p_y());
}

void BallGroundCollisionFilter::updateDribbling(const QVector<RobotInfo> &robots)
{
    const int identifier = m_dribbleOffset->robotIdentifier;
    auto it = std::find_if(robots.begin(), robots.end(), [identifier](const RobotInfo &robot) { return robot.identifier == identifier; });
    if (it == robots.end()) {
        return;
    }
    const RobotInfo robot = pastToCurrentRobotInfo(*it);

    const Eigen::Vector2f ballPos = unprojectRelativePosition(m_dribbleOffset->ballOffset, robot);
    if (robot.dribblerActive) {
        m_dribbleOffset->dribblerActive = true;
        m_dribbleOffset->stopDribblingPos = ballPos;
    }

    bool wasPushed = isInsideRobot(m_dribbleOffset->pushingBallPos, robot.robotPos, robot.dribblerPos, ROBOT_RADIUS);
    if (wasPushed) {
        m_dribbleOffset->pushingBallPos = ballPos;
        m_dribbleOffset->stopDribblingPos = ballPos;
    }
}

bool BallGroundCollisionFilter::handleDribbling(world::Ball *ball, const QVector<RobotInfo> &robots, bool overwriteBallSpeed) const
{
    const int identifier = m_dribbleOffset->robotIdentifier;
    auto robot = std::find_if(robots.begin(), robots.end(), [identifier](const RobotInfo &robot) { return robot.identifier == identifier; });
    if (robot == robots.end()) {
        return false;
    }

    const Eigen::Vector2f ballPos = unprojectRelativePosition(m_dribbleOffset->ballOffset, *robot);

    const bool wasPushed = isInsideRobot(m_dribbleOffset->pushingBallPos, robot->robotPos, robot->dribblerPos, ROBOT_RADIUS);
    const bool pushingPosVisible = isBallVisible(m_dribbleOffset->pushingBallPos, *robot, ROBOT_RADIUS * DRIBBLING_ROBOT_VISIBILITY_FACTOR,
                                                 ROBOT_HEIGHT * DRIBBLING_ROBOT_VISIBILITY_FACTOR, m_cameraInfo->cameraPosition[m_primaryCamera]);
    bool otherRobotObstruction = false;
    for (const RobotInfo &r : robots) {
        if (r.identifier != robot->identifier && !isBallVisible(m_dribbleOffset->pushingBallPos, r, ROBOT_RADIUS, ROBOT_HEIGHT,
                           m_cameraInfo->cameraPosition[m_primaryCamera])) {
            otherRobotObstruction = true;
            break;
        }
    }
    if (pushingPosVisible || otherRobotObstruction || wasPushed || m_dribbleOffset->forceDribbleMode) {

        if (m_dribbleOffset->dribblerActive && !robot->dribblerActive) {
            setBallData(ball, m_dribbleOffset->stopDribblingPos, Eigen::Vector2f(0, 0), overwriteBallSpeed);
            debug("ground filter mode", "stopped dribbling");
        } else {
            // TODO: only allow this when the ball is near the dribbler not the robot body
            const Eigen::Vector2f ballSpeed = computeDribblingBallSpeed(*robot, m_dribbleOffset->ballOffset);
            setBallData(ball, ballPos, ballSpeed, overwriteBallSpeed);
            debug("ground filter mode", "dribbling");
        }

    } else {
        setBallData(ball, m_dribbleOffset->pushingBallPos, Eigen::Vector2f(0, 0), overwriteBallSpeed);
        debug("ground filter mode", "invisible standing ball");
    }
    return true;
}

bool BallGroundCollisionFilter::checkBallRobotIntersection(world::Ball *ball, const RobotInfo &robot, bool overwriteBallSpeed,
                                                           const Eigen::Vector2f pastPos, const Eigen::Vector2f currentPos) const
{
    Eigen::Vector2f outsideRobotPastPos = pastPos;
    const bool pastInsideCurrent = isInsideRobot(pastPos, robot.robotPos, robot.dribblerPos, ROBOT_RADIUS, 1.01f);
    if (pastInsideCurrent) {
        outsideRobotPastPos = robot.robotPos + (pastPos - robot.pastRobotPos);
        if (isInsideRobot(outsideRobotPastPos, robot.robotPos, robot.dribblerPos, ROBOT_RADIUS, 1.01f)) {
            const auto intersection = intersectLineSegmentRobot(outsideRobotPastPos, robot.robotPos + (outsideRobotPastPos - robot.robotPos).normalized(),
                                                                robot, ROBOT_RADIUS, 1.05f);
            if (intersection) {
                outsideRobotPastPos = *intersection;
            }
        }
    }

    const auto intersection = intersectLineSegmentRobot(outsideRobotPastPos, currentPos, robot, ROBOT_RADIUS);
    if (intersection) {
        const Eigen::Vector2f ballSpeed = computeDribblingBallSpeed(robot, computeRelativePosition(*intersection, robot));
        setBallData(ball, *intersection, ballSpeed, overwriteBallSpeed);
        debug("ground filter mode", "shot at robot");
        return true;
    }
    return false;
}

void BallGroundCollisionFilter::updateEmptyFrame(qint64 frameTime, const QVector<RobotInfo> &robots)
{
    m_invisibleFrames++;
    m_lastUpdateTime = frameTime;

    Eigen::Vector2f pastPos{m_pastBallState.p_x(), m_pastBallState.p_y()};
    Eigen::Vector2f pastSpeed{m_pastBallState.v_x(), m_pastBallState.v_y()};
    // Due to partial occlusion by the robot shadow, the ball often moves a bit
    // before becoming invisible if the robot is driving up to it.
    // This creates a persistent ball speed that can be problematic.
    // Therefore, this code resets the ball to the last detection in that case.
    const bool closeToShadow = isBallCloseToRobotShadow(m_lastVisionFrame);
    if (m_invisibleFrames == 3 && pastSpeed.norm() < 0.05f && !m_dribbleOffset && closeToShadow) {
        VisionFrame resetFrame = m_lastVisionFrame;
        resetFrame.x = m_pastBallState.p_x();
        resetFrame.y = m_pastBallState.p_y();
        resetFilter(resetFrame);
        m_groundFilter.writeBallState(&m_pastBallState, m_lastVisionFrame.time + 1, robots, 0);
        pastPos = Eigen::Vector2f{m_pastBallState.p_x(), m_pastBallState.p_y()};
        pastSpeed = Eigen::Vector2f{m_pastBallState.v_x(), m_pastBallState.v_y()};
    }

    debugCircle("invisible ball now", pastPos.x(), pastPos.y(), 0.05f);
    // TODO: fix 0 time
    m_groundFilter.writeBallState(&m_pastBallState, frameTime, robots, 0);
    const Eigen::Vector2f currentPos{m_pastBallState.p_x(), m_pastBallState.p_y()};

    if (m_dribbleOffset && m_dribbleOffset->isIntersecting) {
        updateDribbling(robots);
        return;
    }

    // check for a ball colliding with a robot
    std::optional<RobotInfo> closeRobot;
    for (const RobotInfo &r : robots) {
        const RobotInfo robot = pastToCurrentRobotInfo(r);
        if (isInsideRobot(currentPos, robot.pastRobotPos, robot.pastDribblerPos, ROBOT_RADIUS)) {
            const auto intersection = intersectLineSegmentRobot(pastPos, currentPos, robot, ROBOT_RADIUS);
            if (intersection) {
                m_dribbleOffset = BallOffsetInfo(*intersection, robot, false, true);
                return;
            }

            const Eigen::Vector2f directIntersection = *intersectLineSegmentRobot(robot.robotPos, robot.robotPos + (currentPos - robot.robotPos).normalized(), robot, ROBOT_RADIUS);
            m_dribbleOffset = BallOffsetInfo(directIntersection, robot, false, true);
            return;
        }

        const float robotDist = (robot.robotPos - currentPos).norm();
        const bool inFrontOfRobot = (robot.dribblerPos - robot.robotPos).dot(currentPos - robot.robotPos) > 0;
        if (robotDist < ROBOT_RADIUS + BALL_RADIUS && inFrontOfRobot &&
                (!m_dribbleOffset || robotDist < m_dribbleOffset->ballOffset.norm())) {
            closeRobot = robot;
        }
    }

    // check for dribble and rotate
    if ((!m_dribbleOffset || !m_dribbleOffset->isIntersecting) && m_rotateAndDribbleOffset && m_inDribblerFrames > 15) {

        const auto identifier = m_rotateAndDribbleOffset->robotIdentifier;
        const auto r = std::find_if(robots.begin(), robots.end(), [identifier](const RobotInfo &robot) { return robot.identifier == identifier; });
        if (r != robots.end()) {
            const RobotInfo robot = pastToCurrentRobotInfo(*r);
            const Eigen::Vector2f unprojected = unprojectRelativePosition(m_rotateAndDribbleOffset->ballOffset, robot);
            if (!isBallVisible(unprojected, robot, ROBOT_RADIUS, ROBOT_HEIGHT, m_cameraInfo->cameraPosition[m_primaryCamera])) {
                m_dribbleOffset  = m_rotateAndDribbleOffset;
                debug("activate rotate and dribble", 1);
                return;
            }
        }
    }

    // if a robot is close to the ball but not intersecting, activate dribbling
    // but allow for proper intersections later on
    if (closeRobot && pastSpeed.norm() < 0.1f) {
        m_dribbleOffset = BallOffsetInfo(currentPos, *closeRobot, false, false);
    }
}

void BallGroundCollisionFilter::computeBallState(world::Ball *ball, qint64 time, const QVector<RobotInfo> &robots, qint64 lastCameraFrameTime)
{
    if (m_lastUpdateTime > 0 && lastCameraFrameTime > m_lastUpdateTime) {
        updateEmptyFrame(lastCameraFrameTime, robots);
        m_feasiblyInvisible = checkFeasibleInvisibility(robots);
    }

    // TODO: test sides flipped (fieldtransform difference in robotinfo and groundfilter result?)
    m_groundFilter.writeBallState(ball, time, robots, lastCameraFrameTime);
    // might be overwritten later
    debug("ground filter mode", "regular ground filter");

#ifdef ENABLE_TRACKING_DEBUG
    // prevent accumulation of debug values, since they are never read
    m_groundFilter.clearDebugValues();
#endif

    // During dribbling etc. the ball speed should be set to the robot speed.
    // However, during a volley shot, it is not desirable to have the speed at
    // the zero (the robot speed) for a short time while the future ball intersects with
    // the robot but the vision data is not there yet.
    // Therefore, keep the ball speed as it is in this case.
    const qint64 RESET_SPEED_TIME = 150; // ms
    const int invisibleTimeMs = (time - m_lastVisionFrame.time) / 1000000;
    const bool rotateAndDribble = m_dribbleOffset.has_value() && m_dribbleOffset->forceDribbleMode;
    const bool dribbling = m_lastValidSpeed < 2.0f;
    const bool overwriteBallSpeed = invisibleTimeMs > RESET_SPEED_TIME || rotateAndDribble || dribbling;

    if (m_dribbleOffset) {
        handleDribbling(ball, robots, overwriteBallSpeed);
        return;
    }

    const Eigen::Vector2f pastBallPos{m_pastBallState.p_x(), m_pastBallState.p_y()};
    const Eigen::Vector2f currentBallPos{ball->p_x(), ball->p_y()};
    for (const RobotInfo &robot : robots) {
        if (checkBallRobotIntersection(ball, robot, overwriteBallSpeed, pastBallPos, currentBallPos)) {
            return;
        }
    }
}
