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

#include "obstacles.h"
#include <QDebug>

constexpr float PROJECT_EPSILON = 0.0001f;

static void setVector(Vector v, pathfinding::Vector *out)
{
    out->set_x(v.x);
    out->set_y(v.y);
}

static Vector deserializeVector(const pathfinding::Vector &v)
{
    Vector result(0, 0);
    if (v.has_x()) result.x = v.x();
    if (v.has_y()) result.y = v.y();
    return result;
}

Obstacles::StaticObstacle::StaticObstacle(const pathfinding::Obstacle &obstacle) :
    Obstacle(obstacle)
{
    if (obstacle.has_name()) {
        name = QByteArray::fromStdString(obstacle.name());
    }
}


// static obstacles
Obstacles::Circle::Circle(const pathfinding::Obstacle &obstacle, const pathfinding::CircleObstacle &circle) :
    StaticObstacle(obstacle),
    center(deserializeVector(circle.center()))
{ }

float Obstacles::Circle::distance(const Vector &v) const
{
    return v.distance(center) - radius;
}

float Obstacles::Circle::distance(const LineSegment &segment) const
{
    return segment.distance(center) - radius;
}

inline static float computeZonedIntersection(float distSq, float radius, float nearRadius)
{
    if (distSq <= (radius + nearRadius) * (radius + nearRadius)) {
        return std::sqrt(distSq) - radius;
    }
    return std::numeric_limits<float>::max();
}

float Obstacles::Circle::zonedDistance(const Vector &v, float nearRadius) const
{
    return computeZonedIntersection(v.distanceSq(center), radius, nearRadius);
}

Vector Obstacles::Circle::projectOut(Vector v, float extraDistance) const
{
    const float dist = v.distance(center);
    if (dist >= radius) {
        return v;
    }
    const float totalProjectRadius = radius + extraDistance;
    if (dist < PROJECT_EPSILON) {
        // project towards the center if possible
        if (center.distanceSq(Vector(0, 0)) < radius) {
            // not possible, just pick a direction
            return center + Vector(totalProjectRadius, 0);
        } else {
            return center - center.normalized() * totalProjectRadius;
        }
    }
    return center + (v - center) * (totalProjectRadius / dist);
}

BoundingBox Obstacles::Circle::boundingBox() const
{
    return BoundingBox(center - Vector(radius, radius), center + Vector(radius, radius));
}

void Obstacles::Circle::serializeChild(pathfinding::Obstacle *obstacle) const
{
    setVector(center, obstacle->mutable_circle()->mutable_center());
}

bool Obstacles::Circle::operator==(const Obstacle &otherObst) const
{
    const Obstacles::Circle &other = dynamic_cast<const Obstacles::Circle&>(otherObst);
    return prio == other.prio && radius == other.radius && center == other.center;
}

Obstacles::Line::Line(const pathfinding::Obstacle &obstacle, const pathfinding::LineObstacle &line) :
    StaticObstacle(obstacle),
    segment(deserializeVector(line.start()), deserializeVector(line.end()))
{ }

float Obstacles::Line::distance(const Vector &v) const
{
    return segment.distance(v) - radius;
}

float Obstacles::Line::zonedDistance(const Vector &v, float nearRadius) const
{
    return computeZonedIntersection(segment.distanceSq(v), radius, nearRadius);
}

float Obstacles::Line::distance(const LineSegment &segment) const
{
    return segment.distance(this->segment) - radius;
}

Vector Obstacles::Line::projectOut(Vector v, float extraDistance) const
{
    const float dist = segment.distance(v);
    if (dist >= radius) {
        return v;
    }
    const float totalProjectRadius = radius + extraDistance;
    const Vector closest = segment.closestPoint(v);
    if (v.distanceSq(closest) < PROJECT_EPSILON) {
        return closest + segment.normal() * totalProjectRadius;
    }
    return closest + (v - closest) * (totalProjectRadius / dist);
}

BoundingBox Obstacles::Line::boundingBox() const
{
    BoundingBox b(segment.start() - Vector(radius, radius), segment.start() +  Vector(radius, radius));
    b.mergePoint(segment.end() - Vector(radius, radius));
    b.mergePoint(segment.end() + Vector(radius, radius));
    return b;
}

void Obstacles::Line::serializeChild(pathfinding::Obstacle *obstacle) const
{
    const auto line = obstacle->mutable_line();
    setVector(segment.start(), line->mutable_start());
    setVector(segment.end(), line->mutable_end());
}

bool Obstacles::Line::operator==(const Obstacle &otherObst) const
{
    const Obstacles::Line &other = dynamic_cast<const Obstacles::Line&>(otherObst);
    return prio == other.prio && radius == other.radius && segment.start() == other.segment.start() && segment.end() == other.segment.end();
}

Obstacles::Rect::Rect() :
    StaticObstacle(nullptr, 0, 0),
    bottomLeft(Vector(0, 0)),
    topRight(Vector(0, 0))
{ }

Obstacles::Rect::Rect(const char* name, int prio, float x1, float y1, float x2, float y2, float radius) :
    StaticObstacle(name, prio, radius)
{
    bottomLeft.x = std::min(x1, x2);
    bottomLeft.y = std::min(y1, y2);
    topRight.x = std::max(x1, x2);
    topRight.y = std::max(y1, y2);
}

Obstacles::Rect::Rect(const pathfinding::Obstacle &obstacle, const pathfinding::RectObstacle &rect) :
    StaticObstacle(obstacle),
    bottomLeft(deserializeVector(rect.bottom_left())),
    topRight(deserializeVector(rect.top_right()))
{ }

float Obstacles::Rect::distance(const Vector &v) const
{
    return Rect::zonedDistance(v, std::numeric_limits<float>::infinity());
}

float Obstacles::Rect::zonedDistance(const Vector &v, float nearRadius) const
{
    const float distX = std::max(bottomLeft.x - v.x, v.x - topRight.x);
    const float distY = std::max(bottomLeft.y - v.y, v.y - topRight.y);

    if (distX >= 0 && distY >= 0) { // distance to corner
        return computeZonedIntersection(distX*distX + distY*distY, radius, nearRadius);
    } else if (distX < 0 && distY < 0) { // inside
        return std::max(distX, distY) - radius;
    } else if (distX < 0) { // distance to nearest side of the rectangle
        return distY - radius;
    } else {
        return distX - radius;
    }
}

Vector Obstacles::Rect::projectOut(Vector v, float extraDistance) const
{
    if (distance(v) > radius) {
        return v;
    }

    if ((v.x > bottomLeft.x && v.x < topRight.x) || (v.y > bottomLeft.y && v.y < topRight.y)) {
        // project the point out toward a side

        const float rightDist = LineSegment(topRight, Vector(topRight.x, bottomLeft.y)).distance(v);
        const float bottomDist = LineSegment(Vector(topRight.x, bottomLeft.y), bottomLeft).distance(v);
        const float leftDist = LineSegment(bottomLeft, Vector(bottomLeft.x, topRight.y)).distance(v);
        const float topDist = LineSegment(Vector(bottomLeft.x, topRight.y), topRight).distance(v);

        if (rightDist < std::min({bottomDist, leftDist, topDist})) {
            return Vector(topRight.x + radius + extraDistance, v.y);
        } else if (bottomDist < std::min(leftDist, topDist)) {
            return Vector(v.x, bottomLeft.y - radius - extraDistance);
        } else if (leftDist < topDist) {
            return Vector(bottomLeft.x - radius - extraDistance, v.y);
        } else {
            return Vector(v.x, topRight.y + radius + extraDistance);
        }
    } else {
        // project the point out of one of the corners

        Vector cornerPos;
        cornerPos.x = v.x < bottomLeft.x ? bottomLeft.x : topRight.x;
        cornerPos.y = v.y < bottomLeft.y ? bottomLeft.y : topRight.y;
        return Circle(nullptr, prio, radius, cornerPos).projectOut(v, extraDistance);
    }
}

float Obstacles::Rect::distance(const LineSegment &segment) const
{
    // check if end is inside the rectangle
    if (segment.end().x >= bottomLeft.x && segment.end().x <= topRight.x
            && segment.end().y >= bottomLeft.y && segment.end().y <= topRight.y) {
        return -radius;
    }
    // check if start is inside the rectangle
    if (segment.start().x >= bottomLeft.x && segment.start().x <= topRight.x
            && segment.start().y >= bottomLeft.y && segment.start().y <= topRight.y) {
        return -radius;
    }

    const Vector bottom_right(topRight.x, bottomLeft.y);
    const Vector top_left(bottomLeft.x, topRight.y);

    const float distTop = segment.distance(LineSegment(top_left, topRight));
    const float distBottom = segment.distance(LineSegment(bottomLeft, bottom_right));
    const float distLeft = segment.distance(LineSegment(top_left, bottomLeft));
    const float distRight = segment.distance(LineSegment(topRight, bottom_right));

    return std::min(std::min(distTop, distBottom), std::min(distLeft, distRight)) - radius;
}

BoundingBox Obstacles::Rect::boundingBox() const
{
    return BoundingBox(bottomLeft - Vector(radius, radius), topRight +  Vector(radius, radius));
}

void Obstacles::Rect::serializeChild(pathfinding::Obstacle *obstacle) const
{
    const auto rect = obstacle->mutable_rectangle();
    setVector(topRight, rect->mutable_top_right());
    setVector(bottomLeft, rect->mutable_bottom_left());
}

bool Obstacles::Rect::operator==(const Obstacle &otherObst) const
{
    const Obstacles::Rect &other = dynamic_cast<const Obstacles::Rect&>(otherObst);
    return prio == other.prio && radius == other.radius && bottomLeft == other.bottomLeft && topRight == other.topRight;
}

Obstacles::Triangle::Triangle(const char *name, int prio, float radius, Vector a, Vector b, Vector c) :
    StaticObstacle(name, prio, radius)
{
    // ensure that the triangle is oriented counter-clockwise
    const float det = Vector::det(a, b, c);
    if (det > 0) {
        p1 = a;
        p2 = b;
        p3 = c;
    } else {
        p1 = a;
        p2 = c;
        p3 = b;
    }
}

Obstacles::Triangle::Triangle(const pathfinding::Obstacle &obstacle, const pathfinding::TriangleObstacle &tri) :
    StaticObstacle(obstacle),
    p1(deserializeVector(tri.p1())),
    p2(deserializeVector(tri.p2())),
    p3(deserializeVector(tri.p3()))
{ }

float Obstacles::Triangle::distance(const Vector &v) const
{
    // positive det == left, negative det == right
    const float det1 = Vector::det(p2, p3, v) / p2.distance(p3);
    const float det2 = Vector::det(p3, p1, v) / p3.distance(p1);
    const float det3 = Vector::det(p1, p2, v) / p1.distance(p2);
    float distance;

    // v lies inside the triangle
    // 3 positive dets
    if (det1 >= 0 && det2 >= 0 && det3 >= 0) {
        distance = -std::min(det1, std::min(det2, det3));
    } else {
        // brute force check all corners and sides
        // otherwise, flat triangles are very hard to handle

        // this is however a bit wastefull since some distance will be calculated multiple times
        const float d1 = LineSegment(p1, p2).distance(v);
        const float d2 = LineSegment(p2, p3).distance(v);
        const float d3 = LineSegment(p1, p3).distance(v);

        distance = std::min(d1, std::min(d2, d3));
    }

    return distance - radius;
}

float Obstacles::Triangle::zonedDistance(const Vector &v, float) const
{
    return distance(v);
}

float Obstacles::Triangle::distance(const LineSegment &segment) const
{
    // at least one segment intersects a triangle side
    const LineSegment seg1(p1, p2);
    const LineSegment seg2(p2, p3);
    const LineSegment seg3(p3, p1);
    const float dseg1 = seg1.distance(segment);
    const float dseg2 = seg2.distance(segment);
    const float dseg3 = seg3.distance(segment);
    if (dseg1 * dseg2 * dseg3 == 0) {
        return 0;
    }

    // the segment lies entirely inside the triangle
    const float dstart = distance(segment.start());
    const float dend = distance(segment.end());
    if (dstart < 0 && dend < 0) {
        return 0;
    }

    // the segment lies entirely outside the triangle
    return std::max(std::min(dseg1, std::min(dseg2, dseg3)) - radius, 0.f);
}

BoundingBox Obstacles::Triangle::boundingBox() const
{
    BoundingBox b(p1 - Vector(radius, radius), p1 +  Vector(radius, radius));
    b.mergePoint(p2 - Vector(radius, radius));
    b.mergePoint(p2 + Vector(radius, radius));
    b.mergePoint(p3 - Vector(radius, radius));
    b.mergePoint(p3 + Vector(radius, radius));
    return b;
}

void Obstacles::Triangle::serializeChild(pathfinding::Obstacle *obstacle) const
{
    auto tri = obstacle->mutable_triangle();
    setVector(p1, tri->mutable_p1());
    setVector(p2, tri->mutable_p2());
    setVector(p3, tri->mutable_p3());
}

bool Obstacles::Triangle::operator==(const Obstacle &otherObst) const
{
    const Obstacles::Triangle &other = dynamic_cast<const Obstacles::Triangle&>(otherObst);
    return prio == other.prio && radius == other.radius && p1 == other.p1 && p2 == other.p2 && p2 == other.p2;
}


// moving obstacles

Obstacles::MovingCircle::MovingCircle(int prio, float radius, Vector start, Vector speed, Vector acc, float t0, float t1) :
    Obstacle(prio, radius),
    startPos(start),
    speed(speed),
    acc(acc),
    startTime(t0),
    endTime(t1)
{ }

Obstacles::MovingCircle::MovingCircle(const pathfinding::Obstacle &obstacle, const pathfinding::MovingCircleObstacle &circle) :
    Obstacle(obstacle),
    startPos(deserializeVector(circle.start_pos())),
    speed(deserializeVector(circle.speed())),
    acc(deserializeVector(circle.acc())),
    startTime(circle.start_time()),
    endTime(circle.end_time())
{ }

float Obstacles::MovingCircle::zonedDistance(const TrajectoryPoint &point, float nearRadius) const
{
    if (point.time < startTime || point.time > endTime) {
        return std::numeric_limits<float>::max();
    }
    const float t = point.time - startTime;
    const Vector centerAtTime = startPos + speed * t + acc * (0.5f * t * t);
    return computeZonedIntersection(centerAtTime.distanceSq(point.state.pos), radius, nearRadius);
}

static std::pair<float, float> range1D(float p0, float speed, float acc, float startTime, float endTime)
{
    const float timeDiff = endTime - startTime;
    const float endPos = p0 + speed * timeDiff + acc * (0.5f * timeDiff * timeDiff);

    if (acc == 0.0f) {
        return {std::min(p0, endPos), std::max(p0, endPos)};
    }
    const float zeroSpeedTime = std::abs(speed / acc);
    if ((speed < 0) != (acc < 0) && zeroSpeedTime <= endTime - startTime) {
        const float zeroSpeedPos = p0 + speed * zeroSpeedTime + acc * (0.5f * zeroSpeedTime * zeroSpeedTime);
        return {std::min({p0, endPos, zeroSpeedPos}), std::max({p0, endPos, zeroSpeedPos})};
    }
    return {std::min(p0, endPos), std::max(p0, endPos)};
}

BoundingBox Obstacles::MovingCircle::boundingBox() const
{
    const auto xRange = range1D(startPos.x, speed.x, acc.x, startTime, endTime);
    const auto yRange = range1D(startPos.y, speed.y, acc.y, startTime, endTime);
    BoundingBox result({xRange.first, yRange.first}, {xRange.second, yRange.second});
    result.addExtraRadius(radius);
    return result;
}

void Obstacles::MovingCircle::serializeChild(pathfinding::Obstacle *obstacle) const
{
    const auto circle = obstacle->mutable_moving_circle();
    setVector(startPos, circle->mutable_start_pos());
    setVector(speed, circle->mutable_speed());
    setVector(acc, circle->mutable_acc());
    circle->set_start_time(startTime);
    circle->set_end_time(endTime);
}

bool Obstacles::MovingCircle::operator==(const Obstacle &otherObst) const
{
    const Obstacles::MovingCircle &other = dynamic_cast<const Obstacles::MovingCircle&>(otherObst);
    return prio == other.prio && radius == other.radius && startPos == other.startPos && speed == other.speed
            && acc == other.acc && startTime == other.startTime && endTime == other.endTime;
}

Obstacles::MovingLine::MovingLine(int prio, float radius, Vector start1, Vector speed1, Vector acc1,
           Vector start2, Vector speed2, Vector acc2, float t0, float t1) :
    Obstacle(prio, radius),
    startPos1(start1),
    speed1(speed1),
    acc1(acc1),
    startPos2(start2),
    speed2(speed2),
    acc2(acc2),
    startTime(t0),
    endTime(t1)
{ }

Obstacles::MovingLine::MovingLine(const pathfinding::Obstacle &obstacle, const pathfinding::MovingLineObstacle &line) :
    Obstacle(obstacle),
    startPos1(deserializeVector(line.start_pos1())),
    speed1(deserializeVector(line.speed1())),
    acc1(deserializeVector(line.acc1())),
    startPos2(deserializeVector(line.start_pos2())),
    speed2(deserializeVector(line.speed2())),
    acc2(deserializeVector(line.acc2())),
    startTime(line.start_time()),
    endTime(line.end_time())
{ }

float Obstacles::MovingLine::zonedDistance(const TrajectoryPoint &point, float nearRadius) const
{
    if (point.time < startTime || point.time > endTime) {
        return std::numeric_limits<float>::max();
    }
    const float t = point.time - startTime;
    const Vector p1 = startPos1 + speed1 * t + acc1 * (0.5f * t * t);
    const Vector p2 = startPos2 + speed2 * t + acc2 * (0.5f * t * t);
    if (p1 == p2) {
        // this happens for example for time = 0
        return computeZonedIntersection(p1.distanceSq(point.state.pos), radius, nearRadius);
    }
    return computeZonedIntersection(LineSegment(p1, p2).distanceSq(point.state.pos), radius, nearRadius);
}

BoundingBox Obstacles::MovingLine::boundingBox() const
{
    const auto xRange1 = range1D(startPos1.x, speed1.x, acc1.x, startTime, endTime);
    const auto yRange1 = range1D(startPos1.y, speed1.y, acc1.y, startTime, endTime);
    BoundingBox result({xRange1.first, yRange1.first}, {xRange1.second, yRange1.second});
    const auto xRange2 = range1D(startPos2.x, speed2.x, acc2.x, startTime, endTime);
    const auto yRange2 = range1D(startPos2.y, speed2.y, acc2.y, startTime, endTime);
    result.mergePoint({xRange2.first, yRange2.first});
    result.mergePoint({xRange2.second, yRange2.second});
    result.addExtraRadius(radius);
    return result;
}

void Obstacles::MovingLine::serializeChild(pathfinding::Obstacle *obstacle) const
{
    auto line = obstacle->mutable_moving_line();
    setVector(startPos1, line->mutable_start_pos1());
    setVector(speed1, line->mutable_speed1());
    setVector(acc1, line->mutable_acc1());
    setVector(startPos2, line->mutable_start_pos2());
    setVector(speed2, line->mutable_speed2());
    setVector(acc2, line->mutable_acc2());
    line->set_start_time(startTime);
    line->set_end_time(endTime);
}

bool Obstacles::MovingLine::operator==(const Obstacle &otherObst) const
{
    const Obstacles::MovingLine &other = dynamic_cast<const Obstacles::MovingLine&>(otherObst);
    return prio == other.prio && radius == other.radius && startPos1 == other.startPos1 && speed1 == other.speed1
            && acc1 == other.acc1 && startPos2 == other.startPos2 && speed2 == other.speed2
            && acc2 == other.acc2 && startTime == other.startTime && endTime == other.endTime;
}

Obstacles::FriendlyRobotObstacle::FriendlyRobotObstacle() :
    Obstacle(0, 0),
    bound(Vector(0, 0), Vector(0, 0))
{ }

Obstacles::FriendlyRobotObstacle::FriendlyRobotObstacle(std::vector<TrajectoryPoint> *trajectory, float radius, int prio) :
    Obstacle(prio, radius),
    trajectory(trajectory),
    bound(trajectory->at(0).state.pos, trajectory->at(1).state.pos)
{
    timeInterval = trajectory->at(1).time - trajectory->at(0).time;
    for (std::size_t i = 2;i<trajectory->size();i++) {
        bound.mergePoint(trajectory->at(i).state.pos);
    }
    bound.addExtraRadius(radius);
}

Obstacles::FriendlyRobotObstacle::FriendlyRobotObstacle(const pathfinding::Obstacle &obstacle, const pathfinding::FriendlyRobotObstacle &robot) :
    Obstacle(obstacle),
    bound(Vector(1000, 1000), Vector(1000, 1000)) // outside of the field
{
    for (const pathfinding::TrajectoryPoint &point : robot.robot_trajectory()) {
        const Vector pos = deserializeVector(point.pos());
        const Vector speed = deserializeVector(point.speed());
        const float time = point.time();
        ownData.emplace_back(RobotState{pos, speed}, time);
    }
    trajectory = &ownData;
    timeInterval = trajectory->size() > 1 ? trajectory->at(1).time - trajectory->at(0).time : 1;

    // compute bound from trajectory
    if (trajectory->size() > 1) {
        bound = BoundingBox(trajectory->at(0).state.pos, trajectory->at(1).state.pos);
        for (std::size_t i = 2;i<trajectory->size();i++) {
            bound.mergePoint(trajectory->at(i).state.pos);
        }
        bound.addExtraRadius(radius);
    }
}

Obstacles::FriendlyRobotObstacle::FriendlyRobotObstacle(const Obstacles::FriendlyRobotObstacle &other) :
    Obstacles::Obstacle(other),
    trajectory(other.trajectory),
    timeInterval(other.timeInterval),
    bound(other.bound),
    ownData(other.ownData)
{
    if (trajectory == &other.ownData) {
        trajectory = &ownData;
    }
}

Obstacles::FriendlyRobotObstacle::FriendlyRobotObstacle(Obstacles::FriendlyRobotObstacle &&other) :
    Obstacles::Obstacle(other),
    trajectory(std::move(other.trajectory)),
    timeInterval(other.timeInterval),
    bound(other.bound),
    ownData(std::move(other.ownData))
{
    if (trajectory == &other.ownData) {
        trajectory = &ownData;
    }
}

Obstacles::FriendlyRobotObstacle &Obstacles::FriendlyRobotObstacle::operator=(const FriendlyRobotObstacle &other)
{
    prio = other.prio;
    radius = other.radius;
    trajectory = other.trajectory;
    timeInterval = other.timeInterval;
    bound = other.bound;
    ownData = other.ownData;

    if (trajectory == &other.ownData) {
        trajectory = &ownData;
    }
    return *this;
}

Obstacles::FriendlyRobotObstacle &Obstacles::FriendlyRobotObstacle::operator=(FriendlyRobotObstacle &&other)
{
    prio = other.prio;
    radius = other.radius;
    trajectory = std::move(other.trajectory);
    timeInterval = other.timeInterval;
    bound = other.bound;
    ownData = std::move(other.ownData);

    if (trajectory == &other.ownData) {
        trajectory = &ownData;
    }
    return *this;
}

float Obstacles::FriendlyRobotObstacle::zonedDistance(const TrajectoryPoint &point, float nearRadius) const
{
    const unsigned long index = std::min(static_cast<unsigned long>(trajectory->size()-1), static_cast<unsigned long>(point.time / timeInterval));
    return computeZonedIntersection((*trajectory)[index].state.pos.distanceSq(point.state.pos), radius, nearRadius);
}

Vector Obstacles::FriendlyRobotObstacle::projectOut(Vector v, float extraDistance) const
{
    if (trajectory->back().state.speed.lengthSquared() > 0.05f) {
        return v;
    }
    const Vector stopPos = trajectory->back().state.pos;
    const float dist = v.distance(stopPos);
    if (dist < 0.01f) {
        return stopPos + Vector(radius + extraDistance, 0);
    }
    if (dist >= radius) {
        return v;
    }
    return stopPos + (v - stopPos) * ((radius + extraDistance) / dist);
}

void Obstacles::FriendlyRobotObstacle::serializeChild(pathfinding::Obstacle *obstacle) const
{
    const auto robot = obstacle->mutable_friendly_robot();
    for (const TrajectoryPoint &p : *trajectory) {
        auto point = robot->add_robot_trajectory();
        setVector(p.state.pos, point->mutable_pos());
        setVector(p.state.speed, point->mutable_speed());
        point->set_time(p.time);
    }
}

bool Obstacles::FriendlyRobotObstacle::operator==(const Obstacle &otherObst) const
{
    const Obstacles::FriendlyRobotObstacle &other = dynamic_cast<const Obstacles::FriendlyRobotObstacle&>(otherObst);

    if (prio != other.prio || radius != other.radius || trajectory->size() != other.trajectory->size()) return false;
    return std::equal(trajectory->begin(), trajectory->end(), other.trajectory->begin(), [](TrajectoryPoint a, TrajectoryPoint b) {
        return a.time == b.time && a.state.pos == b.state.pos && a.state.speed == b.state.speed;
    });
}

Obstacles::OpponentRobotObstacle::OpponentRobotObstacle(int prio, float baseRadius, Vector start, Vector speed) :
    Obstacle(prio, baseRadius + ROBOT_RADIUS),
    startPos(start),
    speed(speed)
{ }

Obstacles::OpponentRobotObstacle::OpponentRobotObstacle(const pathfinding::Obstacle &obstacle, const pathfinding::OpponentRobotObstacle &circle) :
    Obstacle(obstacle),
    startPos(deserializeVector(circle.start_pos())),
    speed(deserializeVector(circle.speed()))
{ }

static float safetyDistance(const Vector ownSpeed, const Vector oppSpeed)
{
    const float SLOW_ROBOT = 0.3;

    float safetyDistance = std::max(0.0f, std::min(1.0f, ownSpeed.distance(oppSpeed) * (1.0f / 1.25f)) * 0.15f - 0.05f);
    if (ownSpeed.lengthSquared() < 0.5f * 0.5f) {
        safetyDistance = std::min(safetyDistance, 0.02f);
    }
    if (ownSpeed.lengthSquared() < SLOW_ROBOT * SLOW_ROBOT && oppSpeed.lengthSquared() < SLOW_ROBOT * SLOW_ROBOT) {
        safetyDistance = safetyDistance - 0.02;
    }
    return safetyDistance;
}

float Obstacles::OpponentRobotObstacle::zonedDistance(const TrajectoryPoint &point, float nearRadius) const
{
    if (point.time > MAX_TIME) {
        return std::numeric_limits<float>::max();
    }
    const float totalRadius = radius + safetyDistance(point.state.speed, speed);
    const Vector centerAtTime = startPos + speed * point.time;
    const float distSq = centerAtTime.distanceSq(point.state.pos);
    return computeZonedIntersection(distSq, totalRadius, nearRadius);
}

BoundingBox Obstacles::OpponentRobotObstacle::boundingBox() const
{
    const float maxSafetyDistance = safetyDistance(Vector(-5, 0), Vector(5, 0));
    const auto xRange = range1D(startPos.x, speed.x, 0, 0, MAX_TIME);
    const auto yRange = range1D(startPos.y, speed.y, 0, 0, MAX_TIME);
    BoundingBox result({xRange.first, yRange.first}, {xRange.second, yRange.second});
    result.addExtraRadius(radius + maxSafetyDistance);
    return result;
}

void Obstacles::OpponentRobotObstacle::serializeChild(pathfinding::Obstacle *obstacle) const
{
    const auto circle = obstacle->mutable_opponent_robot();
    setVector(startPos, circle->mutable_start_pos());
    setVector(speed, circle->mutable_speed());
}

bool Obstacles::OpponentRobotObstacle::operator==(const Obstacle &otherObst) const
{
    const Obstacles::OpponentRobotObstacle &other = dynamic_cast<const Obstacles::OpponentRobotObstacle&>(otherObst);
    return prio == other.prio && radius == other.radius && startPos == other.startPos && speed == other.speed;
}
