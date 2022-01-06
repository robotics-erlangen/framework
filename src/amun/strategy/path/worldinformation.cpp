/***************************************************************************
 *   Copyright 2019 Andreas Wendler                                        *
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

#include "worldinformation.h"

#include <QDebug>

void WorldInformation::setRadius(float r)
{
    m_radius = r;
}

void WorldInformation::setBoundary(float x1, float y1, float x2, float y2)
{
    m_boundary.bottomLeft.x = std::min(x1, x2);
    m_boundary.bottomLeft.y = std::min(y1, y2);
    m_boundary.topRight.x = std::max(x1, x2);
    m_boundary.topRight.y = std::max(y1, y2);
}

void WorldInformation::clearObstacles()
{
    m_circleObstacles.clear();
    m_rectObstacles.clear();
    m_triangleObstacles.clear();
    m_lineObstacles.clear();

    m_movingCircles.clear();
    m_movingLines.clear();
    m_friendlyRobotObstacles.clear();
    m_opponentRobotObstacles.clear();
}

void WorldInformation::addToAllStaticObstacleRadius(float additionalRadius)
{
    for (StaticObstacles::Circle &c: m_circleObstacles) { c.radius += additionalRadius; }
    for (StaticObstacles::Rect &r: m_rectObstacles) { r.radius += additionalRadius; }
    for (StaticObstacles::Triangle &t: m_triangleObstacles) { t.radius += additionalRadius; }
    for (StaticObstacles::Line &l: m_lineObstacles) { l.radius += additionalRadius; }
}

void WorldInformation::addCircle(float x, float y, float radius, const char* name, int prio)
{
    m_circleObstacles.emplace_back(name, prio, radius, Vector(x, y));
}

void WorldInformation::addLine(float x1, float y1, float x2, float y2, float width, const char* name, int prio)
{
    m_lineObstacles.emplace_back(name, prio, width, Vector(x1, y1), Vector(x2, y2));
}

void WorldInformation::addRect(float x1, float y1, float x2, float y2, const char* name, int prio, float radius)
{
    StaticObstacles::Rect r(name, prio, x1, y1, x2, y2, radius);
    m_rectObstacles.push_back(r);
}

void WorldInformation::addTriangle(float x1, float y1, float x2, float y2, float x3, float y3, float lineWidth, const char *name, int prio)
{
    m_triangleObstacles.emplace_back(name, prio, lineWidth, Vector(x1, y1), Vector(x2, y2), Vector(x3, y3));
}

void WorldInformation::collectObstacles() const
{
    m_obstacles.clear();
    for (const StaticObstacles::Circle &c: m_circleObstacles) { m_obstacles.append(&c); }
    for (const StaticObstacles::Rect &r: m_rectObstacles) { m_obstacles.append(&r); }
    for (const StaticObstacles::Triangle &t: m_triangleObstacles) { m_obstacles.append(&t); }
    for (const StaticObstacles::Line &l: m_lineObstacles) { m_obstacles.append(&l); }
}

void WorldInformation::collectMovingObstacles()
{
    m_movingObstacles.clear();
    for (auto &o : m_movingCircles) {
        m_movingObstacles.push_back(&o);
    }
    for (auto &o : m_movingLines) {
        m_movingObstacles.push_back(&o);
    }
    for (auto &o : m_friendlyRobotObstacles) {
        m_movingObstacles.push_back(&o);
    }
    for (auto &o : m_opponentRobotObstacles) {
        m_movingObstacles.push_back(&o);
    }
}

bool WorldInformation::pointInPlayfield(const Vector &point, float radius) const
{
    if (point.x - radius < m_boundary.bottomLeft.x ||
           point.x + radius > m_boundary.topRight.x ||
           point.y - radius < m_boundary.bottomLeft.y ||
           point.y + radius > m_boundary.topRight.y) {
        return false;
    }
    return true;
}


// moving obstacles
void WorldInformation::addMovingCircle(Vector startPos, Vector speed, Vector acc, float startTime, float endTime, float radius, int prio)
{
    m_movingCircles.emplace_back(prio, radius + m_radius, startPos, speed, acc, startTime, endTime);
}

void WorldInformation::addMovingLine(Vector startPos1, Vector speed1, Vector acc1, Vector startPos2, Vector speed2,
                                   Vector acc2, float startTime, float endTime, float width, int prio)
{
    m_movingLines.emplace_back(prio, width + m_radius, startPos1, speed1, acc1,
                               startPos2, speed2, acc2, startTime, endTime);
}

void WorldInformation::addFriendlyRobotTrajectoryObstacle(std::vector<TrajectoryPoint> *obstacle, int prio, float radius)
{
    // the path finding of the other robot could not find a path
    if (obstacle->size() == 0) {
        return;
    }
    float maxDistSq = 0;
    for (const TrajectoryPoint &p : *obstacle) {
        maxDistSq = std::max(maxDistSq, p.pos.distanceSq((*obstacle)[0].pos));
    }
    if (maxDistSq < 0.03f * 0.03f) {
        addCircle(obstacle->at(0).pos.x, obstacle->at(0).pos.y, radius + std::sqrt(maxDistSq), nullptr, prio);
        return;
    }
    MovingObstacles::FriendlyRobotObstacle o(obstacle, radius + m_radius, prio);
    m_friendlyRobotObstacles.push_back(o);
}

void WorldInformation::addOpponentRobotObstacle(Vector startPos, Vector speed, int prio)
{
    m_opponentRobotObstacles.emplace_back(prio, m_radius, startPos, speed);
}

// obstacle checking
bool WorldInformation::isInMovingObstacle(const std::vector<MovingObstacles::MovingObstacle*> &obstacles, Vector point, float time, Vector speed) const
{
    if (time >= IGNORE_MOVING_OBSTACLE_THRESHOLD) {
        return false;
    }
    for (const auto o : obstacles) {
        if (o->intersects(point, time, speed)) {
            return true;
        }
    }
    return false;
}

bool WorldInformation::isTrajectoryInObstacle(const SpeedProfile &profile, float timeOffset, Vector startPos) const
{
    BoundingBox trajectoryBoundingBox = profile.calculateBoundingBox(startPos);
    std::vector<const StaticObstacles::Obstacle*> intersectingStaticObstacles;
    intersectingStaticObstacles.reserve(m_obstacles.size());
    for (const StaticObstacles::Obstacle *o : m_obstacles) {
        if (o->boundingBox().intersects(trajectoryBoundingBox)) {
            intersectingStaticObstacles.push_back(o);
        }
    }
    std::vector<MovingObstacles::MovingObstacle*> intersectingMovingObstacles;
    intersectingMovingObstacles.reserve(m_movingObstacles.size());
    for (MovingObstacles::MovingObstacle *o : m_movingObstacles) {
        if (o->boundingBox().intersects(trajectoryBoundingBox)) {
            intersectingMovingObstacles.push_back(o);
        }
    }

    const int DIVISIONS = 40;

    float totalTime = profile.time();
    std::vector<std::pair<Vector, Vector>> trajectoryPoints = profile.trajectoryPositions(startPos, DIVISIONS, totalTime * (1.0f / (DIVISIONS-1)));

    for (int i = 0;i<DIVISIONS;i++) {
        float time = totalTime * i / float(DIVISIONS-1);
        if (isInStaticObstacle(intersectingStaticObstacles, trajectoryPoints[i].first)) {
            return true;
        }
        if (isInMovingObstacle(intersectingMovingObstacles, trajectoryPoints[i].first, time + timeOffset, trajectoryPoints[i].second)) {
            return true;
        }
    }
    return false;
}

float WorldInformation::minObstacleDistancePoint(Vector pos, float time, Vector speed, bool checkStatic, bool checkDynamic) const
{
    float minDistance = std::numeric_limits<float>::max();
    // static obstacles
    if (checkStatic) {
        for (const auto obstacle : m_obstacles) {
            float d = obstacle->distance(pos);
            if (d <= 0) {
                return d;
            }
            minDistance = std::min(minDistance, d);
        }
    }
    // moving obstacles
    if (time < IGNORE_MOVING_OBSTACLE_THRESHOLD && checkDynamic) {
        for (const auto o : m_movingObstacles) {
            float d = o->distance(pos, time, speed);
            if (d <= 0) {
                return d;
            }
            minDistance = std::min(minDistance, d);
        }
    }
    return minDistance;
}

bool WorldInformation::isInFriendlyStopPos(const Vector pos) const
{
    for (const auto &o : m_friendlyRobotObstacles) {
        if (o.intersects(pos, 200, Vector(0, 0))) {
            return true;
        }
    }
    return false;
}

std::pair<float, float> WorldInformation::minObstacleDistance(const SpeedProfile &profile, float timeOffset, Vector startPos, float safetyMargin) const
{
    float totalTime = profile.time();
    float totalMinDistance = std::numeric_limits<float>::max();
    float lastPointDistance = std::numeric_limits<float>::max();

    const int DIVISIONS = 40;

    std::vector<std::pair<Vector, Vector>> trajectoryPoints = profile.trajectoryPositions(startPos, DIVISIONS, totalTime * (1.0f / (DIVISIONS-1)));
    std::vector<float> trajectoryTimes(DIVISIONS);

    for (int i = 0;i<DIVISIONS;i++) {
        const float time = totalTime * i * (1.0f / float(DIVISIONS-1));
        const Vector pos = trajectoryPoints[i].first;
        const Vector speed = trajectoryPoints[i].second;

        trajectoryTimes[i] = time + timeOffset;

        if (i == 0 || i == DIVISIONS-1) {
            const float minDistance = minObstacleDistancePoint(pos, time + timeOffset, speed, true, true);
            if (minDistance < 0) {
                return {minDistance, minDistance};
            }
            lastPointDistance = std::min(lastPointDistance, minDistance);
        }
    }

    BoundingBox trajectoryBox(trajectoryPoints[0].first, trajectoryPoints[1].first);
    for (int i = 2;i<DIVISIONS;i++) {
        trajectoryBox.mergePoint(trajectoryPoints[i].first);
    }

    // check if the trajectory is in the playing field
    // this must be done before adding the safety margin to the trajectory bounding box
    if (!pointInPlayfield(Vector(trajectoryBox.left, trajectoryBox.top), m_radius) ||
            !pointInPlayfield(Vector(trajectoryBox.right, trajectoryBox.bottom), m_radius)) {
        return {-1, -1};
    }

    trajectoryBox.addExtraRadius(safetyMargin);

    for (auto obstacle : m_obstacles) {
        if (obstacle->boundingBox().intersects(trajectoryBox)) {
            for (std::size_t i = 0;i<DIVISIONS;i++) {
                const float dist = obstacle->zonedDistance(trajectoryPoints[i].first, safetyMargin);
                if (dist < 0) {
                    return {dist, dist};
                } else if (dist < safetyMargin) {
                    totalMinDistance = std::min(dist, totalMinDistance);
                }
            }
        }
    }

    for (auto obstacle : m_movingObstacles) {
        if (obstacle->boundingBox().intersects(trajectoryBox)) {
            for (std::size_t i = 0;i<DIVISIONS;i++) {
                const float dist = obstacle->zonedDistance(trajectoryPoints[i].first, trajectoryTimes[i], safetyMargin, trajectoryPoints[i].second);
                if (dist < 0) {
                    return {dist, dist};
                } else if (dist < safetyMargin) {
                    totalMinDistance = std::min(dist, totalMinDistance);
                }
            }

            // try to avoid moving obstacles even when the robot reaches its goal
            if (profile.endSpeed() == Vector(0, 0)) {
                const float AFTER_STOP_AVOIDANCE_TIME = 0.5f;
                if (totalTime < AFTER_STOP_AVOIDANCE_TIME) {
                    const float AFTER_STOP_INTERVAL = 0.03f;
                    for (std::size_t i = 0;i<std::size_t((AFTER_STOP_AVOIDANCE_TIME - totalTime) * (1.0f / AFTER_STOP_INTERVAL));i++) {
                        float t = timeOffset + totalTime + i * AFTER_STOP_INTERVAL;
                        const float dist = obstacle->zonedDistance(trajectoryPoints.back().first, t, safetyMargin, trajectoryPoints.back().second);
                        if (dist < 0) {
                            return {dist, dist};
                        } else if (dist < safetyMargin) {
                            totalMinDistance = std::min(dist, totalMinDistance);
                        }
                    }
                }
            }
        }
    }

    return {totalMinDistance, lastPointDistance};
}

void WorldInformation::serialize(pathfinding::WorldState *state) const
{
    for (auto obstacle : qAsConst(m_obstacles)) {
        obstacle->serialize(state->add_obstacles());
    }
    for (auto obstacle : m_movingObstacles) {
        obstacle->serialize(state->add_obstacles());
    }
    state->set_out_of_field_priority(outOfFieldPriority());
    pathfinding::Obstacle o;
    m_boundary.serialize(&o);
    state->mutable_boundary()->CopyFrom(o.rectangle());
    state->set_radius(m_radius);
    state->set_robot_id(m_robotId);
}

void WorldInformation::deserialize(const pathfinding::WorldState &state)
{
    clearObstacles();

    for (const auto &obstacle : state.obstacles()) {
        if (obstacle.has_circle()) {
            StaticObstacles::Circle circle(obstacle, obstacle.circle());
            m_circleObstacles.push_back(circle);
        } else if (obstacle.has_triangle()) {
            StaticObstacles::Triangle triangle(obstacle, obstacle.triangle());
            m_triangleObstacles.push_back(triangle);
        } else if (obstacle.has_line()) {
            StaticObstacles::Line line(obstacle, obstacle.line());
            m_lineObstacles.push_back(line);
        } else if (obstacle.has_rectangle()) {
            StaticObstacles::Rect rect(obstacle, obstacle.rectangle());
            m_rectObstacles.push_back(rect);
        } else if (obstacle.has_moving_circle()) {
            MovingObstacles::MovingCircle circle(obstacle, obstacle.moving_circle());
            m_movingCircles.push_back(circle);
        } else if (obstacle.has_moving_line()) {
            MovingObstacles::MovingLine line(obstacle, obstacle.moving_line());
            m_movingLines.push_back(line);
        } else if (obstacle.has_friendly_robot()) {
            MovingObstacles::FriendlyRobotObstacle robot(obstacle, obstacle.friendly_robot());
            m_friendlyRobotObstacles.push_back(robot);
        } else if (obstacle.has_opponent_robot()) {
            MovingObstacles::OpponentRobotObstacle robot(obstacle, obstacle.opponent_robot());
            m_opponentRobotObstacles.push_back(robot);
        } else {
            qDebug() <<"Invalid or unknown obstacle";
        }
    }

    if (state.has_out_of_field_priority()) {
        m_outOfFieldPriority = state.out_of_field_priority();
    }
    if (state.has_radius()) {
        m_radius = state.radius();
    }
    if (state.has_robot_id()) {
        m_robotId = state.robot_id();
    }
    if (state.has_boundary()) {
        m_boundary = StaticObstacles::Rect(pathfinding::Obstacle(), state.boundary());
    }
}
