/***************************************************************************
 *   Copyright 2025 Paul Bergmann                                          *
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

#ifndef AREAOFINTEREST_H
#define AREAOFINTEREST_H

#include "coordinates.h"
#include "fieldtransform.h"
#include "vector.h"

/** \brief Area of interest for positions
 *
 * This class allows checking if a position is within a certain area of
 * interest.
 */
struct AreaOfInterest
{
    /** \brief Construct a new empty area of interest
     */
    AreaOfInterest() = default;

    /** \brief Construct a new area of interest
     *
     * Parameters are meter-based coordinates.
     */
    AreaOfInterest(float x1, float y1, float x2, float y2) :
        m_x1(std::min(x1, x2)),
        m_y1(std::min(y1, y2)),
        m_x2(std::max(x1, x2)),
        m_y2(std::max(y1, y2))
    {}

    /** \brief Check if a position (in vision coordinates) is within the area
     * of interest. Boundaries are excluded.
     *
     * \param pos The position to check
     * \param transform The field transform to apply
     * \return True if the position is within the area of interest
     */
    bool containsVision(const Vector &pos, const FieldTransform &transform) const
    {
        Vector local;
        coordinates::fromVision(pos, local);

        float xn = transform.applyPosX(local.x, local.y);
        float yn = transform.applyPosY(local.x, local.y);

        return (xn > m_x1 && xn < m_x2 && yn > m_y1 && yn < m_y2);
    }

    float x1() const { return m_x1; }
    float y1() const { return m_y1; }
    float x2() const { return m_x2; }
    float y2() const { return m_y2; }

private:
    float m_x1 = 0.0f;
    float m_y1 = 0.0f;
    float m_x2 = 0.0f;
    float m_y2 = 0.0f;
};

#endif // AREAOFINTEREST_H
