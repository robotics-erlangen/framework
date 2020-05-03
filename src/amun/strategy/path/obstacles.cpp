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

void StaticObstacles::Obstacle::deserializeCommon(const pathfinding::Obstacle &obstacle)
{
    if (obstacle.has_name()) {
        name = QByteArray::fromStdString(obstacle.name());
    }
    prio = obstacle.has_prio() ? obstacle.prio() : 0;
    radius = obstacle.has_radius() ? obstacle.radius() : 0;
}


// static obstacles

float StaticObstacles::Circle::distance(const Vector &v) const
{
    return v.distance(center) - radius;
}

float StaticObstacles::Circle::distance(const LineSegment &segment) const
{
    return segment.distance(center) - radius;
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

void StaticObstacles::Circle::deserialize(const pathfinding::CircleObstacle &obstacle)
{
    if (obstacle.has_center()) {
        center = deserializeVector(obstacle.center());
    }
}

float StaticObstacles::Line::distance(const Vector &v) const
{
    return segment.distance(v) - radius;
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

void StaticObstacles::Line::deserialize(const pathfinding::LineObstacle &obstacle)
{
    Vector start, end;
    if (obstacle.has_start()) {
        start = deserializeVector(obstacle.start());
    }
    if (obstacle.has_end()) {
        end = deserializeVector(obstacle.end());
    }
    segment = LineSegment(start, end);
}

void StaticObstacles::AvoidanceLine::serializeChild(pathfinding::Obstacle *obstacle) const
{
    auto line = obstacle->mutable_avoidance_line();
    setVector(segment.start(), line->mutable_start());
    setVector(segment.end(), line->mutable_end());
    line->set_avoidance_factor(avoidanceFactor);
}

void StaticObstacles::AvoidanceLine::deserialize(const pathfinding::AvoidanceLineObstacle &obstacle)
{
    Vector start, end;
    if (obstacle.has_start()) {
        start = deserializeVector(obstacle.start());
    }
    if (obstacle.has_end()) {
        end = deserializeVector(obstacle.end());
    }
    segment = LineSegment(start, end);
    if (obstacle.has_avoidance_factor()) {
        avoidanceFactor = obstacle.avoidance_factor();
    }
}

float StaticObstacles::Rect::distance(const Vector &v) const
{
    float distX = std::max(bottom_left.x - v.x, v.x - top_right.x);
    float distY = std::max(bottom_left.y - v.y, v.y - top_right.y);

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

float StaticObstacles::Rect::distance(const LineSegment &segment) const
{
    // check if end is inside the rectangle
    if (segment.end().x >= bottom_left.x && segment.end().x <= top_right.x
            && segment.end().y >= bottom_left.y && segment.end().y <= top_right.y) {
        return -radius;
    }
    // check if start is inside the rectangle
    if (segment.start().x >= bottom_left.x && segment.start().x <= top_right.x
            && segment.start().y >= bottom_left.y && segment.start().y <= top_right.y) {
        return -radius;
    }

    Vector bottom_right(top_right.x, bottom_left.y);
    Vector top_left(bottom_left.x, top_right.y);

    float distTop = segment.distance(LineSegment(top_left, top_right));
    float distBottom = segment.distance(LineSegment(bottom_left, bottom_right));
    float distLeft = segment.distance(LineSegment(top_left, bottom_left));
    float distRight = segment.distance(LineSegment(top_right, bottom_right));

    return std::min(std::min(distTop, distBottom), std::min(distLeft, distRight)) - radius;
}

BoundingBox StaticObstacles::Rect::boundingBox() const
{
    return BoundingBox(bottom_left - Vector(radius, radius), top_right +  Vector(radius, radius));
}

void StaticObstacles::Rect::serializeChild(pathfinding::Obstacle *obstacle) const
{
    auto rect = obstacle->mutable_rectangle();
    setVector(top_right, rect->mutable_top_right());
    setVector(bottom_left, rect->mutable_bottom_left());
}

void StaticObstacles::Rect::deserialize(const pathfinding::RectObstacle &obstacle)
{
    if (obstacle.has_top_right()) {
        top_right = deserializeVector(obstacle.top_right());
    }
    if (obstacle.has_bottom_left()) {
        bottom_left = deserializeVector(obstacle.bottom_left());
    }
}

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
    }

    // v lies closest to a side
    // 2 positive dets, 1 negative det
    else if (det1 * det2 * det3 < 0) {
        distance = -std::min(det1, std::min(det2, det3));
    }

    // v lies closest to a corner
    // 1 positive det, 2 negative dets
    else if (det1 > 0) {
        distance = p1.distance(v);
    }
    else if (det2 > 0) {
        distance = p2.distance(v);
    }
    else if (det3 > 0) {
        distance = p3.distance(v);
    }

    else {
        qDebug() << "Error in Path::Triangle::distance()" << det1 << det2 << det3;
        return 42;
    }

    return distance - radius;
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

void StaticObstacles::Triangle::deserialize(const pathfinding::TriangleObstacle &obstacle)
{
    if (obstacle.has_p1()) {
        p1 = deserializeVector(obstacle.p1());
    }
    if (obstacle.has_p2()) {
        p2 = deserializeVector(obstacle.p2());
    }
    if (obstacle.has_p3()) {
        p3 = deserializeVector(obstacle.p3());
    }
}



// moving obstacles

void MovingObstacles::MovingObstacle::deserializeCommon(const pathfinding::Obstacle &obstacle)
{
    prio = obstacle.has_prio() ? obstacle.prio() : 0;
    radius = obstacle.has_radius() ? obstacle.radius() : 0;
}

bool MovingObstacles::MovingCircle::intersects(Vector pos, float time) const
{
    if (time < startTime || time > endTime) {
        return false;
    }
    float t = time - startTime;
    Vector centerAtTime = startPos + speed * t + acc * (0.5f * t * t);
    return centerAtTime.distanceSq(pos) < radius * radius;
}

float MovingObstacles::MovingCircle::distance(Vector pos, float time) const
{
    if (time < startTime || time > endTime) {
        return std::numeric_limits<float>::max();
    }
    float t = time - startTime;
    Vector centerAtTime = startPos + speed * t + acc * (0.5f * t * t);
    return centerAtTime.distance(pos) - radius;
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

void MovingObstacles::MovingCircle::deserialize(const pathfinding::MovingCircleObstacle &obstacle)
{
    if (obstacle.has_start_pos()) {
        startPos = deserializeVector(obstacle.start_pos());
    }
    if (obstacle.has_speed()) {
        speed = deserializeVector(obstacle.speed());
    }
    if (obstacle.has_acc()) {
        acc = deserializeVector(obstacle.acc());
    }
    if (obstacle.has_start_time()) {
        startTime = obstacle.start_time();
    }
    if (obstacle.has_end_time()) {
        endTime = obstacle.end_time();
    }
}

bool MovingObstacles::MovingLine::intersects(Vector pos, float time) const
{
    if (time < startTime || time > endTime) {
        return false;
    }
    float t = time - startTime;
    const Vector p1 = startPos1 + speed1 * t + acc1 * (0.5f * t * t);
    const Vector p2 = startPos2 + speed2 * t + acc2 * (0.5f * t * t);
    return LineSegment(p1, p2).distance(pos) < radius;
}

float MovingObstacles::MovingLine::distance(Vector pos, float time) const
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

void MovingObstacles::MovingLine::deserialize(const pathfinding::MovingLineObstacle &obstacle)
{
    if (obstacle.has_start_pos1()) {
        startPos1 = deserializeVector(obstacle.start_pos1());
    }
    if (obstacle.has_speed1()) {
        speed1 = deserializeVector(obstacle.speed1());
    }
    if (obstacle.has_acc1()) {
        acc1 = deserializeVector(obstacle.acc1());
    }
    if (obstacle.has_start_pos2()) {
        startPos2 = deserializeVector(obstacle.start_pos2());
    }
    if (obstacle.has_speed2()) {
        speed2 = deserializeVector(obstacle.speed2());
    }
    if (obstacle.has_acc2()) {
        acc2 = deserializeVector(obstacle.acc2());
    }
    if (obstacle.has_start_time()) {
        startTime = obstacle.start_time();
    }
    if (obstacle.has_end_time()) {
        endTime = obstacle.end_time();
    }
}

MovingObstacles::FriendlyRobotObstacle::FriendlyRobotObstacle() :
    bound(Vector(0, 0), Vector(0, 0))
{ }

MovingObstacles::FriendlyRobotObstacle::FriendlyRobotObstacle(std::vector<TrajectoryPoint> *trajectory, float radius, int prio) :
    trajectory(trajectory),
    bound(trajectory->at(0).pos, trajectory->at(1).pos)
{
    this->prio = prio;
    this->radius = radius;
    timeInterval = trajectory->at(1).time - trajectory->at(0).time;
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

bool MovingObstacles::FriendlyRobotObstacle::intersects(Vector pos, float time) const
{
    unsigned long index = std::min(static_cast<unsigned long>(trajectory->size()-1), static_cast<unsigned long>(time / timeInterval));
    return (*trajectory)[index].pos.distanceSq(pos) < radius * radius;
}

float MovingObstacles::FriendlyRobotObstacle::distance(Vector pos, float time) const
{
    unsigned long index = std::min(static_cast<unsigned long>(trajectory->size()-1), static_cast<unsigned long>(time / timeInterval));
    return (*trajectory)[index].pos.distance(pos) - radius;
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

void MovingObstacles::FriendlyRobotObstacle::deserialize(const pathfinding::FriendlyRobotObstacle &obstacle)
{
    ownData.clear();
    for (const pathfinding::TrajectoryPoint &point : obstacle.robot_trajectory()) {
        TrajectoryPoint p;
        if (point.has_pos()) {
            p.pos = deserializeVector(point.pos());
        }
        if (point.has_speed()) {
            p.speed = deserializeVector(point.speed());
        }
        if (point.has_time()) {
            p.time = point.time();
        }
        ownData.push_back(p);
    }
    trajectory = &ownData;
    timeInterval = trajectory->size() > 1 ? trajectory->at(1).time - trajectory->at(0).time : 1;
}
