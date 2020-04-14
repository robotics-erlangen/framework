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

#include "alphatimetrajectory.h"
#include <QDebug>

static float sign(float x)
{
    return x < 0.0f ? -1.0f : 1.0f;
}

// exponential slowdown calculation
const float MIN_ACC_FACTOR = 0.3f;
float SpeedProfile1D::calculateSlowDownPos(float slowDownTime) const
{
    float pos = 0;
    float slowDownStartTime = profile[counter-1].t - slowDownTime;
    float endTime = profile[counter-1].t + AlphaTimeTrajectory::SLOW_DOWN_TIME - slowDownTime;
    for (unsigned int i = 0;i<counter-1;i++) {
        if (profile[i+1].t < slowDownStartTime || profile[i].v == profile[i+1].v) {
            pos += (profile[i].v + profile[i+1].v) * 0.5f * (profile[i+1].t - profile[i].t);
        } else {
            float v0;
            float t0;
            if (profile[i].t < slowDownStartTime) {
                float diff = profile[i+1].t == profile[i].t ? 1 : (slowDownStartTime - profile[i].t) / (profile[i+1].t - profile[i].t);
                v0 = profile[i].v + diff * (profile[i+1].v - profile[i].v);
                t0 = slowDownStartTime;
                float partDist = (profile[i].v + v0) * 0.5f * (slowDownStartTime - profile[i].t);
                pos += partDist;
            } else {
                v0 = profile[i].v;
                t0 = profile[i].t;
            }
            float toEndTime0 = endTime - t0;
            float toEndTime1 = endTime - profile[i+1].t;
            float a0 = acc * (MIN_ACC_FACTOR + (1 - MIN_ACC_FACTOR) * toEndTime0 / AlphaTimeTrajectory::SLOW_DOWN_TIME);
            float a1 = acc * (MIN_ACC_FACTOR + (1 - MIN_ACC_FACTOR) * toEndTime1 / AlphaTimeTrajectory::SLOW_DOWN_TIME);

            float averageAcc = (a0 + a1) * 0.5f;
            float v1 = profile[i+1].v;
            float t = std::abs(v0 - v1) / averageAcc;
            // TODO: die zeit wird modifiziert, das muss aber auf beiden richtungen gleich sein?

            float d = t * v0 + 0.5f * t * t * sign(v1 - v0) * a0 + (1.0f / 6.0f) * t * t * sign(v1 - v0) * (a1 - a0);
            pos += d;
        }
    }
    return pos;
}

float SpeedProfile1D::timeWithSlowDown(float slowDownTime) const
{
    float time = 0;
    float slowDownStartTime = profile[counter-1].t - slowDownTime;
    float endTime = profile[counter-1].t + AlphaTimeTrajectory::SLOW_DOWN_TIME - slowDownTime;
    for (unsigned int i = 0;i<counter-1;i++) {
        if (profile[i+1].t < slowDownStartTime || profile[i].v == profile[i+1].v) {
            time += profile[i+1].t - profile[i].t;
        } else {
            float v0;
            float t0;
            if (profile[i].t < slowDownStartTime) {
                float diff = profile[i+1].t == profile[i].t ? 1 : (slowDownStartTime - profile[i].t) / (profile[i+1].t - profile[i].t);
                v0 = profile[i].v + diff * (profile[i+1].v - profile[i].v);
                t0 = slowDownStartTime;
                time += slowDownStartTime - profile[i].t;
            } else {
                v0 = profile[i].v;
                t0 = profile[i].t;
            }
            float toEndTime0 = endTime - t0;
            float toEndTime1 = endTime - profile[i+1].t;
            float a0 = acc * (MIN_ACC_FACTOR + (1 - MIN_ACC_FACTOR) * toEndTime0 / AlphaTimeTrajectory::SLOW_DOWN_TIME);
            float a1 = acc * (MIN_ACC_FACTOR + (1 - MIN_ACC_FACTOR) * toEndTime1 / AlphaTimeTrajectory::SLOW_DOWN_TIME);

            float averageAcc = (a0 + a1) * 0.5f;
            float v1 = profile[i+1].v;
            float t = std::abs(v0 - v1) / std::abs(averageAcc);

            time += t;
        }
    }
    return time;
}

float SpeedProfile1D::speedForTimeSlowDown(float time, float slowDownTime) const
{
    float slowDownStartTime = profile[counter-1].t - slowDownTime;
    unsigned int i = 0;
    float v0, t0 = slowDownStartTime;
    for (;i<counter-1;i++) {
        if (profile[i+1].t >= time || profile[i+1].t >= slowDownStartTime) {
            float td = std::min(time, slowDownStartTime);
            float diff = profile[i+1].t == profile[i].t ? 1 : (td - profile[i].t) / (profile[i+1].t - profile[i].t);
            float speed = profile[i].v + diff * (profile[i+1].v - profile[i].v);
            if (time < slowDownStartTime) {
                return speed;
            } else {
                v0 = speed;
                break;
            }
        }
    }

    float endTime = profile[counter-1].t + AlphaTimeTrajectory::SLOW_DOWN_TIME - slowDownTime;
    float totalTime = t0;
    for (;i<counter-1;i++) {

        float toEndTime0 = endTime - t0;
        float toEndTime1 = endTime - profile[i+1].t;
        float a0 = acc * (MIN_ACC_FACTOR + (1 - MIN_ACC_FACTOR) * toEndTime0 / AlphaTimeTrajectory::SLOW_DOWN_TIME);
        float a1 = acc * (MIN_ACC_FACTOR + (1 - MIN_ACC_FACTOR) * toEndTime1 / AlphaTimeTrajectory::SLOW_DOWN_TIME);

        float averageAcc = (a0 + a1) * 0.5f;
        float v1 = profile[i+1].v;
        float t = std::abs(v0 - v1) / averageAcc;

        // a = a0 + t * (a1 - a0) / t1
        // v = v0 + t * a0 + t^2 * 0.5 * (a1 - a0) / t1
        // d = t * v0 + 0.5f * t * t * a0 +

        if (totalTime + t < time) {
            v0 = profile[i+1].v;
            t0 = profile[i+1].t;
            totalTime += t;
        } else {
            float tm = time - totalTime;
            float speed = v0 + tm * sign(v1 - v0) * a0 + 0.5f * tm * tm * sign(v1 - v0) * (a1 - a0) / t;
            return speed;
        }
    }
    return profile[counter-1].v;
}

float SpeedProfile1D::offsetForTimeSlowDown(float time, float slowDownTime) const
{
    if (slowDownTime <= 0) {
        return offsetForTime(time);
    }
    float pos = 0;
    float slowDownStartTime = profile[counter-1].t - slowDownTime;
    unsigned int i = 0;
    float v0, t0 = slowDownStartTime;
    for (;i<counter-1;i++) {
        if (profile[i+1].t >= time || profile[i+1].t >= slowDownStartTime) {
            float td = std::min(time, slowDownStartTime);
            float diff = profile[i+1].t == profile[i].t ? 1 : (td - profile[i].t) / (profile[i+1].t - profile[i].t);
            float speed = profile[i].v + diff * (profile[i+1].v - profile[i].v);
            float partDist = (profile[i].v + speed) * 0.5f * (td - profile[i].t);
            if (time < slowDownStartTime) {
                return pos + partDist;
            } else {
                pos += partDist;
                v0 = speed;
                break;
            }
        }
        pos += (profile[i].v + profile[i+1].v) * 0.5f * (profile[i+1].t - profile[i].t);
    }

    float endTime = profile[counter-1].t + AlphaTimeTrajectory::SLOW_DOWN_TIME - slowDownTime;
    float totalTime = t0;
    for (;i<counter-1;i++) {

        float toEndTime0 = endTime - t0;
        float toEndTime1 = endTime - profile[i+1].t;
        float a0 = acc * (MIN_ACC_FACTOR + (1 - MIN_ACC_FACTOR) * toEndTime0 / AlphaTimeTrajectory::SLOW_DOWN_TIME);
        float a1 = acc * (MIN_ACC_FACTOR + (1 - MIN_ACC_FACTOR) * toEndTime1 / AlphaTimeTrajectory::SLOW_DOWN_TIME);

        float averageAcc = (a0 + a1) * 0.5f;
        float v1 = profile[i+1].v;
        float t = std::abs(v0 - v1) / averageAcc;

        // a = a0 + t * (a1 - a0) / t1
        // v = v0 + t * a0 + t^2 * 0.5 * (a1 - a0) / t1
        // d = t * v0 + 0.5f * t * t * a0 +

        if (totalTime + t < time) {
            //float d = t * v0 + 0.5f * t * t * sign(v1 - v0) * a1;
            float d = t * v0 + 0.5f * t * t * sign(v1 - v0) * a0 + (1.0f / 6.0f) * t * t * sign(v1 - v0) * (a1 - a0);
            pos += d;

            v0 = profile[i+1].v;
            t0 = profile[i+1].t;
            totalTime += t;
        } else {
            float tm = time - totalTime;
            float d = tm * v0 + 0.5f * tm * tm * sign(v1 - v0) * a0 + (1.0f / 6.0f) * tm * tm * tm * sign(v1 - v0) * (a1 - a0) / t;
            pos += d;
            break;
        }
    }
    return pos;
}

std::pair<float, float> SpeedProfile1D::calculateRange(float slowDownTime) const
{
    float minPos = 0;
    float maxPos = 0;

    float pos = 0;
    float slowDownStartTime = profile[counter-1].t - slowDownTime;
    unsigned int i = 0;
    float v0, t0 = slowDownStartTime;
    for (;i<counter-1;i++) {

        if (profile[i+1].t >= slowDownStartTime) {
            float td = slowDownStartTime;
            float diff = profile[i+1].t == profile[i].t ? 1 : (td - profile[i].t) / (profile[i+1].t - profile[i].t);
            float speed = profile[i].v + diff * (profile[i+1].v - profile[i].v);
            float partDist = (profile[i].v + speed) * 0.5f * (td - profile[i].t);

            pos += partDist;
            minPos = std::min(minPos, pos);
            maxPos = std::max(maxPos, pos);
            v0 = speed;
            break;
        }
        if ((profile[i].v > 0) != (profile[i+1].v > 0)) {
            float proportion = std::abs(profile[i].v) / (std::abs(profile[i].v) + std::abs(profile[i+1].v));
            float t = (profile[i+1].t - profile[i].t) * proportion;
            float zeroPos = pos + (profile[i].v + 0) * 0.5f * t;
            minPos = std::min(minPos, zeroPos);
            maxPos = std::max(maxPos, zeroPos);
        }
        pos += (profile[i].v + profile[i+1].v) * 0.5f * (profile[i+1].t - profile[i].t);
        minPos = std::min(minPos, pos);
        maxPos = std::max(maxPos, pos);
    }

    float endTime = profile[counter-1].t + AlphaTimeTrajectory::SLOW_DOWN_TIME - slowDownTime;
    float totalTime = t0;
    for (;i<counter-1;i++) {

        float toEndTime0 = endTime - t0;
        float toEndTime1 = endTime - profile[i+1].t;
        float a0 = acc * (MIN_ACC_FACTOR + (1 - MIN_ACC_FACTOR) * toEndTime0 / AlphaTimeTrajectory::SLOW_DOWN_TIME);
        float a1 = acc * (MIN_ACC_FACTOR + (1 - MIN_ACC_FACTOR) * toEndTime1 / AlphaTimeTrajectory::SLOW_DOWN_TIME);

        float averageAcc = (a0 + a1) * 0.5f;
        float v1 = profile[i+1].v;
        float t = std::abs(v0 - v1) / averageAcc;

        // a = a0 + t * (a1 - a0) / t1
        // v = v0 + t * a0 + t^2 * 0.5 * (a1 - a0) / t1
        // d = t * v0 + 0.5f * t * t * a0 +

        //float d = t * v0 + 0.5f * t * t * sign(v1 - v0) * a1;
        float d = t * v0 + 0.5f * t * t * sign(v1 - v0) * a0 + (1.0f / 6.0f) * t * t * sign(v1 - v0) * (a1 - a0);
        pos += d;
        minPos = std::min(minPos, pos);
        maxPos = std::max(maxPos, pos);

        v0 = profile[i+1].v;
        t0 = profile[i+1].t;
        totalTime += t;
    }

    return {minPos, maxPos};
}

std::vector<TrajectoryPoint> SpeedProfile::getTrajectoryPoints(float slowDownTime) const
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
            Vector pos = slowDownTime == 0.0f ? positionForTime(time) : positionForTimeSlowDown(time, slowDownTime);
            Vector speed(xProfile.profile[xIndex + 1].v, yProfile.profile[yIndex + 1].v);
            result.push_back({pos, speed, time});
            xIndex++;
            yIndex++;
        } else if (xNext < yNext) {
            Vector pos = slowDownTime == 0.0f ? positionForTime(xNext) : positionForTimeSlowDown(xNext, slowDownTime);
            Vector speed(xProfile.profile[xIndex + 1].v, slowDownTime == 0.0f ? yProfile.speedForTime(xNext) : yProfile.speedForTimeSlowDown(xNext, slowDownTime));
            result.push_back({pos, speed, xNext});
            xIndex++;
        } else {
            Vector pos = slowDownTime == 0.0f ? positionForTime(yNext) : positionForTimeSlowDown(yNext, slowDownTime);
            Vector speed(slowDownTime == 0.0f ? xProfile.speedForTime(yNext) : xProfile.speedForTimeSlowDown(yNext, slowDownTime), yProfile.profile[yIndex + 1].v);
            result.push_back({pos, speed, yNext});
            yIndex++;
        }
    }

    // compensate for the missing exponential slowdown by adding a segment with zero speed
    if (slowDownTime != 0.0f) {
        float endTime = timeWithSlowDown(slowDownTime);
        result.push_back({positionForTimeSlowDown(endTime, slowDownTime), result.back().speed, endTime});
    }

    return result;
}

// helper functions
static float dist(float v0, float v1, float acc)
{
    float time = std::abs(v0 - v1) / acc;
    return 0.5f * (v0 + v1) * time;
}

static float normalizeAnglePositive(float angle)
{
    while (angle < 0) angle += float(2 * M_PI);
    while (angle >= float(2 * M_PI)) angle -= float(2 * M_PI);
    return angle;
}

static float adjustAngle(Vector startSpeed, Vector endSpeed, float time, float angle, float acc)
{
    // case 1: only startSpeed.x is != 0
    // this results in 2 cases where the angle is invalid, in a range around 0 and 180 degree
    // both ranges have the same size
    // therefore, calculate the size.
    // Calculate the smallest angle x in [0, 2 * pi] that is possible:
    // time - |startSpeed.x| / |acc * sin(x)| = 0 => time - |startSpeed.x| / (acc * sin(x)) = 0
    // => acc * sin(x) * time = |startSpeed.x| => sin(x) = |startSpeed.x| / (time * acc)
    // => x = sin^-1(|startSpeed.x| / (time * acc))
    // WARNING: only solvable when |startSpeed.x| <= time
    // -> this also applies to all other cases, see below
    Vector diff = endSpeed - startSpeed;
    Vector absDiff(std::abs(diff.x), std::abs(diff.y));
    if (absDiff.x > time * acc || absDiff.y > time * acc) {
        // TODO: the trajectory is not solvable
        return angle;
    }
    // offset to ensure that values directly on the border of an invalid segment are not treated as invalid later
    const float FLOATING_POINT_OFFSET = 0.001f;
    float gapSizeHalfX = std::asin(absDiff.x / (time * acc)) + FLOATING_POINT_OFFSET;
    // solution gaps are now [-fS, fS] and [pi - fS, pi + fS]
    float gapSizeHalfY = std::asin(absDiff.y / (time * acc)) + FLOATING_POINT_OFFSET;

    float circleCircumference = float(2 * M_PI) - gapSizeHalfX * 4 - gapSizeHalfY * 4;
    float circumferenceFactor = circleCircumference / float(2 * M_PI);
    angle = normalizeAnglePositive(angle);
    angle *= circumferenceFactor;

    angle += gapSizeHalfX;
    if (angle > float(M_PI / 2) - gapSizeHalfY) {
        angle += gapSizeHalfY * 2.0f;
    }
    if (angle > float(M_PI) - gapSizeHalfX) {
        angle += gapSizeHalfX * 2.0f;
    }
    if (angle > float(M_PI * 1.5) - gapSizeHalfY) {
        angle += gapSizeHalfY * 2.0f;
    }
    return angle;
}

static float adjustAngleFastEndSpeed(Vector startSpeed, Vector endSpeed, float time, float angle, float acc)
{
    // use endspeed as the closest value of startSpeed on [0, endSpeed]
    float endSpeedX = std::max(std::min(startSpeed.x, std::max(endSpeed.x, 0.0f)), std::min(endSpeed.x, 0.0f));
    float endSpeedY = std::max(std::min(startSpeed.y, std::max(endSpeed.y, 0.0f)), std::min(endSpeed.y, 0.0f));
    return adjustAngle(startSpeed, Vector(endSpeedX, endSpeedY), time, angle, acc);
}

float AlphaTimeTrajectory::minTimeExactEndSpeed(Vector v0, Vector v1, float acc)
{
    Vector diff = v1 - v0;
    return diff.length() / acc;
}

float AlphaTimeTrajectory::minTimeFastEndSpeed(Vector v0, Vector v1, float acc)
{
    float endSpeedX = std::max(std::min(v0.x, std::max(v1.x, 0.0f)), std::min(v1.x, 0.0f));
    float endSpeedY = std::max(std::min(v0.y, std::max(v1.y, 0.0f)), std::min(v1.y, 0.0f));
    return minTimeExactEndSpeed(v0, Vector(endSpeedX, endSpeedY), acc);
}


// trajectory calculation
static float constantDistance(float v, float time)
{
    return v * time;
}

static float freeExtraTimeDistance(float v, float time, float acc, float vMax, float &outTopSpeed)
{
    vMax *= sign(time);
    time = std::abs(time);
    float toMaxTime = 2.0f * std::abs(vMax - v) / acc;
    if (toMaxTime < time) {
        outTopSpeed = vMax;
        return 2 * dist(v, vMax, acc) +
            constantDistance(vMax, time - toMaxTime);
    } else {
        float v1 = (v > vMax ? -1.0f : 1.0f) * acc * time / 2 + v;
        outTopSpeed = v1;
        return 2.0f * dist(v, v1, acc);
    }
}

SpeedProfile1D::TrajectoryPosInfo1D SpeedProfile1D::calculateEndPos1D(float v0, float v1, float hintDist, float acc, float vMax)
{
    // TODO: this can be optimized
    float topSpeed;
    if (hintDist == 0.0f) {
        return {dist(v0, v1, acc), std::max(v0, v1)};
    } else if (hintDist < 0 && v0 <= v1) {
        if (v0 >= -vMax) {
            return {freeExtraTimeDistance(v0, hintDist, acc, vMax, topSpeed) +
                dist(v0, v1, acc), topSpeed};
        } else if (v0 < -vMax && v1 >= -vMax) {
            return {dist(v0, v1, acc) +
                constantDistance(-vMax, -hintDist), -vMax};
        } else {
            return {dist(v0, v1, acc) +
                freeExtraTimeDistance(v1, hintDist, acc, vMax, topSpeed), topSpeed};
        }
    } else if (hintDist < 0 && v0 > v1) {
        if (v1 >= -vMax) {
            return {dist(v0, v1, acc) +
                freeExtraTimeDistance(v1, hintDist, acc, vMax, topSpeed), topSpeed};
        } else if (v1 < -vMax && v0 >= -vMax) {
            return {dist(v0, v1, acc) +
                constantDistance(-vMax, -hintDist), -vMax};
        } else {
            return {freeExtraTimeDistance(v0, hintDist, acc, vMax, topSpeed) +
                dist(v0, v1, acc), topSpeed};
        }
    } else if (hintDist > 0 && v0 <= v1) {
        if (v1 <= vMax) {
            return {dist(v0, v1, acc) +
                freeExtraTimeDistance(v1, hintDist, acc, vMax, topSpeed), topSpeed};
        } else if (v1 > vMax && v0 <= vMax) {
            return {dist(v0, v1, acc) +
                constantDistance(vMax, hintDist), vMax};
        } else {
            return {freeExtraTimeDistance(v0, hintDist, acc, vMax, topSpeed) +
                dist(v0, v1, acc), topSpeed};
        }
    } else { // hintDist > 0, v0 > v1
        //assert(hintDist > 0 && v0 > v1);
        if (v0 <= vMax) {
            return {freeExtraTimeDistance(v0, hintDist, acc, vMax, topSpeed) +
                dist(v0, v1, acc), topSpeed};
        } else if (v0 > vMax && v1 <= vMax) {
            return {dist(v0, v1, acc) +
                constantDistance(vMax, hintDist), vMax};
        } else {
            return {dist(v0, v1, acc) +
                freeExtraTimeDistance(v1, hintDist, acc, vMax, topSpeed), topSpeed};
        }
    }
}

static void adjustEndSpeed(float v0, const float v1, float time, bool directionPositive, float acc, float &outExtraTime, float &outV1)
{
    outExtraTime = 0.0f;
    outV1 = v1;

    if (directionPositive) {
        if (v0 < 0 && v1 < 0) {
            float toZeroTime = std::abs(v0) / acc;
            if (toZeroTime < time) {
                outV1 = 0;
                outExtraTime = time - toZeroTime;
            } else {
                outV1 = v0 + time * acc;
                // omit check for invalid case outV1 < v1
            }
        } else if (v0 < 0 && v1 >= 0) {
            float toV1Time = (v1 - v0) / acc;
            if (toV1Time < time) {
                // do nothing, everything is fine
                outExtraTime = time - toV1Time;
            } else {
                outV1 = v0 + time * acc;
                // omit check for invalid case outV1 < 0
            }
        } else if (v0 >= 0 && v1 < 0) {
            outV1 = 0;
            outExtraTime = time - std::abs(v0) / acc;
            // omit check for invalid case outRestTime < 0
        } else { // v0 >= 0, v1 >= 0
            float directTime = std::abs(v0 - v1) / acc;
            if (directTime < time) {
                outExtraTime = time - directTime;
            } else {
                // omit check for invalid case v0 > v1
                outV1 = v0 + time * acc;
            }
        }

    } else { // directionPositive == false
        // TODO: this block is basically the same as the above, just some sign changes
        if (v0 < 0 && v1 < 0) {
            float directTime = std::abs(v0 - v1) / acc;
            if (directTime < time) {
                outExtraTime = time - directTime;
            } else {
                // omit check for invalid case v0 < v1
                outV1 = v0 - time * acc;
            }
        } else if (v0 < 0 && v1 >= 0) {
            outV1 = 0;
            outExtraTime = time - std::abs(v0) / acc;
            // omit check for invalid case outRestTime < 0
        } else if (v0 >= 0 && v1 < 0) {
            float toV1Time = (v0 - v1) / acc;
            if (toV1Time < time) {
                // do nothing, everything is fine
                outExtraTime = time - toV1Time;
            } else {
                outV1 = v0 - time * acc;
                // omit check for invalid case outV1 > 0
            }
        } else { // v0 >= 0 && v1 >= 0
            float toZeroTime = std::abs(v0) / acc;
            if (toZeroTime < time) {
                outV1 = 0;
                outExtraTime = time - toZeroTime;
            } else {
                outV1 = v0 - time * acc;
                // omit check for invalid case outV1 > v1
            }
        }
    }
}

SpeedProfile1D::TrajectoryPosInfo1D SpeedProfile1D::calculateEndPos1DFastSpeed(float v0, float v1, float time, bool directionPositive, float acc, float vMax)
{
    // TODO: simple case with v1 = 0 seperately?
    float realV1, extraTime;
    adjustEndSpeed(v0, v1, time, directionPositive, acc, extraTime, realV1);

    if (extraTime == 0.0f) {
        return {(v0 + realV1) * 0.5f * time, directionPositive ? std::max(v0, v1) : std::min(v0, v1)};
    } else {
        // TODO: remove the negative time in calculateEndPos1D
        return calculateEndPos1D(v0, realV1, directionPositive ? extraTime : -extraTime, acc, vMax);
    }
}

AlphaTimeTrajectory::TrajectoryPosInfo2D AlphaTimeTrajectory::calculatePositionFastEndSpeed(Vector v0, Vector v1, float time, float angle, float acc, float vMax)
{
    angle = adjustAngleFastEndSpeed(v0, v1, time, angle, acc);
    float alphaX = std::sin(angle);
    float alphaY = std::cos(angle);

    auto xInfo = SpeedProfile1D::calculateEndPos1DFastSpeed(v0.x, v1.x, time, alphaX > 0, acc * std::abs(alphaX), vMax * std::abs(alphaX));
    auto yInfo = SpeedProfile1D::calculateEndPos1DFastSpeed(v0.y, v1.y, time, alphaY > 0, acc * std::abs(alphaY), vMax * std::abs(alphaY));
    return {Vector(xInfo.endPos, yInfo.endPos), Vector(xInfo.increaseAtSpeed, yInfo.increaseAtSpeed)};
}

AlphaTimeTrajectory::TrajectoryPosInfo2D AlphaTimeTrajectory::calculatePositionExactEndSpeed(Vector v0, Vector v1, float time, float angle, float acc, float vMax)
{
    angle = adjustAngle(v0, v1, time, angle, acc);
    float alphaX = std::sin(angle);
    float alphaY = std::cos(angle);

    Vector diff = v1 - v0;
    float restTimeX = (time - std::abs(diff.x) / (acc * std::abs(alphaX)));
    float restTimeY = (time - std::abs(diff.y) / (acc * std::abs(alphaY)));

    // calculate position for x and y
    auto xInfo = SpeedProfile1D::calculateEndPos1D(v0.x, v1.x, sign(alphaX) * restTimeX, acc * std::abs(alphaX), vMax * std::abs(alphaX));
    auto yInfo = SpeedProfile1D::calculateEndPos1D(v0.y, v1.y, sign(alphaY) * restTimeY, acc * std::abs(alphaY), vMax * std::abs(alphaY));
    return {Vector(xInfo.endPos, yInfo.endPos), Vector(xInfo.increaseAtSpeed, yInfo.increaseAtSpeed)};
}

static void createFreeExtraTimeSegment(float beforeSpeed, float v, float nextSpeed, float time, float acc, float vMax, SpeedProfile1D &p)
{
    vMax *= sign(time);
    time = std::abs(time);
    float toMaxTime = 2.0f * std::abs(vMax - v) / acc;
    if (toMaxTime < time) {
        p.profile[1] = {vMax, std::abs(vMax - beforeSpeed) / acc};
        p.profile[2] = {vMax, time - toMaxTime};
        p.profile[3] = {nextSpeed, std::abs(vMax - nextSpeed) / acc};
        p.counter = 4;
    } else {
        float v1 = (v > vMax ? -1.0f : 1.0f) * acc * time / 2 + v;
        p.profile[1] = {v1, std::abs(beforeSpeed - v1) / acc};
        p.profile[2] = {nextSpeed, std::abs(nextSpeed - v1) / acc};
        p.counter = 3;
    }
}

void SpeedProfile1D::calculate1DTrajectory(float v0, float v1, float hintDist, float acc, float vMax)
{
    this->acc = acc;
    profile[0] = {v0, 0};

    if (hintDist == 0.0f) {
        profile[1] = {v1, std::abs(v0 - v1) / acc};
        counter = 2;
    } else if (hintDist < 0 && v0 <= v1) {
        if (v0 >= -vMax) {
            createFreeExtraTimeSegment(v0, v0, v1, hintDist, acc, vMax, *this);
        } else if (v0 < -vMax && v1 >= -vMax) {
            profile[1] = {-vMax, std::abs(v0 + vMax) / acc};
            profile[2] = {-vMax, -hintDist};
            profile[3] = {v1, std::abs(v1 + vMax) / acc};
            counter = 4;
        } else {
            createFreeExtraTimeSegment(v0, v1, v1, hintDist, acc, vMax, *this);
        }
    } else if (hintDist < 0 && v0 > v1) {
        if (v1 >= -vMax) {
            createFreeExtraTimeSegment(v0, v1, v1, hintDist, acc, vMax, *this);
        } else if (v1 < -vMax && v0 >= -vMax) {
            profile[1] = {-vMax, std::abs(v0 + vMax) / acc};
            profile[2] = {-vMax, -hintDist};
            profile[3] = {v1, std::abs(v1 + vMax) / acc};
            counter = 4;
        } else {
            createFreeExtraTimeSegment(v0, v0, v1, hintDist, acc, vMax, *this);
        }
    } else if (hintDist > 0 && v0 <= v1) {
        if (v1 <= vMax) {
            createFreeExtraTimeSegment(v0, v1, v1, hintDist, acc, vMax, *this);
        } else if (v1 > vMax && v0 <= vMax) {
            profile[1] = {vMax, std::abs(v0 - vMax) / acc};
            profile[2] = {vMax, hintDist};
            profile[3] = {v1, std::abs(v1 - vMax) / acc};
            counter = 4;
        } else {
            createFreeExtraTimeSegment(v0, v0, v1, hintDist, acc, vMax, *this);
        }
    } else { // hintDist > 0, v0 > v1
        //assert(hintDist > 0 && v0 > v1);
        if (v0 <= vMax) {
            createFreeExtraTimeSegment(v0, v0, v1, hintDist, acc, vMax, *this);
        } else if (v0 > vMax && v1 <= vMax) {
            profile[1] = {vMax, std::abs(v0 - vMax) / acc};
            profile[2] = {vMax, hintDist};
            profile[3] = {v1, std::abs(v1 - vMax) / acc};
            counter = 4;
        } else {
            createFreeExtraTimeSegment(v0, v1, v1, hintDist, acc, vMax, *this);
        }
    }
}

void SpeedProfile1D::calculate1DTrajectoryFastEndSpeed(float v0, float v1, float time, bool directionPositive, float acc, float vMax)
{
    // TODO: simple case with v1 = 0 seperately?
    float realV1, extraTime;
    adjustEndSpeed(v0, v1, time, directionPositive, acc, extraTime, realV1);

    if (extraTime == 0.0f) {
        this->acc = acc;
        profile[0] = {v0, 0};
        profile[1] = {realV1, std::abs(realV1 - v0) / acc};
        counter = 2;
    } else {
        // TODO: remove the negative time in calculateEndPos1D
        calculate1DTrajectory(v0, realV1, directionPositive ? extraTime : -extraTime, acc, vMax);
    }
}

SpeedProfile AlphaTimeTrajectory::calculateTrajectoryFastEndSpeed(Vector v0, Vector v1, float time, float angle, float acc, float vMax, float minTime)
{
    if (minTime < 0) {
        minTime = minTimeFastEndSpeed(v0, v1, acc);
    }
    time += minTime;

    angle = adjustAngleFastEndSpeed(v0, v1, time, angle, acc);
    float alphaX = std::sin(angle);
    float alphaY = std::cos(angle);

    SpeedProfile result;
    result.xProfile.calculate1DTrajectoryFastEndSpeed(v0.x, v1.x, time, alphaX > 0, acc * std::abs(alphaX), vMax * std::abs(alphaX));
    result.yProfile.calculate1DTrajectoryFastEndSpeed(v0.y, v1.y, time, alphaY > 0, acc * std::abs(alphaY), vMax * std::abs(alphaY));
    result.xProfile.integrateTime();
    result.yProfile.integrateTime();
    return result;
}

SpeedProfile AlphaTimeTrajectory::calculateTrajectoryExactEndSpeed(Vector v0, Vector v1, float time, float angle, float acc, float vMax, float minTime)
{
    if (minTime < 0) {
        minTime = minTimeExactEndSpeed(v0, v1, acc);
    }
    time += minTime;

    angle = adjustAngle(v0, v1, time, angle, acc);
    float alphaX = std::sin(angle);
    float alphaY = std::cos(angle);

    Vector diff = v1 - v0;
    float restTimeX = (time - std::abs(diff.x) / (acc * std::abs(alphaX)));
    float restTimeY = (time - std::abs(diff.y) / (acc * std::abs(alphaY)));

    SpeedProfile result;
    result.xProfile.calculate1DTrajectory(v0.x, v1.x, alphaX > 0 ? restTimeX : -restTimeX, acc * std::abs(alphaX), vMax * std::abs(alphaX));
    result.yProfile.calculate1DTrajectory(v0.y, v1.y, alphaY > 0 ? restTimeY : -restTimeY, acc * std::abs(alphaY), vMax * std::abs(alphaY));
    result.xProfile.integrateTime();
    result.yProfile.integrateTime();
    return result;
}

// functions for position search
static Vector minTimePos(Vector startSpeed, Vector endSpeed)
{
    const float EPSILON = 0.00001f;

    // TODO: dont recalculate these vectors everywhere
    Vector diff = endSpeed - startSpeed;
    Vector absDiff(std::abs(diff.x), std::abs(diff.y));

    if (absDiff.x == 0.0f && absDiff.y == 0.0f) {
        return Vector(0, 0);
    }
    // tx = absDiff.x / alpha
    // ty = absDiff.y / sqrt(1 - alpha * alpha)
    // => Solve tx =!= ty
    float alpha = absDiff.x / std::sqrt(absDiff.x * absDiff.x + absDiff.y * absDiff.y);

    // prevent floating points issues when for example absDiff.x = 1 and absDiff.y = 1e-15, then alpha will evaluate to exactly 1
    // which causes -inf in the dist() calculation for the result
    alpha = std::min(1.0f - EPSILON, std::max(EPSILON, alpha));

    // TODO: this can be calculated more efficiently
    return Vector(dist(startSpeed.x, endSpeed.x, alpha), dist(startSpeed.y, endSpeed.y, std::sqrt(1 - alpha * alpha)));
}

static Vector fastEndSpeedCenterTimePos(Vector startSpeed, Vector endSpeed, float time)
{
    float endSpeedX = std::max(std::min(startSpeed.x, std::max(endSpeed.x, 0.0f)), std::min(endSpeed.x, 0.0f));
    float endSpeedY = std::max(std::min(startSpeed.y, std::max(endSpeed.y, 0.0f)), std::min(endSpeed.y, 0.0f));
    return (startSpeed + Vector(endSpeedX, endSpeedY)) * (0.5f * time);
}

static Vector centerTimePos(Vector startSpeed, Vector endSpeed, float time)
{
    return (startSpeed + endSpeed) * (0.5f * time);
}

// normalize between [-pi, pi]
static float angleDiff(float a1, float a2)
{
    float angle = a1 - a2;
    while (angle < -float(M_PI)) angle += float(2 * M_PI);
    while (angle >= float(M_PI)) angle -= float(2 * M_PI);
    return angle;
}

SpeedProfile AlphaTimeTrajectory::findTrajectoryFastEndSpeed(Vector v0, Vector v1, Vector position, float acc, float vMax, float slowDownTime, bool highPrecision)
{
    if (v1.x == 0.0f && v1.y == 0.0f) {
        return findTrajectoryExactEndSpeed(v0, v1, position, acc, vMax, slowDownTime, highPrecision);
    }
    SpeedProfile result;
    // TODO: custom minTimePos for fast endspeed mode
    float minTimeDistance = position.distance(minTimePos(v0, v1));

    // estimate rough time from distance
    // TODO: improve this estimate?
    float estimatedTime = minTimeDistance / acc;

    Vector estimateCenterPos = fastEndSpeedCenterTimePos(v0, v1, estimatedTime);

    float estimatedAngle = normalizeAnglePositive((position - estimateCenterPos).angle());
    // calculate better estimate for the time
    estimatedTime = std::max(estimatedTime, 0.001f);

    // TODO: can this even still occur??
    if (std::isnan(estimatedTime)) {
        estimatedTime = 3;
    }
    if (std::isnan(estimatedAngle)) {
        // 0 is floating point instable, dont use that
        estimatedAngle = 0.05f;
    }

    // cache for usage in calculateTrajectoryFastEndSpeed
    float minimumTime = minTimeFastEndSpeed(v0, v1, acc);

    float currentTime = estimatedTime;
    float currentAngle = estimatedAngle;

    float distanceFactor = 0.8f;
    float lastCenterDistanceDiff = 0;

    float angleFactor = 0.8f;
    float lastAngleDiff = 0;

    const int ITERATIONS = highPrecision ? HIGH_PRECISION_ITERATIONS : MAX_SEARCH_ITERATIONS;
    for (int i = 0;i<ITERATIONS;i++) {
        currentTime = std::max(currentTime, 0.0f);

        Vector endPos;
        float assumedSpeed;
        if (slowDownTime > 0) {
            result = calculateTrajectoryFastEndSpeed(v0, v1, currentTime, currentAngle, acc, vMax, minimumTime);
            endPos = result.calculateSlowDownPos(slowDownTime);
            Vector continuationSpeed = result.continuationSpeed();
            assumedSpeed = std::max(std::abs(continuationSpeed.x), std::abs(continuationSpeed.y));
        } else {
            auto trajectoryInfo = calculatePositionFastEndSpeed(v0, v1, currentTime + minimumTime, currentAngle, acc, vMax);
            endPos = trajectoryInfo.endPos;
            assumedSpeed = std::max(std::abs(trajectoryInfo.increaseAtSpeed.x), std::abs(trajectoryInfo.increaseAtSpeed.y));
        }

        float targetDistance = position.distance(endPos);
        if (targetDistance < (highPrecision ? HIGH_QUALITY_TARGET_PRECISION : REGULAR_TARGET_PRECISION)) {
            if (slowDownTime <= 0) {
                result = calculateTrajectoryFastEndSpeed(v0, v1, currentTime, currentAngle, acc, vMax, minimumTime);
            }
            return result;
        }

        Vector currentCenterTimePos = fastEndSpeedCenterTimePos(v0, v1, currentTime + minimumTime);
        float newDistance = endPos.distance(currentCenterTimePos);
        float targetCenterDistance = currentCenterTimePos.distance(position);
        float currentCenterDistanceDiff = targetCenterDistance - newDistance;
        if ((lastCenterDistanceDiff < 0) != (currentCenterDistanceDiff < 0)) {
            distanceFactor *= 0.9f;
        } else {
            distanceFactor *= 1.05f;
        }
        lastCenterDistanceDiff = currentCenterDistanceDiff;
        currentTime += currentCenterDistanceDiff * distanceFactor / std::max(0.5f, assumedSpeed);

        // correct angle
        float newAngle = (endPos - currentCenterTimePos).angle();
        float targetCenterAngle = (position - currentCenterTimePos).angle();
        float currentAngleDiff = angleDiff(targetCenterAngle, newAngle);
        if (i >= 4 && (currentAngleDiff < 0) != (lastAngleDiff < 0)) {
            angleFactor *= 0.5f;
        }
        lastAngleDiff = currentAngleDiff;
        currentAngle += currentAngleDiff * angleFactor;
        //currentAngle += vectorAngleDiff((position - currentCenterTimePos), (endPos - currentCenterTimePos));
    }
    result.valid = false;
    return result;
}

static Vector necessaryAcceleration(Vector v0, Vector distance)
{
    // solve dist(v0, 0) == d
    // 0.5 * v0 * abs(v0) / acc = d
    // acc = 0.5 * v0 * abs(v0) / d = acc
    return Vector(v0.x * std::abs(v0.x) * 0.5f / distance.x,
                  v0.y * std::abs(v0.y) * 0.5f / distance.y);
}

SpeedProfile AlphaTimeTrajectory::findTrajectoryExactEndSpeed(Vector v0, Vector v1, Vector position, float acc, float vMax, float slowDownTime, bool highPrecision)
{
    const float MAX_ACCELERATION_FACTOR = 1.2f;
    SpeedProfile result;
    if (v1 == Vector(0, 0)) {
        Vector necessaryAcc = necessaryAcceleration(v0, position);
        float accLength = necessaryAcc.length();
        float timeDiff = std::abs(std::abs(v0.x) / necessaryAcc.x - std::abs(v0.y) / necessaryAcc.y);
        if (accLength > acc && accLength < acc * MAX_ACCELERATION_FACTOR && timeDiff < 0.1f) {
            result.valid = true;
            result.xProfile.acc = necessaryAcc.x;
            result.xProfile.counter = 2;
            result.xProfile.profile[0] = {v0.x, 0};
            result.xProfile.profile[1] = {0, std::abs(v0.x / necessaryAcc.x)};
            result.yProfile.acc = necessaryAcc.y;
            result.yProfile.counter = 2;
            result.yProfile.profile[0] = {v0.y, 0};
            result.yProfile.profile[1] = {0, std::abs(v0.y / necessaryAcc.y)};
            return result;
        }
    }
    float minTimeDistance = position.distance(minTimePos(v0, v1));

    // estimate rough time from distance
    // TODO: improve this estimate?
    float estimatedTime = minTimeDistance / acc;

    Vector estimateCenterPos = centerTimePos(v0, v1, estimatedTime);

    float estimatedAngle = normalizeAnglePositive((position - estimateCenterPos).angle());
    // calculate better estimate for the time
    estimatedTime = std::max(estimatedTime, 0.01f);

    // TODO: can this even still occur??
    if (std::isnan(estimatedTime)) {
        estimatedTime = 3;
    }
    if (std::isnan(estimatedAngle)) {
        // 0 is floating point instable, dont use that
        estimatedAngle = 0.05f;
    }

    // cached for usage in calculateTrajectoryExactEndSpeed
    float minimumTime = minTimeExactEndSpeed(v0, v1, acc);

    float currentTime = estimatedTime;
    float currentAngle = estimatedAngle;

    float distanceFactor = 0.8f;
    float lastCenterDistanceDiff = 0;

    float angleFactor = 0.8f;
    float lastAngleDiff = 0;

    const int ITERATIONS = highPrecision ? HIGH_PRECISION_ITERATIONS : MAX_SEARCH_ITERATIONS;
    for (int i = 0;i<ITERATIONS;i++) {
        currentTime = std::max(currentTime, 0.0f);

        Vector endPos;
        float assumedSpeed;
        if (slowDownTime > 0) {
            result = calculateTrajectoryExactEndSpeed(v0, v1, currentTime, currentAngle, acc, vMax, minimumTime);
            endPos = result.calculateSlowDownPos(slowDownTime);
            Vector continuationSpeed = result.continuationSpeed();
            assumedSpeed = std::max(std::abs(continuationSpeed.x), std::abs(continuationSpeed.y));
        } else {
            auto trajectoryInfo = calculatePositionExactEndSpeed(v0, v1, currentTime + minimumTime, currentAngle, acc, vMax);
            endPos = trajectoryInfo.endPos;
            assumedSpeed = std::max(std::abs(trajectoryInfo.increaseAtSpeed.x), std::abs(trajectoryInfo.increaseAtSpeed.y));
        }

        float targetDistance = position.distance(endPos);
        if (targetDistance < (highPrecision ? HIGH_QUALITY_TARGET_PRECISION : REGULAR_TARGET_PRECISION)) {
            if (slowDownTime <= 0) {
                result = calculateTrajectoryExactEndSpeed(v0, v1, currentTime, currentAngle, acc, vMax, minimumTime);
            }
            return result;
        }

        Vector currentCenterTimePos = centerTimePos(v0, v1, currentTime + minimumTime);
        float newDistance = endPos.distance(currentCenterTimePos);
        float targetCenterDistance = currentCenterTimePos.distance(position);
        float currentCenterDistanceDiff = targetCenterDistance - newDistance;
        if ((lastCenterDistanceDiff < 0) != (currentCenterDistanceDiff < 0)) {
            distanceFactor *= 0.85f;
        } else {
            distanceFactor *= 1.05f;
        }
        lastCenterDistanceDiff = currentCenterDistanceDiff;
        currentTime += currentCenterDistanceDiff * distanceFactor / std::max(0.5f, assumedSpeed);

        // correct angle
        float newAngle = (endPos - currentCenterTimePos).angle();
        float targetCenterAngle = (position - currentCenterTimePos).angle();
        //currentAngle += vectorAngleDiff((position - currentCenterTimePos), (endPos - currentCenterTimePos));
        float currentAngleDiff = angleDiff(targetCenterAngle, newAngle);
        if (i >= 4 && (currentAngleDiff < 0) != (lastAngleDiff < 0)) {
            angleFactor *= 0.5f;
        }
        lastAngleDiff = currentAngleDiff;
        currentAngle += currentAngleDiff * angleFactor;
    }
    result.valid = false;
    return result;
}
