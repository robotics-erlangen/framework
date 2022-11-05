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

#include "speedprofile.h"

static float sign(float x)
{
    return x < 0.0f ? -1.0f : 1.0f;
}

// exponential slowdown calculation
const float MIN_ACC_FACTOR = 0.3f;

class ConstantAcceleration {
public:
    ConstantAcceleration(float, float) {}

    inline float segmentOffset(SpeedProfile1D::VT first, SpeedProfile1D::VT second) const {
        return (first.v + second.v) * 0.5f * (second.t - first.t);
    }

    inline std::pair<float, float> partialSegmentOffsetAndSpeed(SpeedProfile1D::VT first, SpeedProfile1D::VT second, float transformedT0, float time) const {
        const float timeDiff = time - transformedT0;
        const float diff = second.t == first.t ? 1 : timeDiff / (second.t - first.t);
        const float speed = first.v + diff * (second.v - first.v);
        const float partDist = (first.v + speed) * 0.5f * timeDiff;
        return {partDist, speed};
    }

    inline float timeForSegment(SpeedProfile1D::VT first, SpeedProfile1D::VT second) const {
        return second.t - first.t;
    }

    // must remain empty
    inline void precomputeSegment(SpeedProfile1D::VT, SpeedProfile1D::VT) {}
};

class SlowdownAcceleration {
public:
    SlowdownAcceleration(float totalSimpleTime, float slowDownTime) :
        slowDownStartTime(totalSimpleTime - slowDownTime),
        endTime(totalSimpleTime + SpeedProfile::SLOW_DOWN_TIME - slowDownTime),
        simpleAcceleration(totalSimpleTime, slowDownTime)
    { }

    // only valid after call to precomputeSegment
    inline float segmentOffset(SpeedProfile1D::VT first, SpeedProfile1D::VT second) const {
        if (second.t <= slowDownStartTime || first.v == second.v) {
            return simpleAcceleration.segmentOffset(first, second);
        }
        float diffSign = sign(second.v - v0);
        float t = segmentTime;
        float d = t * v0 + 0.5f * t * t * diffSign * a0 + (1.0f / 6.0f) * t * t * diffSign * (a1 - a0);
        return partialDistance + d;
    }

    // only valid after call to precomputeSegment
    inline std::pair<float, float> partialSegmentOffsetAndSpeed(SpeedProfile1D::VT first, SpeedProfile1D::VT second, float transformedT0, float time) const {
        if (time <= slowDownStartTime || first.v == second.v) {
            return simpleAcceleration.partialSegmentOffsetAndSpeed(first, second, transformedT0, time);
        }
        const float slowdownT0 = first.t > slowDownStartTime ? transformedT0 : slowDownStartTime;
        const float tm = time - slowdownT0;
        float diffSign = sign(second.v - v0);
        float invSegmentTime = 1.0f / segmentTime;
        float speed = v0 + tm * diffSign * a0 + 0.5f * tm * tm * diffSign * (a1 - a0) * invSegmentTime;
        float d = tm * v0 + 0.5f * tm * tm * diffSign * a0 + (1.0f / 6.0f) * tm * tm * tm * diffSign * (a1 - a0) * invSegmentTime;
        return {partialDistance + d, speed};
    }

    // only valid after call to precomputeSegment
    inline float timeForSegment(SpeedProfile1D::VT first, SpeedProfile1D::VT second) const {
        if (second.t <= slowDownStartTime || first.v == second.v) {
            return second.t - first.t;
        } else if (first.t < slowDownStartTime) {
            return slowDownStartTime - first.t + segmentTime;
        } else {
            return segmentTime;
        }
    }

    inline void precomputeSegment(SpeedProfile1D::VT first, SpeedProfile1D::VT second) {
        if (second.t <= slowDownStartTime || first.v == second.v) {
            return;
        }
        float t0;
        if (first.t < slowDownStartTime) {
            auto partial = simpleAcceleration.partialSegmentOffsetAndSpeed(first, second, first.t, slowDownStartTime);
            partialDistance = partial.first;
            v0 = partial.second;
            t0 = slowDownStartTime;
        } else {
            partialDistance = 0;
            v0 = first.v;
            t0 = first.t;
        }
        float baseAcc = std::abs(first.v - second.v) / (second.t - first.t);
        float toEndTime0 = endTime - t0;
        float toEndTime1 = endTime - second.t;
        a0 = baseAcc * (MIN_ACC_FACTOR + (1 - MIN_ACC_FACTOR) * toEndTime0 / SpeedProfile::SLOW_DOWN_TIME);
        a1 = baseAcc * (MIN_ACC_FACTOR + (1 - MIN_ACC_FACTOR) * toEndTime1 / SpeedProfile::SLOW_DOWN_TIME);

        float averageAcc = (a0 + a1) * 0.5f;
        segmentTime = std::abs(v0 - second.v) / averageAcc;

        // a = a0 + t * (a1 - a0) / t1
        // v = v0 + t * a0 + t^2 * 0.5 * (a1 - a0) / t1
        // d = t * v0 + 0.5f * t * t * a0 +
    }

private:
    const float slowDownStartTime;
    const float endTime;

    // assumes that it is stateless, updates will not be called
    ConstantAcceleration simpleAcceleration;

    // precomputed from segment
    float v0 = 0;
    float a0 = 0, a1 = 0;
    float segmentTime = 0; // time of the segment (slow down part only)
    float partialDistance = 0;
};

template<typename AccelerationProfile>
float SpeedProfile1D::endOffset(float slowDownTime) const
{
    AccelerationProfile acceleration(profile[counter-1].t, slowDownTime);

    float offset = 0;
    for (unsigned int i = 0;i<counter-1;i++) {
        acceleration.precomputeSegment(profile[i], profile[i+1]);
        offset += acceleration.segmentOffset(profile[i], profile[i+1]);
    }
    return offset;
}

float SpeedProfile1D::timeWithSlowdown(float slowDownTime) const
{
    SlowdownAcceleration acceleration(profile[counter-1].t, slowDownTime);

    float time = 0;
    for (unsigned int i = 0;i<counter-1;i++) {
        acceleration.precomputeSegment(profile[i], profile[i+1]);
        time += acceleration.timeForSegment(profile[i], profile[i+1]);
    }
    return time;
}

template<typename AccelerationProfile>
std::pair<float, float> SpeedProfile1D::offsetAndSpeedForTime(float time, float slowDownTime) const
{
    AccelerationProfile acceleration(profile[counter-1].t, slowDownTime);

    float offset = 0;
    float totalTime = 0;
    for (unsigned int i = 0;i<counter-1;i++) {
        acceleration.precomputeSegment(profile[i], profile[i+1]);
        float segmentTime = acceleration.timeForSegment(profile[i], profile[i+1]);
        if (totalTime + segmentTime > time) {
            auto inf = acceleration.partialSegmentOffsetAndSpeed(profile[i], profile[i+1], totalTime, time);
            return {offset + inf.first, inf.second};
        }
        offset += acceleration.segmentOffset(profile[i], profile[i+1]);
        totalTime += segmentTime;
    }
    return {offset, profile[counter-1].v};
}

template<typename AccelerationProfile>
void SpeedProfile1D::trajectoryPositions(std::vector<std::pair<Vector, Vector>> &outPoints, std::size_t outIndex, float timeInterval, float positionOffset, float slowDownTime) const
{
    AccelerationProfile acceleration(profile[counter-1].t, slowDownTime);

    float offset = positionOffset;
    float totalTime = 0;

    float nextDesiredTime = 0;
    std::size_t resultCounter = 0;
    for (unsigned int i = 0;i<counter-1;i++) {
        acceleration.precomputeSegment(profile[i], profile[i+1]);
        float segmentTime = acceleration.timeForSegment(profile[i], profile[i+1]);
        while (totalTime + segmentTime >= nextDesiredTime) {
            auto inf = acceleration.partialSegmentOffsetAndSpeed(profile[i], profile[i+1], totalTime, nextDesiredTime);
            outPoints[resultCounter].first[outIndex] = offset + inf.first;
            outPoints[resultCounter].second[outIndex] = inf.second;
            resultCounter++;
            nextDesiredTime += timeInterval;

            if (resultCounter == outPoints.size()) {
                return;
            }
        }
        offset += acceleration.segmentOffset(profile[i], profile[i+1]);
        totalTime += segmentTime;
    }

    while (resultCounter < outPoints.size()) {
        outPoints[resultCounter].first[outIndex] = offset;
        outPoints[resultCounter].second[outIndex] = profile[counter-1].v;
        resultCounter++;
    }
}

template<typename AccelerationProfile>
std::pair<float, float> SpeedProfile1D::calculateRange(float slowDownTime) const
{
    AccelerationProfile acceleration(profile[counter-1].t, slowDownTime);

    float minPos = 0;
    float maxPos = 0;

    float offset = 0;
    for (unsigned int i = 0;i<counter-1;i++) {
        // check segments crossing zero speed, the trajectory makes a curve here
        if ((profile[i].v > 0) != (profile[i+1].v > 0)) {
            float proportion = std::abs(profile[i].v) / (std::abs(profile[i].v) + std::abs(profile[i+1].v));
            float t = (profile[i+1].t - profile[i].t) * proportion;
            SpeedProfile1D::VT zeroSegment{0, t + profile[i].t};

            acceleration.precomputeSegment(profile[i], zeroSegment);
            float partialOffset = offset + acceleration.segmentOffset(profile[i], zeroSegment);
            minPos = std::min(minPos, partialOffset); maxPos = std::max(maxPos, partialOffset);
        }
        acceleration.precomputeSegment(profile[i], profile[i+1]);
        offset += acceleration.segmentOffset(profile[i], profile[i+1]);
        minPos = std::min(minPos, offset); maxPos = std::max(maxPos, offset);
    }
    return {minPos, maxPos};
}

void SpeedProfile1D::limitToTime(float time)
{
    for (unsigned int i = 0;i<counter-1;i++) {
        if (profile[i+1].t >= time) {
            float diff = profile[i+1].t == profile[i].t ? 1 : (time - profile[i].t) / (profile[i+1].t - profile[i].t);
            float speed = profile[i].v + diff * (profile[i+1].v - profile[i].v);
            profile[i+1].v = speed;
            profile[i+1].t = time;
            counter = i+2;
            return;
        }
    }
}


Vector SpeedProfile::endPos() const {
    if (slowDownTime == 0) {
        float xOffset = xProfile.endOffset<ConstantAcceleration>(slowDownTime);
        float yOffset = yProfile.endOffset<ConstantAcceleration>(slowDownTime);
        return Vector(xOffset, yOffset);
    } else {
        float xOffset = xProfile.endOffset<SlowdownAcceleration>(slowDownTime);
        float yOffset = yProfile.endOffset<SlowdownAcceleration>(slowDownTime);
        return Vector(xOffset, yOffset);
    }
}

float SpeedProfile::time() const {
    if (slowDownTime == 0.0f) {
        return std::max(xProfile.profile[xProfile.counter-1].t, yProfile.profile[yProfile.counter-1].t);
    } else {
        return std::max(xProfile.timeWithSlowdown(slowDownTime), yProfile.timeWithSlowdown(slowDownTime));
    }
}

std::pair<Vector, Vector> SpeedProfile::positionAndSpeedForTime(float time) const {
    if (slowDownTime == 0.0f) {
        auto x = xProfile.offsetAndSpeedForTime<ConstantAcceleration>(time, 0);
        auto y = yProfile.offsetAndSpeedForTime<ConstantAcceleration>(time, 0);
        return {Vector(x.first, y.first), Vector(x.second, y.second)};
    } else {
        auto x = xProfile.offsetAndSpeedForTime<SlowdownAcceleration>(time, slowDownTime);
        auto y = yProfile.offsetAndSpeedForTime<SlowdownAcceleration>(time, slowDownTime);
        return {Vector(x.first, y.first), Vector(x.second, y.second)};
    }
}

std::vector<std::pair<Vector, Vector>> SpeedProfile::trajectoryPositions(Vector offset, std::size_t count, float timeInterval) const {
    std::vector<std::pair<Vector, Vector>> result(count);
    if (slowDownTime == 0.0f) {
        xProfile.trajectoryPositions<ConstantAcceleration>(result, 0, timeInterval, offset.x, 0);
        yProfile.trajectoryPositions<ConstantAcceleration>(result, 1, timeInterval, offset.y, 0);
    } else {
        xProfile.trajectoryPositions<SlowdownAcceleration>(result, 0, timeInterval, offset.x, slowDownTime);
        yProfile.trajectoryPositions<SlowdownAcceleration>(result, 1, timeInterval, offset.y, slowDownTime);
    }
    return result;
}

BoundingBox SpeedProfile::calculateBoundingBox(Vector offset) const
{
    std::pair<float, float> xRange, yRange;
    if (slowDownTime == 0) {
        xRange = xProfile.calculateRange<ConstantAcceleration>(0);
        yRange = yProfile.calculateRange<ConstantAcceleration>(0);
    } else {
        xRange = xProfile.calculateRange<SlowdownAcceleration>(slowDownTime);
        yRange = yProfile.calculateRange<SlowdownAcceleration>(slowDownTime);
    }
    return BoundingBox(offset + Vector(xRange.first, yRange.first), offset + Vector(xRange.second, yRange.second));
}

std::vector<TrajectoryPoint> SpeedProfile::getTrajectoryPoints() const
{
    if (!isValid()) {
        return {};
    }

    // speed changes less than this time apart are grouped into one trajectory point
    const float SAME_POINT_EPSILON = 0.005f;

    std::vector<TrajectoryPoint> result;
    result.reserve(xProfile.counter + yProfile.counter);
    result.push_back({Vector(0, 0), Vector(xProfile.profile[0].v, yProfile.profile[0].v), 0});

    std::size_t xIndex = 0;
    std::size_t yIndex = 0;

    while (xIndex < xProfile.counter-1 && yIndex < yProfile.counter-1) {
        float xNext = xProfile.profile[xIndex + 1].t;
        float yNext = yProfile.profile[yIndex + 1].t;

        if (std::abs(xNext - yNext) < SAME_POINT_EPSILON) {
            float time = (xNext + yNext) / 2.0f;
            auto posSpeed = positionAndSpeedForTime(time);
            result.push_back({posSpeed.first, posSpeed.second, time});
            xIndex++;
            yIndex++;
        } else if (xNext < yNext) {
            auto posSpeed = positionAndSpeedForTime(xNext);
            result.push_back({posSpeed.first, posSpeed.second, xNext});
            xIndex++;
        } else {
            auto posSpeed = positionAndSpeedForTime(yNext);
            result.push_back({posSpeed.first, posSpeed.second, yNext});
            yIndex++;
        }
    }

    // compensate for the missing exponential slowdown by adding a segment with zero speed
    if (slowDownTime != 0.0f) {
        float endTime = time();
        result.push_back({positionAndSpeedForTime(endTime).first, result.back().speed, endTime});
    }

    return result;
}

// trajectory calculation
static float constantDistance(float v, float time)
{
    return v * time;
}

static float dist(float v0, float v1, float acc)
{
    float time = std::abs(v0 - v1) / acc;
    return 0.5f * (v0 + v1) * time;
}

std::pair<float, float> SpeedProfile1D::freeExtraTimeDistance(float v, float time, float acc, float vMax)
{
    float toMaxTime = 2.0f * std::abs(vMax - v) / acc;
    if (toMaxTime < time) {
        return {2 * dist(v, vMax, acc) +
               constantDistance(vMax, time - toMaxTime), vMax};
    } else {
        float v1 = (v > vMax ? -1.0f : 1.0f) * acc * time / 2 + v;
        return {2.0f * dist(v, v1, acc), v1};
    }
}

auto SpeedProfile1D::calculateEndPos1D(float v0, float v1, float hintDist, float acc, float vMax) -> TrajectoryPosInfo1D
{
    // basically the same as calculate1DTrajectory, but with position only
    // see the comments there if necessary
    float desiredVMax = hintDist < 0 ? -vMax : vMax;
    if (hintDist == 0.0f) {
        return {dist(v0, v1, acc), std::max(v0, v1)};
    } else if ((v0 < desiredVMax) != (v1 < desiredVMax)) {
        return {dist(v0, v1, acc) + constantDistance(desiredVMax, std::abs(hintDist)), desiredVMax};
    } else {
        // check whether v0 or v1 is closer to the desired max speed
        bool v0Closer = std::abs(v0 - desiredVMax) < std::abs(v1 - desiredVMax);
        float closerSpeed = v0Closer ? v0 : v1;
        auto extraDistance = freeExtraTimeDistance(closerSpeed, std::abs(hintDist), acc, desiredVMax);
        return {extraDistance.first + dist(v0, v1, acc), extraDistance.second};
    }
}

static SpeedProfile1D::VT adjustEndSpeed(float v0, float v1, float time, bool directionPositive, float acc)
{
    float invAcc = 1.0f / acc;

    // idea: compute the speed that would be reached after accelerating in the desired direction
    float speedAfterT = v0 + (directionPositive ? 1.0f : -1.0f) * (time * acc);
    // bound that speed to the allowed endspeed range [0, v1]
    float boundedSpeed = std::max(std::min(speedAfterT, std::max(v1, 0.0f)), std::min(v1, 0.0f));
    // compute the time it would take to reach boundedSpeed from v0
    float necessaryTime = std::abs(v0 - boundedSpeed) * invAcc;
    return {boundedSpeed, time - necessaryTime};
}

SpeedProfile1D::TrajectoryPosInfo1D SpeedProfile1D::calculateEndPos1DFastSpeed(float v0, float v1, float time, bool directionPositive, float acc, float vMax)
{
    SpeedProfile1D::VT endValues = adjustEndSpeed(v0, v1, time, directionPositive, acc);
    if (endValues.t == 0.0f) {
        return {(v0 + endValues.v) * 0.5f * time, directionPositive ? std::max(v0, v1) : std::min(v0, v1)};
    } else {
        // TODO: remove the negative time in calculateEndPos1D
        return calculateEndPos1D(v0, endValues.v, directionPositive ? endValues.t : -endValues.t, acc, vMax);
    }
}

void SpeedProfile1D::calculate1DTrajectoryFastEndSpeed(float v0, float v1, float time, bool directionPositive, float acc, float vMax)
{
    SpeedProfile1D::VT endValues = adjustEndSpeed(v0, v1, time, directionPositive, acc);
    if (endValues.t == 0.0f) {
        profile[0] = {v0, 0};
        profile[1] = {endValues.v, std::abs(endValues.v - v0) / acc};
        counter = 2;
    } else {
        calculate1DTrajectory(v0, endValues.v, endValues.t, directionPositive, acc, vMax);
    }
}

void SpeedProfile1D::createFreeExtraTimeSegment(float beforeSpeed, float v, float nextSpeed, float time, float acc, float desiredVMax)
{
    float toMaxTime = 2.0f * std::abs(desiredVMax - v) / acc;
    if (toMaxTime < time) {
        profile[1] = {desiredVMax, std::abs(desiredVMax - beforeSpeed) / acc};
        profile[2] = {desiredVMax, time - toMaxTime};
        profile[3] = {nextSpeed, std::abs(desiredVMax - nextSpeed) / acc};
        counter = 4;
    } else {
        float v1 = (v > desiredVMax ? -1.0f : 1.0f) * acc * time / 2 + v;
        profile[1] = {v1, std::abs(beforeSpeed - v1) / acc};
        profile[2] = {nextSpeed, std::abs(nextSpeed - v1) / acc};
        counter = 3;
    }
}

void SpeedProfile1D::calculate1DTrajectory(float v0, float v1, float extraTime, bool directionPositive, float acc, float vMax)
{
    profile[0] = {v0, 0};

    float desiredVMax = directionPositive ? vMax : -vMax;
    if (extraTime == 0.0f) {
        profile[1] = {v1, std::abs(v0 - v1) / acc};
        counter = 2;
    } else if ((v0 < desiredVMax) != (v1 < desiredVMax)) {
        // we need to cross the maximum speed because either abs(v0) or abs(v1) exceed it
        // therefore, a segment reaching desiredMax from v0 is created,
        // one segment staying at desiredVMax for the given extra time
        // and one going from desiredVMax to v1
        float accInv = 1.0f / acc;
        profile[1] = {desiredVMax, std::abs(v0 - desiredVMax) * accInv};
        profile[2] = {desiredVMax, extraTime};
        profile[3] = {v1, std::abs(v1 - desiredVMax) * accInv};
        counter = 4;
    } else {
        // check whether v0 or v1 is closer to the desired max speed
        bool v0Closer = std::abs(v0 - desiredVMax) < std::abs(v1 - desiredVMax);
        float closerSpeed = v0Closer ? v0 : v1;
        createFreeExtraTimeSegment(v0, closerSpeed, v1, extraTime, acc, desiredVMax);
    }
}

// equation must be solvable
static float solveSq(float a, float b, float c)
{
    if (a == 0) {
        if (b == 0) {
            assert(false);
        } else {
            return -c / b;
        }
    }

    float det = b * b - 4 * a * c;
    if (det < 0) {
        assert(false);
    } else if (det == 0) {
        return -b / (2 * a);
    }
    det = std::sqrt(det);
    const float t2 = (-b - std::copysign(det, b)) / (2 * a);
    const float t1 = c / (a * t2);

    return std::max(t1, t2);
}

void SpeedProfile1D::create1DAccelerationByDistance(float v0, float v1, float time, float distance)
{
    assert(std::signbit(v0) == std::signbit(distance) && (std::signbit(v1) == std::signbit(distance) || v1 == 0));
    profile[0] = {v0, 0};

    // necessary condition for this function to work correctly:
    // const float directAcc = 0.5f * (v0 + v1) * std::abs(v0 - v1) / distance;
    // const float directTime = std::abs(v0 - v1) / directAcc;
    // assert(directTime > time || std::abs(v0) < 0.0001f);

    const float a = 1.0f / distance;
    const float b = -2.0f / time;
    const float v0Abs = std::abs(v0);
    const float v1Abs = std::abs(v1);
    const float c = 1.0f / time * (v0Abs + v1Abs) - 1.0f / (2.0f * distance) * (v0Abs * v0Abs + v1Abs * v1Abs);
    const float solution = solveSq(a, b, c);
    const float midSpeed = std::copysign(solution, v0);

    const float acc = 1.0f / (2.0f * distance) * (2.0f * midSpeed * midSpeed - v0Abs * v0Abs - v1Abs * v1Abs);
    const float accInv = 1.0f / acc;

    profile[1] = {midSpeed, std::abs(v0 - midSpeed) * accInv};
    profile[2] = {v1, std::abs(v1 - midSpeed) * accInv};
    counter = 3;
}
