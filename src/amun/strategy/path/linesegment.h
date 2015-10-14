/***************************************************************************
 *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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

#ifndef LINESEGMENT_H
#define LINESEGMENT_H

#include "vector.h"
#include <algorithm>
#include <cassert>

/*!
 * \ingroup path
 * \brief The LineSegment class provides a two-dimensional line segment
 */
class LineSegment
{
public:
    LineSegment(const Vector& start, const Vector& end);

public:
    float distance(const Vector& pos) const;
    float distanceSigned(const Vector& pos) const;
    float distanceDirect(const Vector& pos) const;
    float distance(const LineSegment& segment) const;

    //! Returns the start point of the line.
    const Vector& start() const { return m_start; }

    //! Returns the end point of the line.
    const Vector& end() const { return m_end; }

    //! Returns the direction vector of the line.
    const Vector& dir() const { return m_dir; }

    //! Returns the normal vector of the line.
    const Vector& normal() const { return m_normal; }

private:
    Vector m_start;
    Vector m_end;
    Vector m_dir;
    Vector m_normal;
};

/*!
 * \brief Constructs a line segment with the given start and end point
 * \param start Start point of line
 * \param end End point of line
 */
inline LineSegment::LineSegment(const Vector& start, const Vector& end) :
    m_start(start),
    m_end(end)
{
    assert(m_start != m_end);
    m_dir = (m_end - m_start).normalized();
    m_normal = m_dir.perpendicular();
}

/*!
 * \brief Returns the distance of the given point to the line segment
 * \param pos The point to calculate the distance to
 * \return Distance to the given point
 */
inline float LineSegment::distance(const Vector& pos) const
{
    return std::abs(distanceSigned(pos));
}

inline float LineSegment::distanceSigned(const Vector& pos) const
{
    Vector d;

    d = pos - m_start;
    if (d * m_dir < 0.0f) {
        return d.length();
    }

    d = pos - m_end;
    if (d * m_dir > 0.0f) {
        return d.length();
    }

    return d * m_normal;
}

inline float LineSegment::distanceDirect(const Vector& pos) const
{
    Vector d;

    d = pos - m_start;
    if (d * m_dir < 0.0f) {
        return 0.0f;
    }

    d = pos - m_end;
    if (d * m_dir > 0.0f) {
        return 0.0f;
    }

    return d * m_normal;
}

/*!
 * \brief Returns the distance between two line segments
 * \param segment Another line segment
 * \return The distance between the two segments
 */
inline float LineSegment::distance(const LineSegment& segment) const
{
    float d = INFINITY;
    d = std::min(d, distance(segment.start()));
    d = std::min(d, distance(segment.end()));
    d = std::min(d, segment.distance(start()));
    d = std::min(d, segment.distance(end()));

    Vector diff = segment.start() - start();
    float t1 = (segment.normal() * diff) / (segment.normal() * dir());
    float t2 = -(normal() * diff) / (normal() * segment.dir());
    if (0 <= t1 && t1 <= end().distance(start()) && 0 <= t2
            && t2 <= segment.end().distance(segment.start())) {
        return 0;
    }

    return d;
}

#endif // LINESEGMENT_H
