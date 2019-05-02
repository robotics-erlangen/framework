#ifndef BOUNDINGBOX_H
#define BOUNDINGBOX_H

#include "vector.h"
#include <algorithm>

class BoundingBox {
public:
    BoundingBox(Vector topLeft, Vector bottomRight);
    bool isInside(Vector p);
    bool intersects(const BoundingBox &other);
    void scaleSize(float scale);
    void mergePoint(Vector p);

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

#endif // BOUNDINGBOX_H
