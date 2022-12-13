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
#include <algorithm>

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

void WorldInformation::addCircle(float x, float y, float radius, const char* name, int prio)
{
    m_circleObstacles.emplace_back(name, prio, radius + m_radius, Vector(x, y));
}

void WorldInformation::addLine(float x1, float y1, float x2, float y2, float width, const char* name, int prio)
{
    m_lineObstacles.emplace_back(name, prio, width + m_radius, Vector(x1, y1), Vector(x2, y2));
}

void WorldInformation::addRect(float x1, float y1, float x2, float y2, const char* name, int prio, float radius)
{
    const Obstacles::Rect r(name, prio, x1, y1, x2, y2, radius + m_radius);
    m_rectObstacles.push_back(r);
}

void WorldInformation::addTriangle(float x1, float y1, float x2, float y2, float x3, float y3, float lineWidth, const char *name, int prio)
{
    m_triangleObstacles.emplace_back(name, prio, lineWidth + m_radius, Vector(x1, y1), Vector(x2, y2), Vector(x3, y3));
}

void WorldInformation::collectObstacles()
{
    m_staticObstacles.clear();
    for (const Obstacles::Circle &c: m_circleObstacles) { m_staticObstacles.append(&c); }
    for (const Obstacles::Rect &r: m_rectObstacles) { m_staticObstacles.append(&r); }
    for (const Obstacles::Triangle &t: m_triangleObstacles) { m_staticObstacles.append(&t); }
    for (const Obstacles::Line &l: m_lineObstacles) { m_staticObstacles.append(&l); }

    m_obstacles.clear();
    for (auto &c: m_circleObstacles) { m_obstacles.push_back(&c); }
    for (auto &r: m_rectObstacles) { m_obstacles.push_back(&r); }
    for (auto &t: m_triangleObstacles) { m_obstacles.push_back(&t); }
    for (auto &l: m_lineObstacles) { m_obstacles.push_back(&l); }
    for (auto &o : m_movingCircles) { m_obstacles.push_back(&o); }
    for (auto &o : m_movingLines) { m_obstacles.push_back(&o); }
    for (auto &o : m_friendlyRobotObstacles) { m_obstacles.push_back(&o); }
    for (auto &o : m_opponentRobotObstacles) { m_obstacles.push_back(&o); }

    m_movingObstacles.clear();
    for (auto &o : m_movingCircles) { m_movingObstacles.push_back(&o); }
    for (auto &o : m_movingLines) { m_movingObstacles.push_back(&o); }
    for (auto &o : m_friendlyRobotObstacles) { m_movingObstacles.push_back(&o); }
    for (auto &o : m_opponentRobotObstacles) { m_movingObstacles.push_back(&o); }
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
        maxDistSq = std::max(maxDistSq, p.state.pos.distanceSq((*obstacle)[0].state.pos));
    }
    if (maxDistSq < 0.03f * 0.03f) {
        addCircle(obstacle->at(0).state.pos.x, obstacle->at(0).state.pos.y, radius + std::sqrt(maxDistSq), nullptr, prio);
        return;
    }
    const Obstacles::FriendlyRobotObstacle o(obstacle, radius + m_radius, prio);
    m_friendlyRobotObstacles.push_back(o);
}

void WorldInformation::addOpponentRobotObstacle(Vector startPos, Vector speed, int prio)
{
    m_opponentRobotObstacles.emplace_back(prio, m_radius, startPos, speed);
}

// obstacle checking

std::vector<Obstacles::Obstacle*> WorldInformation::intersectingObstacles(const Trajectory &trajectory) const
{
    const BoundingBox boundingBox = trajectory.calculateBoundingBox();
    std::vector<Obstacles::Obstacle*> intersectingObstacles;
    intersectingObstacles.reserve(m_obstacles.size());
    std::copy_if(m_obstacles.begin(), m_obstacles.end(), std::back_inserter(intersectingObstacles),
                 [&boundingBox](auto o) { return o->boundingBox().intersects(boundingBox); });
    return intersectingObstacles;
}

bool WorldInformation::isTrajectoryInObstacle(const Trajectory &profile, float timeOffset) const
{
    // TODO: field border??
    const auto obstacles = intersectingObstacles(profile);

    const float totalTime = profile.time();
    const float timeInterval = 0.025f;
    const int divisions = std::ceil(totalTime / timeInterval);

    Trajectory::Iterator iterator{profile, timeOffset};
    for (int i = 0;i<divisions;i++) {
        const auto point = iterator.next(timeInterval);
        for (const auto o : obstacles) {
            if (o->intersects(point)) {
                return true;
            }
        }
    }
    return false;
}

bool WorldInformation::isInStaticObstacle(Vector point) const
{
    if (!pointInPlayfield(point, m_radius)) {
        return true;
    }
    return std::any_of(m_staticObstacles.cbegin(), m_staticObstacles.cend(), [point](auto o) { return o->distance(point) <= 0; });
}

float WorldInformation::minObstacleDistancePoint(const TrajectoryPoint &point) const
{
    float minDistance = std::numeric_limits<float>::max();
    for (const auto o : m_obstacles) {
        const float d = o->distance(point);
        if (d <= 0) {
            return d;
        }
        minDistance = std::min(minDistance, d);
    }
    return minDistance;
}

bool WorldInformation::isInFriendlyStopPos(const Vector pos) const
{
    for (const auto &o : m_friendlyRobotObstacles) {
        if (o.intersects({{pos, Vector(0, 0)}, 200})) {
            return true;
        }
    }
    return false;
}

std::pair<float, float> WorldInformation::minObstacleDistance(const Trajectory &profile, float timeOffset, float safetyMargin) const
{
    const float totalTime = profile.time();
    float totalMinDistance = std::numeric_limits<float>::max();
    float lastPointDistance = std::numeric_limits<float>::max();

    const int DIVISIONS = 40;

    const auto trajectoryPoints = profile.trajectoryPositions(DIVISIONS, totalTime * (1.0f / (DIVISIONS-1)), timeOffset);

    for (int i : {0, DIVISIONS - 1}) {
        const float minDistance = minObstacleDistancePoint(trajectoryPoints[i]);
        if (minDistance < 0) {
            return {minDistance, minDistance};
        }
        lastPointDistance = std::min(lastPointDistance, minDistance);
    }

    BoundingBox trajectoryBox = profile.calculateBoundingBox();

    // check if the trajectory is in the playing field
    // this must be done before adding the safety margin to the trajectory bounding box
    if (!pointInPlayfield(Vector(trajectoryBox.left, trajectoryBox.top), m_radius) ||
            !pointInPlayfield(Vector(trajectoryBox.right, trajectoryBox.bottom), m_radius)) {
        return {-1, -1};
    }

    trajectoryBox.addExtraRadius(safetyMargin);

    for (auto obstacle : m_obstacles) {
        if (obstacle->boundingBox().intersects(trajectoryBox)) {
            for (const auto &point : trajectoryPoints) {
                const float dist = obstacle->zonedDistance(point, safetyMargin);
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
                        const float t = timeOffset + totalTime + i * AFTER_STOP_INTERVAL;
                        const float dist = obstacle->zonedDistance({trajectoryPoints.back().state, t}, safetyMargin);
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
    for (auto obstacle : m_obstacles) {
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
            const Obstacles::Circle circle(obstacle, obstacle.circle());
            m_circleObstacles.push_back(circle);
        } else if (obstacle.has_triangle()) {
            const Obstacles::Triangle triangle(obstacle, obstacle.triangle());
            m_triangleObstacles.push_back(triangle);
        } else if (obstacle.has_line()) {
            const Obstacles::Line line(obstacle, obstacle.line());
            m_lineObstacles.push_back(line);
        } else if (obstacle.has_rectangle()) {
            const Obstacles::Rect rect(obstacle, obstacle.rectangle());
            m_rectObstacles.push_back(rect);
        } else if (obstacle.has_moving_circle()) {
            const Obstacles::MovingCircle circle(obstacle, obstacle.moving_circle());
            m_movingCircles.push_back(circle);
        } else if (obstacle.has_moving_line()) {
            const Obstacles::MovingLine line(obstacle, obstacle.moving_line());
            m_movingLines.push_back(line);
        } else if (obstacle.has_friendly_robot()) {
            const Obstacles::FriendlyRobotObstacle robot(obstacle, obstacle.friendly_robot());
            m_friendlyRobotObstacles.push_back(robot);
        } else if (obstacle.has_opponent_robot()) {
            const Obstacles::OpponentRobotObstacle robot(obstacle, obstacle.opponent_robot());
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
        m_boundary = Obstacles::Rect(pathfinding::Obstacle(), state.boundary());
    }
}
