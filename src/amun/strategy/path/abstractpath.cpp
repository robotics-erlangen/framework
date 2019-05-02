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

#include "abstractpath.h"
#include "core/rng.h"
#include <QDebug>

float AbstractPath::Circle::distance(const Vector &v) const
{
    return v.distance(center) - radius;
}

float AbstractPath::Circle::distance(const LineSegment &segment) const
{
    return segment.distance(center) - radius;
}

Vector AbstractPath::Circle::projectOut(Vector v, float extraDistance) const
{
    float dist = v.distance(center);
    if (dist >= radius) {
        return v;
    }
    return center + (v - center) * ((radius + extraDistance) / dist);
}

BoundingBox AbstractPath::Circle::boundingBox() const
{
    return BoundingBox(center - Vector(radius, radius), center + Vector(radius, radius));
}

float AbstractPath::Line::distance(const Vector &v) const
{
    return segment.distance(v) - radius;
}

float AbstractPath::Line::distance(const LineSegment &segment) const
{
    return segment.distance(this->segment) - radius;
}

Vector AbstractPath::Line::projectOut(Vector v, float extraDistance) const
{
    float dist = segment.distance(v);
    if (dist >= radius) {
        return v;
    }
    Vector closest = segment.closestPoint(v);
    return closest + (v - closest) * ((radius + extraDistance) / dist);
}

BoundingBox AbstractPath::Line::boundingBox() const
{
    BoundingBox b(segment.start() - Vector(radius, radius), segment.start() +  Vector(radius, radius));
    b.mergePoint(segment.end() - Vector(radius, radius));
    b.mergePoint(segment.end() + Vector(radius, radius));
    return b;
}

float AbstractPath::Rect::distance(const Vector &v) const
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

float AbstractPath::Rect::distance(const LineSegment &segment) const
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

BoundingBox AbstractPath::Rect::boundingBox() const
{
    return BoundingBox(bottom_left - Vector(radius, radius), top_right +  Vector(radius, radius));
}

float AbstractPath::Triangle::distance(const Vector &v) const
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

float AbstractPath::Triangle::distance(const LineSegment &segment) const
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

BoundingBox AbstractPath::Triangle::boundingBox() const
{
    BoundingBox b(p1 - Vector(radius, radius), p1 +  Vector(radius, radius));
    b.mergePoint(p2 - Vector(radius, radius));
    b.mergePoint(p2 + Vector(radius, radius));
    b.mergePoint(p3 - Vector(radius, radius));
    b.mergePoint(p3 + Vector(radius, radius));
    return b;
}

AbstractPath::AbstractPath(uint32_t rng_seed) :
    m_rng(new RNG(rng_seed)),
    m_radius(-1.f)
{

}

AbstractPath::~AbstractPath()
{
    delete m_rng;
}

void AbstractPath::seedRandom(uint32_t seed)
{
    m_rng->seed(seed);
}

void AbstractPath::setRadius(float r)
{
    m_radius = r;
}

void AbstractPath::setBoundary(float x1, float y1, float x2, float y2)
{
    m_boundary.bottom_left.x = std::min(x1, x2);
    m_boundary.bottom_left.y = std::min(y1, y2);
    m_boundary.top_right.x = std::max(x1, x2);
    m_boundary.top_right.y = std::max(y1, y2);
}

void AbstractPath::clearObstacles()
{
    m_circleObstacles.clear();
    m_rectObstacles.clear();
    m_triangleObstacles.clear();
    m_lineObstacles.clear();

    clearObstaclesCustom();
}

void AbstractPath::addCircle(float x, float y, float radius, const char* name, int prio)
{
    Circle c;
    c.center.x = x;
    c.center.y = y;
    c.radius = radius;
    c.name = name;
    c.prio = prio;
    m_circleObstacles.append(c);
}

void AbstractPath::addLine(float x1, float y1, float x2, float y2, float width, const char* name, int prio)
{
    Line l(Vector(x1, y1), Vector(x2, y2));
    l.radius = width;
    l.name = name;
    l.prio = prio;
    m_lineObstacles.append(l);
}

void AbstractPath::addRect(float x1, float y1, float x2, float y2, const char* name, int prio)
{
    Rect r;
    r.bottom_left.x = std::min(x1, x2);
    r.bottom_left.y = std::min(y1, y2);
    r.top_right.x = std::max(x1, x2);
    r.top_right.y = std::max(y1, y2);
    r.name = name;
    r.prio = prio;
    m_rectObstacles.append(r);
}

void AbstractPath::addTriangle(float x1, float y1, float x2, float y2, float x3, float y3, float lineWidth, const char *name, int prio)
{
    Triangle t;
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

void AbstractPath::collectObstacles() const
{
    m_obstacles.clear();
    for (const Circle &c: m_circleObstacles) { m_obstacles.append(&c); }
    for (const Rect &r: m_rectObstacles) { m_obstacles.append(&r); }
    for (const Triangle &t: m_triangleObstacles) { m_obstacles.append(&t); }
    for (const Line &l: m_lineObstacles) { m_obstacles.append(&l); }
}

bool AbstractPath::pointInPlayfield(const Vector &point, float radius) const
{
    if (point.x - radius < m_boundary.bottom_left.x ||
           point.x + radius > m_boundary.top_right.x ||
           point.y - radius < m_boundary.bottom_left.y ||
           point.y + radius > m_boundary.top_right.y) {
        return false;
    }
    return true;
}
