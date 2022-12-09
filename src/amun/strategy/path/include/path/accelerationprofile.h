/***************************************************************************
 *   Copyright 2022 Andreas Wendler                                        *
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

#ifndef ACCELERATIONPROFILE_H
#define ACCELERATIONPROFILE_H

#include "trajectoryinput.h"

struct VT {
    Vector v;
    float t;
};

class ConstantAcceleration {
public:

    struct SegmentPrecomputation {
        float invSegmentTime;
    };

    ConstantAcceleration(float, float) {}

    inline Vector segmentOffset(const VT &first, const VT &second, SegmentPrecomputation) const
    {
        return (first.v + second.v) * (0.5f * (second.t - first.t));
    }

    inline std::pair<Vector, Vector> partialSegmentOffsetAndSpeed(const VT &first, const VT &second, SegmentPrecomputation precomp,
                                                                float transformedT0, float time) const
    {
        const float timeDiff = time - transformedT0;
        const float diff = second.t == first.t ? 1 : timeDiff * precomp.invSegmentTime;
        const Vector speed = first.v + (second.v - first.v) * diff;
        const Vector partDist = (first.v + speed) * (0.5f * timeDiff);
        return {partDist, speed};
    }

    inline float timeForSegment(const VT &first, const VT &second, SegmentPrecomputation) const
    {
        return second.t - first.t;
    }

    inline SegmentPrecomputation precomputeSegment(const VT &first, const VT &second) const
    {
        return {1.0f / (second.t - first.t)};
    }
};

class SlowdownAcceleration {
public:

    static constexpr float MIN_ACC_FACTOR = 0.3f;
    static constexpr float SLOW_DOWN_TIME = 0.2f;

    struct SegmentPrecomputation {
        ConstantAcceleration::SegmentPrecomputation constantPrecomputation;
        Vector v0{0, 0};
        Vector a0{0, 0};
        Vector a1{0, 0};
        float segmentTime{0}; // time of the segment (slow down part only)
        Vector partialDistance{0, 0};
    };

    SlowdownAcceleration(float totalSimpleTime, float slowDownTime) :
        slowDownStartTime(totalSimpleTime - slowDownTime),
        endTime(totalSimpleTime + SLOW_DOWN_TIME - slowDownTime),
        simpleAcceleration(totalSimpleTime, slowDownTime)
    { }

    inline Vector segmentOffset(const VT &first, const VT &second, const SegmentPrecomputation &precomp) const
    {
        if (second.t <= slowDownStartTime || first.t == second.t) {
            return simpleAcceleration.segmentOffset(first, second, precomp.constantPrecomputation);
        }
        const float t = precomp.segmentTime;
        const Vector speedDiff = second.v - precomp.v0;
        const Vector diffSign{sign(speedDiff.x), sign(speedDiff.y)};
        const Vector signedA0{diffSign.x * precomp.a0.x, diffSign.y * precomp.a0.y};
        const Vector aDiff = precomp.a1 - precomp.a0;
        const Vector signedADiff{diffSign.x * aDiff.x, diffSign.y * aDiff.y};
        const Vector d = precomp.v0 * t + signedA0 * (0.5f * t * t) + signedADiff * ((1.0f / 6.0f) * t * t);
        return precomp.partialDistance + d;
    }

    inline std::pair<Vector, Vector> partialSegmentOffsetAndSpeed(const VT &first, const VT &second, const SegmentPrecomputation &precomp,
                                                                  float transformedT0, float time) const
    {
        if (time <= slowDownStartTime || first.t == second.t) {
            return simpleAcceleration.partialSegmentOffsetAndSpeed(first, second, precomp.constantPrecomputation, transformedT0, time);
        }
        const float slowdownT0 = first.t > slowDownStartTime ? transformedT0 : slowDownStartTime;
        const float tm = time - slowdownT0;
        const Vector speedDiff = second.v - precomp.v0;
        const Vector diffSign{sign(speedDiff.x), sign(speedDiff.y)};
        const Vector signedA0{diffSign.x * precomp.a0.x, diffSign.y * precomp.a0.y};
        const Vector aDiff = precomp.a1 - precomp.a0;
        const Vector signedADiff{diffSign.x * aDiff.x, diffSign.y * aDiff.y};
        const float invSegmentTime = 1.0f / precomp.segmentTime;
        const Vector speed = precomp.v0 + signedA0 * tm + signedADiff * (0.5f * tm * tm * invSegmentTime);
        const Vector d = precomp.v0 * tm + signedA0 * (0.5f * tm * tm) + signedADiff * ((1.0f / 6.0f) * tm * tm * tm * invSegmentTime);
        return {precomp.partialDistance + d, speed};
    }

    inline float timeForSegment(const VT &first, const VT &second, const SegmentPrecomputation &precomp) const
    {
        if (second.t <= slowDownStartTime) {
            return second.t - first.t;
        } else if (first.t < slowDownStartTime) {
            return slowDownStartTime - first.t + precomp.segmentTime;
        } else {
            return precomp.segmentTime;
        }
    }

    inline SegmentPrecomputation precomputeSegment(const VT &first, const VT &second) const
    {
        SegmentPrecomputation result;
        result.constantPrecomputation = simpleAcceleration.precomputeSegment(first, second);
        if (second.t <= slowDownStartTime || first.t == second.t) {
            return result;
        }
        float t0;
        if (first.t < slowDownStartTime) {
            const auto partial = simpleAcceleration.partialSegmentOffsetAndSpeed(first, second, result.constantPrecomputation, first.t, slowDownStartTime);
            result.partialDistance = partial.first;
            result.v0 = partial.second;
            t0 = slowDownStartTime;
        } else {
            result.partialDistance = {0, 0};
            result.v0 = first.v;
            t0 = first.t;
        }
        const Vector baseAcc = (first.v - second.v).abs() / (second.t - first.t);
        const float accelerationFactor0 = computeAcceleration(endTime - t0);
        const float accelerationFactor1 = computeAcceleration(endTime - second.t);
        result.a0 = baseAcc * accelerationFactor0;
        result.a1 = baseAcc * accelerationFactor1;
        result.segmentTime = 2.0f * (second.t - t0) / (accelerationFactor0 + accelerationFactor1);

        return result;
    }


private:
    static inline float computeAcceleration(float timeToEnd)
    {
        const float totalTime = 2 / (1 + MIN_ACC_FACTOR);
        const float aFactor = (MIN_ACC_FACTOR - 1.0f) / totalTime;

        const float tFactor = 1 - timeToEnd / SLOW_DOWN_TIME;
        return std::sqrt(1 + 2 * tFactor * aFactor);
    }

    static inline float sign(float x)
    {
        return x < 0.0f ? -1.0f : 1.0f;
    }

public:
    const float slowDownStartTime;
    const float endTime;

    ConstantAcceleration simpleAcceleration;
};

#endif // ACCELERATIONPROFILE_H
