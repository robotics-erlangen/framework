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
    StaticObstacles::Circle c;
    c.center.x = x;
    c.center.y = y;
    c.radius = radius;
    c.name = name;
    c.prio = prio;
    m_circleObstacles.append(c);
}

void AbstractPath::addLine(float x1, float y1, float x2, float y2, float width, const char* name, int prio)
{
    StaticObstacles::Line l(Vector(x1, y1), Vector(x2, y2));
    l.radius = width;
    l.name = name;
    l.prio = prio;
    m_lineObstacles.append(l);
}

void AbstractPath::addRect(float x1, float y1, float x2, float y2, const char* name, int prio)
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

void AbstractPath::addTriangle(float x1, float y1, float x2, float y2, float x3, float y3, float lineWidth, const char *name, int prio)
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

void AbstractPath::collectObstacles() const
{
    m_obstacles.clear();
    for (const StaticObstacles::Circle &c: m_circleObstacles) { m_obstacles.append(&c); }
    for (const StaticObstacles::Rect &r: m_rectObstacles) { m_obstacles.append(&r); }
    for (const StaticObstacles::Triangle &t: m_triangleObstacles) { m_obstacles.append(&t); }
    for (const StaticObstacles::Line &l: m_lineObstacles) { m_obstacles.append(&l); }
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
