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

void WorldInformation::setRadius(float r)
{
    m_radius = r;
}

void WorldInformation::setBoundary(float x1, float y1, float x2, float y2)
{
    m_boundary.bottom_left.x = std::min(x1, x2);
    m_boundary.bottom_left.y = std::min(y1, y2);
    m_boundary.top_right.x = std::max(x1, x2);
    m_boundary.top_right.y = std::max(y1, y2);
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
    m_avoidanceLines.clear();
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
    StaticObstacles::Circle c;
    c.center.x = x;
    c.center.y = y;
    c.radius = radius;
    c.name = name;
    c.prio = prio;
    m_circleObstacles.append(c);
}

void WorldInformation::addLine(float x1, float y1, float x2, float y2, float width, const char* name, int prio)
{
    StaticObstacles::Line l(Vector(x1, y1), Vector(x2, y2));
    l.radius = width;
    l.name = name;
    l.prio = prio;
    m_lineObstacles.append(l);
}

void WorldInformation::addRect(float x1, float y1, float x2, float y2, const char* name, int prio)
{
    StaticObstacles::Rect r;
    r.bottom_left.x = std::min(x1, x2);
    r.bottom_left.y = std::min(y1, y2);
    r.top_right.x = std::max(x1, x2);
    r.top_right.y = std::max(y1, y2);
    r.name = name;
    r.prio = prio;
    m_rectObstacles.append(r);
}

void WorldInformation::addTriangle(float x1, float y1, float x2, float y2, float x3, float y3, float lineWidth, const char *name, int prio)
{
    StaticObstacles::Triangle t;
    t.radius = lineWidth;
    t.name = name;
    t.prio = prio;

    // ensure that the triangle is oriented counter-clockwise
    const Vector a(x1, y1);
    const Vector b(x2, y2);
    const Vector c(x3, y3);
    const float det = Vector::det(a, b, c);
    if (det > 0) {
        t.p1 = a;
        t.p2 = b;
        t.p3 = c;
    } else {
        t.p1 = a;
        t.p2 = c;
        t.p3 = b;
    }
    m_triangleObstacles.append(t);
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
}

bool WorldInformation::pointInPlayfield(const Vector &point, float radius) const
{
    if (point.x - radius < m_boundary.bottom_left.x ||
           point.x + radius > m_boundary.top_right.x ||
           point.y - radius < m_boundary.bottom_left.y ||
           point.y + radius > m_boundary.top_right.y) {
        return false;
    }
    return true;
}


// moving obstacles
void WorldInformation::addMovingCircle(Vector startPos, Vector speed, Vector acc, float startTime, float endTime, float radius, int prio)
{
    MovingObstacles::MovingCircle m;
    m.startPos = startPos;
    m.speed = speed;
    m.acc = acc;
    m.startTime = startTime;
    m.endTime = endTime;
    m.radius = radius + m_radius;
    m.prio = prio;
    m_movingCircles.push_back(m);
}

void WorldInformation::addMovingLine(Vector startPos1, Vector speed1, Vector acc1, Vector startPos2, Vector speed2,
                                   Vector acc2, float startTime, float endTime, float width, int prio)
{
    MovingObstacles::MovingLine l;
    l.startPos1 = startPos1;
    l.speed1 = speed1;
    l.acc1 = acc1;
    l.startPos2 = startPos2;
    l.speed2 = speed2;
    l.acc2 = acc2;
    l.startTime = startTime;
    l.endTime = endTime;
    l.radius = width + m_radius;
    l.prio = prio;
    m_movingLines.push_back(l);
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

void WorldInformation::addAvoidanceLine(Vector s0, Vector s1, float radius, float avoidanceFactor)
{
    StaticObstacles::AvoidanceLine line;
    line.segment = LineSegment(s0, s1);
    line.radius = radius;
    line.avoidanceFactor = avoidanceFactor;
    m_avoidanceLines.push_back(line);
}


// obstacle checking
bool WorldInformation::isInMovingObstacle(const std::vector<MovingObstacles::MovingObstacle*> &obstacles, Vector point, float time) const
{
    if (time >= IGNORE_MOVING_OBSTACLE_THRESHOLD) {
        return false;
    }
    for (const auto o : obstacles) {
        if (o->intersects(point, time)) {
            return true;
        }
    }
    return false;
}

bool WorldInformation::isTrajectoryInObstacle(const SpeedProfile &profile, float timeOffset, float slowDownTime, Vector startPos) const
{
    BoundingBox trajectoryBoundingBox = profile.calculateBoundingBox(startPos, 0);
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

    float totalTime = slowDownTime > 0 ? profile.timeWithSlowDown(slowDownTime) : profile.time();
    for (int i = 0;i<40;i++) {
        float time = totalTime * i / 39.0f;
        Vector pos = slowDownTime > 0 ? profile.positionForTimeSlowDown(time, slowDownTime) : profile.positionForTime(time);
        if (isInStaticObstacle(intersectingStaticObstacles, pos + startPos)) {
            return true;
        }
        if (isInMovingObstacle(intersectingMovingObstacles, pos + startPos, time + timeOffset)) {
            return true;
        }
    }
    return false;
}

float WorldInformation::minObstacleDistance(Vector pos, float time, bool checkStatic) const
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
    if (time < IGNORE_MOVING_OBSTACLE_THRESHOLD) {
        for (const auto o : m_movingObstacles) {
            float d = o->distance(pos, time);
            if (d <= 0) {
                return d;
            }
            minDistance = std::min(minDistance, d);
        }
    }
    // avoidance obstacles
    for (const auto &l : m_avoidanceLines) {
        float d = std::max(0.01f, l.distance(pos));
        minDistance = std::min(minDistance, d);
    }
    return minDistance;
}

std::pair<float, float> WorldInformation::minObstacleDistance(const SpeedProfile &profile, float timeOffset, float slowDownTime, Vector startPos) const
{
    float totalTime = slowDownTime > 0 ? profile.timeWithSlowDown(slowDownTime) : profile.time();
    float totalMinDistance = std::numeric_limits<float>::max();
    float lastPointDistance = 0;

    const int DIVISIONS = 40;
    Vector lastPos;
    for (int i = 0;i<DIVISIONS;i++) {
        float time = totalTime * i / float(DIVISIONS);
        Vector pos = slowDownTime > 0 ? profile.positionForTimeSlowDown(time, slowDownTime) : profile.positionForTime(time);
        if (!pointInPlayfield(pos + startPos, m_radius)) {
            return {-1.0f, -1.0f};
        }
        float minDistance = minObstacleDistance(pos + startPos, time + timeOffset, true);
        if (minDistance < 0) {
            return {minDistance, minDistance};
        }

        if (i == DIVISIONS-1) {
            lastPointDistance = minDistance;
            lastPos = pos;
        }
        totalMinDistance = std::min(totalMinDistance, minDistance);
    }

    // try to avoid moving obstacles even when the robot reaches its goal
    if (profile.speedForTime(totalTime * 2.0f) == Vector(0, 0)) {
        const float AFTER_STOP_AVOIDANCE_TIME = 0.5f;
        if (totalTime < AFTER_STOP_AVOIDANCE_TIME) {
            const float AFTER_STOP_INTERVAL = 0.03f;
            for (int i = 0;i<int((AFTER_STOP_AVOIDANCE_TIME - totalTime) * (1.0f / AFTER_STOP_INTERVAL));i++) {
                float t = timeOffset + totalTime + i * AFTER_STOP_INTERVAL;
                float minDistance = minObstacleDistance(lastPos + startPos, t, false);
                if (minDistance < 0) {
                    return {minDistance, minDistance};
                }
                totalMinDistance = std::min(totalMinDistance, minDistance);
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
}
