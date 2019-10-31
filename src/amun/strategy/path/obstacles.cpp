#include "obstacles.h"
#include <QDebug>


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



// moving obstacles

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

bool MovingObstacles::MovingLine::intersects(Vector pos, float time) const
{
    if (time < startTime || time > endTime) {
        return false;
    }
    float t = time - startTime;
    const Vector p1 = startPos1 + speed1 * t + acc1 * (0.5f * t * t);
    const Vector p2 = startPos2 + speed2 * t + acc2 * (0.5f * t * t);
    return LineSegment(p1, p2).distance(pos) < width;
}

float MovingObstacles::MovingLine::distance(Vector pos, float time) const
{
    if (time < startTime || time > endTime) {
        return std::numeric_limits<float>::max();
    }
    const Vector p1 = startPos1 + speed1 * time;
    const Vector p2 = startPos2 + speed2 * time;
    return LineSegment(p1, p2).distance(pos) - width;
}

MovingObstacles::FriendlyRobotObstacle::FriendlyRobotObstacle() :
    bound(Vector(0, 0), Vector(0, 0))
{ }

MovingObstacles::FriendlyRobotObstacle::FriendlyRobotObstacle(std::vector<TrajectoryPoint> *trajectory, float radius, int prio) :
    trajectory(trajectory),
    radius(radius),
    bound(trajectory->at(0).pos, trajectory->at(1).pos)
{
    this->prio = prio;
    timeInterval = trajectory->at(1).time - trajectory->at(0).time;
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
