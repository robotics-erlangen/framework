#ifndef FIELDTRANSFORM_H
#define FIELDTRANSFORM_H

#include <array>

class FieldTransform
{
public:
    FieldTransform();
    void setFlip(bool flip);
    void setTransform(const std::array<float, 6> &values);
    float applyPosX(float x, float y) const;
    float applyPosY(float x, float y) const;
    float applySpeedX(float x, float y) const;
    float applySpeedY(float x, float y) const;
    float applyAngle(float angle) const;

private:
    void reCalculateTransform();

private:
    bool m_lastFlipped;
    bool m_hasTransform;
    std::array<float, 6> m_transform;
    std::array<float, 6> m_baseTransform;
};

#endif // FIELDTRANSFORM_H
