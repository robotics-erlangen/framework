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

StaticObstacles::Obstacle::Obstacle(const pathfinding::Obstacle &obstacle)
{
    if (obstacle.has_name()) {
        name = QByteArray::fromStdString(obstacle.name());
    }
    prio = obstacle.has_prio() ? obstacle.prio() : 0;
    radius = obstacle.has_radius() ? obstacle.radius() : 0;
}


// static obstacles
StaticObstacles::Circle::Circle(const pathfinding::Obstacle &obstacle, const pathfinding::CircleObstacle &circle) :
    Obstacle(obstacle),
    center(deserializeVector(circle.center()))
{ }

float StaticObstacles::Circle::distance(const Vector &v) const
{
    return v.distance(center) - radius;
}

float StaticObstacles::Circle::distance(const LineSegment &segment) const
{
    return segment.distance(center) - radius;
}

inline static ZonedIntersection computeZonedIntersection(float distSq, float radius, float nearRadius)
{
    if (distSq <= radius * radius) {
        return ZonedIntersection::IN_OBSTACLE;
    } else if (distSq <= (radius + nearRadius) * (radius + nearRadius)) {
        return ZonedIntersection::NEAR_OBSTACLE;
    }
    return ZonedIntersection::FAR_AWAY;
}

inline static ZonedIntersection computeZonedIntersectionLinear(float dist, float radius, float nearRadius)
{
    if (dist <= radius) {
        return ZonedIntersection::IN_OBSTACLE;
    } else if (dist <= radius + nearRadius) {
        return ZonedIntersection::NEAR_OBSTACLE;
    }
    return ZonedIntersection::FAR_AWAY;
}

ZonedIntersection StaticObstacles::Circle::zonedDistance(const Vector &v, float nearRadius) const
{
    return computeZonedIntersection(v.distanceSq(center), radius, nearRadius);
}

Vector StaticObstacles::Circle::projectOut(Vector v, float extraDistance) const
{
    float dist = v.distance(center);
    if (dist >= radius) {
        return v;
    }
    return center + (v - center) * ((radius + extraDistance) / dist);
}

BoundingBox StaticObstacles::Circle::boundingBox() const
{
    return BoundingBox(center - Vector(radius, radius), center + Vector(radius, radius));
}

void StaticObstacles::Circle::serializeChild(pathfinding::Obstacle *obstacle) const
{
    setVector(center, obstacle->mutable_circle()->mutable_center());
}

StaticObstacles::Line::Line(const pathfinding::Obstacle &obstacle, const pathfinding::LineObstacle &line) :
    Obstacle(obstacle),
    segment(deserializeVector(line.start()), deserializeVector(line.end()))
{ }

float StaticObstacles::Line::distance(const Vector &v) const
{
    return segment.distance(v) - radius;
}

ZonedIntersection StaticObstacles::Line::zonedDistance(const Vector &v, float nearRadius) const
{
    return computeZonedIntersection(segment.distanceSq(v), radius, nearRadius);
}

float StaticObstacles::Line::distance(const LineSegment &segment) const
{
    return segment.distance(this->segment) - radius;
}

Vector StaticObstacles::Line::projectOut(Vector v, float extraDistance) const
{
    float dist = segment.distance(v);
    if (dist >= radius) {
        return v;
    }
    Vector closest = segment.closestPoint(v);
    return closest + (v - closest) * ((radius + extraDistance) / dist);
}

BoundingBox StaticObstacles::Line::boundingBox() const
{
    BoundingBox b(segment.start() - Vector(radius, radius), segment.start() +  Vector(radius, radius));
    b.mergePoint(segment.end() - Vector(radius, radius));
    b.mergePoint(segment.end() + Vector(radius, radius));
    return b;
}

void StaticObstacles::Line::serializeChild(pathfinding::Obstacle *obstacle) const
{
    auto line = obstacle->mutable_line();
    setVector(segment.start(), line->mutable_start());
    setVector(segment.end(), line->mutable_end());
}

StaticObstacles::Rect::Rect() :
    Obstacle(nullptr, 0, 0),
    bottomLeft(Vector(0, 0)),
    topRight(Vector(0, 0))
{ }

StaticObstacles::Rect::Rect(const char* name, int prio, float x1, float y1, float x2, float y2, float radius) :
    Obstacle(name, prio, radius)
{
    bottomLeft.x = std::min(x1, x2);
    bottomLeft.y = std::min(y1, y2);
    topRight.x = std::max(x1, x2);
    topRight.y = std::max(y1, y2);
}

StaticObstacles::Rect::Rect(const pathfinding::Obstacle &obstacle, const pathfinding::RectObstacle &rect) :
    Obstacle(obstacle),
    bottomLeft(deserializeVector(rect.bottom_left())),
    topRight(deserializeVector(rect.top_right()))
{ }

float StaticObstacles::Rect::distance(const Vector &v) const
{
    float distX = std::max(bottomLeft.x - v.x, v.x - topRight.x);
    float distY = std::max(bottomLeft.y - v.y, v.y - topRight.y);

    if (distX >= 0 && distY >= 0) { // distance to corner
        return std::sqrt(distX*distX + distY*distY) - radius;
    } else if (distX < 0 && distY < 0) { // inside
        return std::max(distX, distY) - radius;
    } else if (distX < 0) {
        return distY - radius; // distance to nearest side of the rectangle
    } else {
        return distX - radius;
    }
}

ZonedIntersection StaticObstacles::Rect::zonedDistance(const Vector &v, float nearRadius) const
{
    float distX = std::max(bottomLeft.x - v.x, v.x - topRight.x);
    float distY = std::max(bottomLeft.y - v.y, v.y - topRight.y);

    if (distX >= 0 && distY >= 0) { // distance to corner
        return computeZonedIntersection(distX*distX + distY*distY, radius, nearRadius);
    } else if (distX < 0 && distY < 0) { // inside
        return computeZonedIntersectionLinear(std::max(distX, distY), radius, nearRadius);
    } else if (distX < 0) { // distance to nearest side of the rectangle
        return computeZonedIntersectionLinear(distY, radius, nearRadius);
    } else {
        return computeZonedIntersectionLinear(distX, radius, nearRadius);
    }
}

Vector StaticObstacles::Rect::projectOut(Vector v, float extraDistance) const
{
    if (distance(v) > radius) {
        return v;
    }

    if ((v.x > bottomLeft.x && v.x < topRight.x) || (v.y > bottomLeft.y && v.y < topRight.y)) {
        // project the point out toward a side

        float rightDist = LineSegment(topRight, Vector(topRight.x, bottomLeft.y)).distance(v);
        float bottomDist = LineSegment(Vector(topRight.x, bottomLeft.y), bottomLeft).distance(v);
        float leftDist = LineSegment(bottomLeft, Vector(bottomLeft.x, topRight.y)).distance(v);
        float topDist = LineSegment(Vector(bottomLeft.x, topRight.y), topRight).distance(v);

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

float StaticObstacles::Rect::distance(const LineSegment &segment) const
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

    Vector bottom_right(topRight.x, bottomLeft.y);
    Vector top_left(bottomLeft.x, topRight.y);

    float distTop = segment.distance(LineSegment(top_left, topRight));
    float distBottom = segment.distance(LineSegment(bottomLeft, bottom_right));
    float distLeft = segment.distance(LineSegment(top_left, bottomLeft));
    float distRight = segment.distance(LineSegment(topRight, bottom_right));

    return std::min(std::min(distTop, distBottom), std::min(distLeft, distRight)) - radius;
}

BoundingBox StaticObstacles::Rect::boundingBox() const
{
    return BoundingBox(bottomLeft - Vector(radius, radius), topRight +  Vector(radius, radius));
}

void StaticObstacles::Rect::serializeChild(pathfinding::Obstacle *obstacle) const
{
    auto rect = obstacle->mutable_rectangle();
    setVector(topRight, rect->mutable_top_right());
    setVector(bottomLeft, rect->mutable_bottom_left());
}

StaticObstacles::Triangle::Triangle(const char *name, int prio, float radius, Vector a, Vector b, Vector c) :
    Obstacle(name, prio, radius)
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

StaticObstacles::Triangle::Triangle(const pathfinding::Obstacle &obstacle, const pathfinding::TriangleObstacle &tri) :
    Obstacle(obstacle),
    p1(deserializeVector(tri.p1())),
    p2(deserializeVector(tri.p2())),
    p3(deserializeVector(tri.p3()))
{ }

float StaticObstacles::Triangle::distance(const Vector &v) const
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

ZonedIntersection StaticObstacles::Triangle::zonedDistance(const Vector &v, float nearRadius) const
{
    // TODO: optimize this code, but it would result in quite a lot of code duplication
    return computeZonedIntersectionLinear(distance(v) + radius, radius, nearRadius);
}

float StaticObstacles::Triangle::distance(const LineSegment &segment) const
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

BoundingBox StaticObstacles::Triangle::boundingBox() const
{
    BoundingBox b(p1 - Vector(radius, radius), p1 +  Vector(radius, radius));
    b.mergePoint(p2 - Vector(radius, radius));
    b.mergePoint(p2 + Vector(radius, radius));
    b.mergePoint(p3 - Vector(radius, radius));
    b.mergePoint(p3 + Vector(radius, radius));
    return b;
}

void StaticObstacles::Triangle::serializeChild(pathfinding::Obstacle *obstacle) const
{
    auto tri = obstacle->mutable_triangle();
    setVector(p1, tri->mutable_p1());
    setVector(p2, tri->mutable_p2());
    setVector(p3, tri->mutable_p3());
}



// moving obstacles

MovingObstacles::MovingCircle::MovingCircle(int prio, float radius, Vector start, Vector speed, Vector acc, float t0, float t1) :
    MovingObstacle(prio, radius),
    startPos(start),
    speed(speed),
    acc(acc),
    startTime(t0),
    endTime(t1)
{ }

MovingObstacles::MovingCircle::MovingCircle(const pathfinding::Obstacle &obstacle, const pathfinding::MovingCircleObstacle &circle) :
    MovingObstacle(obstacle),
    startPos(deserializeVector(circle.start_pos())),
    speed(deserializeVector(circle.speed())),
    acc(deserializeVector(circle.acc())),
    startTime(circle.start_time()),
    endTime(circle.end_time())
{ }

bool MovingObstacles::MovingCircle::intersects(Vector pos, float time, Vector) const
{
    if (time < startTime || time > endTime) {
        return false;
    }
    float t = time - startTime;
    Vector centerAtTime = startPos + speed * t + acc * (0.5f * t * t);
    return centerAtTime.distanceSq(pos) < radius * radius;
}

float MovingObstacles::MovingCircle::distance(Vector pos, float time, Vector) const
{
    if (time < startTime || time > endTime) {
        return std::numeric_limits<float>::max();
    }
    float t = time - startTime;
    Vector centerAtTime = startPos + speed * t + acc * (0.5f * t * t);
    return centerAtTime.distance(pos) - radius;
}

ZonedIntersection MovingObstacles::MovingCircle::zonedDistance(const Vector &pos, float time, float nearRadius, Vector) const
{
    if (time < startTime || time > endTime) {
        return ZonedIntersection::FAR_AWAY;
    }
    float t = time - startTime;
    Vector centerAtTime = startPos + speed * t + acc * (0.5f * t * t);
    return computeZonedIntersection(centerAtTime.distanceSq(pos), radius, nearRadius);
}

static std::pair<float, float> range1D(float p0, float speed, float acc, float startTime, float endTime)
{
    float timeDiff = endTime - startTime;
    float endPos = p0 + speed * timeDiff + acc * (0.5f * timeDiff * timeDiff);

    if (acc == 0.0f) {
        return {std::min(p0, endPos), std::max(p0, endPos)};
    }
    float zeroSpeedTime = std::abs(speed / acc);
    if ((speed < 0) != (acc < 0) && zeroSpeedTime <= endTime - startTime) {
        float zeroSpeedPos = p0 + speed * zeroSpeedTime + acc * (0.5f * zeroSpeedTime * zeroSpeedTime);
        return {std::min({p0, endPos, zeroSpeedPos}), std::max({p0, endPos, zeroSpeedPos})};
    }
    return {std::min(p0, endPos), std::max(p0, endPos)};
}

BoundingBox MovingObstacles::MovingCircle::boundingBox() const
{
    auto xRange = range1D(startPos.x, speed.x, acc.x, startTime, endTime);
    auto yRange = range1D(startPos.y, speed.y, acc.y, startTime, endTime);
    BoundingBox result({xRange.first, yRange.first}, {xRange.second, yRange.second});
    result.addExtraRadius(radius);
    return result;
}

void MovingObstacles::MovingCircle::serializeChild(pathfinding::Obstacle *obstacle) const
{
    auto circle = obstacle->mutable_moving_circle();
    setVector(startPos, circle->mutable_start_pos());
    setVector(speed, circle->mutable_speed());
    setVector(acc, circle->mutable_acc());
    circle->set_start_time(startTime);
    circle->set_end_time(endTime);
}

MovingObstacles::MovingLine::MovingLine(int prio, float radius, Vector start1, Vector speed1, Vector acc1,
           Vector start2, Vector speed2, Vector acc2, float t0, float t1) :
    MovingObstacle(prio, radius),
    startPos1(start1),
    speed1(speed1),
    acc1(acc1),
    startPos2(start2),
    speed2(speed2),
    acc2(acc2),
    startTime(t0),
    endTime(t1)
{ }

MovingObstacles::MovingLine::MovingLine(const pathfinding::Obstacle &obstacle, const pathfinding::MovingLineObstacle &line) :
    MovingObstacle(obstacle),
    startPos1(deserializeVector(line.start_pos1())),
    speed1(deserializeVector(line.speed1())),
    acc1(deserializeVector(line.acc1())),
    startPos2(deserializeVector(line.start_pos2())),
    speed2(deserializeVector(line.speed2())),
    acc2(deserializeVector(line.acc2())),
    startTime(line.start_time()),
    endTime(line.end_time())
{ }

bool MovingObstacles::MovingLine::intersects(Vector pos, float time, Vector) const
{
    if (time < startTime || time > endTime) {
        return false;
    }
    float t = time - startTime;
    const Vector p1 = startPos1 + speed1 * t + acc1 * (0.5f * t * t);
    const Vector p2 = startPos2 + speed2 * t + acc2 * (0.5f * t * t);
    return LineSegment(p1, p2).distanceSq(pos) < radius * radius;
}

float MovingObstacles::MovingLine::distance(Vector pos, float time, Vector) const
{
    if (time < startTime || time > endTime) {
        return std::numeric_limits<float>::max();
    }
    float t = time - startTime;
    const Vector p1 = startPos1 + speed1 * t + acc1 * (0.5f * t * t);
    const Vector p2 = startPos2 + speed2 * t + acc2 * (0.5f * t * t);
    if (p1 == p2) {
        // this happens for example for time = 0
        return p1.distance(pos) - radius;
    }
    return LineSegment(p1, p2).distance(pos) - radius;
}

ZonedIntersection MovingObstacles::MovingLine::zonedDistance(const Vector &pos, float time, float nearRadius, Vector) const
{
    if (time < startTime || time > endTime) {
        return ZonedIntersection::FAR_AWAY;
    }
    float t = time - startTime;
    const Vector p1 = startPos1 + speed1 * t + acc1 * (0.5f * t * t);
    const Vector p2 = startPos2 + speed2 * t + acc2 * (0.5f * t * t);
    if (p1 == p2) {
        // this happens for example for time = 0
        return computeZonedIntersection(p1.distanceSq(pos), radius, nearRadius);
    }
    return computeZonedIntersection(LineSegment(p1, p2).distanceSq(pos), radius, nearRadius);
}

BoundingBox MovingObstacles::MovingLine::boundingBox() const
{
    auto xRange1 = range1D(startPos1.x, speed1.x, acc1.x, startTime, endTime);
    auto yRange1 = range1D(startPos1.y, speed1.y, acc1.y, startTime, endTime);
    BoundingBox result({xRange1.first, yRange1.first}, {xRange1.second, yRange1.second});
    auto xRange2 = range1D(startPos2.x, speed2.x, acc2.x, startTime, endTime);
    auto yRange2 = range1D(startPos2.y, speed2.y, acc2.y, startTime, endTime);
    result.mergePoint({xRange2.first, yRange2.first});
    result.mergePoint({xRange2.second, yRange2.second});
    result.addExtraRadius(radius);
    return result;
}

void MovingObstacles::MovingLine::serializeChild(pathfinding::Obstacle *obstacle) const
{
    auto circle = obstacle->mutable_moving_circle();
    setVector(startPos1, circle->mutable_start_pos());
    setVector(speed1, circle->mutable_speed());
    setVector(acc1, circle->mutable_acc());
    setVector(startPos2, circle->mutable_start_pos());
    setVector(speed2, circle->mutable_speed());
    setVector(acc2, circle->mutable_acc());
    circle->set_start_time(startTime);
    circle->set_end_time(endTime);
}

MovingObstacles::FriendlyRobotObstacle::FriendlyRobotObstacle() :
    MovingObstacle(0, 0),
    bound(Vector(0, 0), Vector(0, 0))
{ }

MovingObstacles::FriendlyRobotObstacle::FriendlyRobotObstacle(std::vector<TrajectoryPoint> *trajectory, float radius, int prio) :
    MovingObstacle(prio, radius),
    trajectory(trajectory),
    bound(trajectory->at(0).pos, trajectory->at(1).pos)
{
    timeInterval = trajectory->at(1).time - trajectory->at(0).time;
    for (std::size_t i = 2;i<trajectory->size();i++) {
        bound.mergePoint(trajectory->at(i).pos);
    }
    bound.addExtraRadius(radius);
}

MovingObstacles::FriendlyRobotObstacle::FriendlyRobotObstacle(const pathfinding::Obstacle &obstacle, const pathfinding::FriendlyRobotObstacle &robot) :
    MovingObstacle(obstacle),
    bound(Vector(1000, 1000), Vector(1000, 1000)) // outside of the field
{
    for (const pathfinding::TrajectoryPoint &point : robot.robot_trajectory()) {
        TrajectoryPoint p;
        p.pos = deserializeVector(point.pos());
        p.speed = deserializeVector(point.speed());
        p.time = point.time();
        ownData.push_back(p);
    }
    trajectory = &ownData;
    timeInterval = trajectory->size() > 1 ? trajectory->at(1).time - trajectory->at(0).time : 1;

    // compute bound from trajectory
    if (trajectory->size() > 1) {
        bound = BoundingBox(trajectory->at(0).pos, trajectory->at(1).pos);
        for (std::size_t i = 2;i<trajectory->size();i++) {
            bound.mergePoint(trajectory->at(i).pos);
        }
        bound.addExtraRadius(radius);
    }
}

MovingObstacles::FriendlyRobotObstacle::FriendlyRobotObstacle(const MovingObstacles::FriendlyRobotObstacle &other) :
    MovingObstacles::MovingObstacle(other),
    trajectory(other.trajectory),
    timeInterval(other.timeInterval),
    bound(other.bound),
    ownData(other.ownData)
{
    if (trajectory == &other.ownData) {
        trajectory = &ownData;
    }
}

MovingObstacles::FriendlyRobotObstacle::FriendlyRobotObstacle(MovingObstacles::FriendlyRobotObstacle &&other) :
    MovingObstacles::MovingObstacle(other),
    trajectory(std::move(other.trajectory)),
    timeInterval(other.timeInterval),
    bound(other.bound),
    ownData(std::move(other.ownData))
{
    if (trajectory == &other.ownData) {
        trajectory = &ownData;
    }
}

MovingObstacles::FriendlyRobotObstacle &MovingObstacles::FriendlyRobotObstacle::operator=(const FriendlyRobotObstacle &other)
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

MovingObstacles::FriendlyRobotObstacle &MovingObstacles::FriendlyRobotObstacle::operator=(FriendlyRobotObstacle &&other)
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

bool MovingObstacles::FriendlyRobotObstacle::intersects(Vector pos, float time, Vector) const
{
    unsigned long index = std::min(static_cast<unsigned long>(trajectory->size()-1), static_cast<unsigned long>(time / timeInterval));
    return (*trajectory)[index].pos.distanceSq(pos) < radius * radius;
}

float MovingObstacles::FriendlyRobotObstacle::distance(Vector pos, float time, Vector) const
{
    unsigned long index = std::min(static_cast<unsigned long>(trajectory->size()-1), static_cast<unsigned long>(time / timeInterval));
    return (*trajectory)[index].pos.distance(pos) - radius;
}

ZonedIntersection MovingObstacles::FriendlyRobotObstacle::zonedDistance(const Vector &pos, float time, float nearRadius, Vector) const
{
    unsigned long index = std::min(static_cast<unsigned long>(trajectory->size()-1), static_cast<unsigned long>(time / timeInterval));
    return computeZonedIntersection((*trajectory)[index].pos.distanceSq(pos), radius, nearRadius);
}

void MovingObstacles::FriendlyRobotObstacle::serializeChild(pathfinding::Obstacle *obstacle) const
{
    auto robot = obstacle->mutable_friendly_robot();
    for (TrajectoryPoint p : *trajectory) {
        auto point = robot->add_robot_trajectory();
        setVector(p.pos, point->mutable_pos());
        setVector(p.speed, point->mutable_speed());
        point->set_time(p.time);
    }
}

MovingObstacles::OpponentRobotObstacle::OpponentRobotObstacle(int prio, float baseRadius, Vector start, Vector speed) :
    MovingObstacle(prio, baseRadius + ROBOT_RADIUS),
    startPos(start),
    speed(speed)
{ }

MovingObstacles::OpponentRobotObstacle::OpponentRobotObstacle(const pathfinding::Obstacle &obstacle, const pathfinding::OpponentRobotObstacle &circle) :
    MovingObstacle(obstacle),
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

bool MovingObstacles::OpponentRobotObstacle::intersects(Vector pos, float time, Vector ownSpeed) const
{
    if (time > MAX_TIME) {
        return false;
    }
    const float totalRadius = radius + safetyDistance(ownSpeed, speed);
    const Vector centerAtTime = startPos + speed * time;
    return centerAtTime.distanceSq(pos) < totalRadius * totalRadius;
}

float MovingObstacles::OpponentRobotObstacle::distance(Vector pos, float time, Vector ownSpeed) const
{
    if (time > MAX_TIME) {
        return std::numeric_limits<float>::max();
    }
    const float totalRadius = radius + safetyDistance(ownSpeed, speed);
    const Vector centerAtTime = startPos + speed * time;
    return centerAtTime.distance(pos) - totalRadius;
}

ZonedIntersection MovingObstacles::OpponentRobotObstacle::zonedDistance(const Vector &pos, float time, float nearRadius, Vector ownSpeed) const
{
    if (time > MAX_TIME) {
        return ZonedIntersection::FAR_AWAY;
    }
    const float totalRadius = radius + safetyDistance(ownSpeed, speed);
    const Vector centerAtTime = startPos + speed * time;
    const float distSq = centerAtTime.distanceSq(pos);
    return computeZonedIntersection(distSq, totalRadius, nearRadius);
}

BoundingBox MovingObstacles::OpponentRobotObstacle::boundingBox() const
{
    const float maxSafetyDistance = safetyDistance(Vector(-5, 0), Vector(5, 0));
    const auto xRange = range1D(startPos.x, speed.x, 0, 0, MAX_TIME);
    const auto yRange = range1D(startPos.y, speed.y, 0, 0, MAX_TIME);
    BoundingBox result({xRange.first, yRange.first}, {xRange.second, yRange.second});
    result.addExtraRadius(radius + maxSafetyDistance);
    return result;
}

void MovingObstacles::OpponentRobotObstacle::serializeChild(pathfinding::Obstacle *obstacle) const
{
    auto circle = obstacle->mutable_opponent_robot();
    setVector(startPos, circle->mutable_start_pos());
    setVector(speed, circle->mutable_speed());
}
