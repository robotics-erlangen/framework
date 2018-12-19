#include "fieldtransform.h"
#include <cmath>

FieldTransform::FieldTransform() :
    m_lastFlipped(false),
    m_hasTransform(false),
    m_baseTransform({1, 0, 0, 1, 0, 0})
{
    reCalculateTransform();
}

void FieldTransform::setFlip(bool flip)
{
    if (flip != m_lastFlipped) {
        m_lastFlipped = flip;
        reCalculateTransform();
    }
}

void FieldTransform::setTransform(const std::array<float, 6> &values)
{
    m_hasTransform = true;
    if (values == std::array<float, 6>({1, 0, 0, 1, 0, 0})) {
        m_hasTransform = false;
    }
    m_baseTransform = values;
    reCalculateTransform();
}

void FieldTransform::reCalculateTransform()
{
    m_transform = m_baseTransform;
    if (m_lastFlipped) {
        for (int i = 0;i<4;i++) {
            m_transform[i] = -m_transform[i];
        }
    }
}

float FieldTransform::applyPosX(float x, float y) const
{
    return m_transform[0] * x + m_transform[1] * y + m_transform[4];
}

float FieldTransform::applyPosY(float x, float y) const
{
    return m_transform[2] * x + m_transform[3] * y + m_transform[5];
}

float FieldTransform::applySpeedX(float x, float y) const
{
    return m_transform[0] * x + m_transform[1] * y;
}

float FieldTransform::applySpeedY(float x, float y) const
{
    return m_transform[2] * x + m_transform[3] * y;
}

float FieldTransform::applyAngle(float angle) const
{
    if (m_lastFlipped && !m_hasTransform) {
        return angle + M_PI;
    } else if (!m_hasTransform) {
        return angle;
    } else {
        // only do this rather expensive calculation if a non regular transform is set
        float x = std::cos(angle);
        float y = std::sin(angle);
        float xTransformed = applySpeedX(x, y);
        float yTransformed = applySpeedY(x, y);
        return std::atan2(yTransformed, xTransformed);
    }
}
