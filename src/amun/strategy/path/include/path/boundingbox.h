/***************************************************************************
 *   Copyright 2020 Andreas Wendler                                        *
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

#ifndef BOUNDINGBOX_H
#define BOUNDINGBOX_H

#include "core/vector.h"
#include <algorithm>

class BoundingBox {
public:
    BoundingBox(Vector topLeft, Vector bottomRight);
    bool isInside(Vector p);
    bool intersects(const BoundingBox &other);
    void scaleSize(float scale);
    void mergePoint(Vector p);
    void addExtraRadius(float radius);

    float top; // y maximum
    float bottom; // y minimum
    float left; // x minimum
    float right; // x maximum
};

inline BoundingBox::BoundingBox(Vector topLeft, Vector bottomRight) :
    top(std::max(topLeft.y, bottomRight.y)),
    bottom(std::min(topLeft.y, bottomRight.y)),
    left(std::min(topLeft.x, bottomRight.x)),
    right(std::max(topLeft.x, bottomRight.x))
{ }

inline bool BoundingBox::isInside(Vector p)
{
    return p.y >= top && p.y <= bottom &&
            p.x >= left && p.x <= right;
}

inline bool BoundingBox::intersects(const BoundingBox &other)
{
    float xDiff = std::abs(left + right - other.left - other.right) * 0.5f;
    if (xDiff > (other.right - other.left) + (right - left)) {
        return false;
    }
    float yDiff = std::abs(top + bottom - other.top - other.bottom) * 0.5f;
    if (yDiff > (other.top - other.bottom) + (top - bottom)) {
        return false;
    }
    return true;
}

inline void BoundingBox::scaleSize(float scale)
{
    float centerX = (left + right) * 0.5f;
    float centerY = (top + bottom) * 0.5f;
    left = centerX + (left - centerX) * scale;
    right = centerX + (right - centerX) * scale;
    top = centerY + (top - centerY) * scale;
    bottom = centerY + (bottom - centerY) * scale;
}

inline void BoundingBox::mergePoint(Vector p)
{
    left = std::min(left, p.x);
    right = std::max(right, p.x);
    bottom = std::min(bottom, p.y);
    top = std::max(top, p.y);
}

inline void BoundingBox::addExtraRadius(float radius)
{
    left -= radius;
    right += radius;
    bottom -= radius;
    top += radius;
}

#endif // BOUNDINGBOX_H
