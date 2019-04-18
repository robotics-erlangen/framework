#include "alphatimetrajectory.h"
#include <QDebug>

static float sign(float x)
{
    return x < 0.0f ? -1.0f : 1.0f;
}

// exponential slowdown calculation
const float SLOW_DOWN_TIME = 0.3f; // must be the same as in alphapathsearch
const float MIN_ACC_FACTOR = 0.3f;
float SpeedProfile1D::calculateSlowDownPos(float slowDownTime) const
{
    float pos = 0;
    float slowDownStartTime = profile[counter-1].t - slowDownTime;
    float endTime = profile[counter-1].t + SLOW_DOWN_TIME - slowDownTime;
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
            float a0 = acc * (MIN_ACC_FACTOR + (1 - MIN_ACC_FACTOR) * toEndTime0 / SLOW_DOWN_TIME);
            float a1 = acc * (MIN_ACC_FACTOR + (1 - MIN_ACC_FACTOR) * toEndTime1 / SLOW_DOWN_TIME);

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
    float endTime = profile[counter-1].t + SLOW_DOWN_TIME - slowDownTime;
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
            float a0 = acc * (MIN_ACC_FACTOR + (1 - MIN_ACC_FACTOR) * toEndTime0 / SLOW_DOWN_TIME);
            float a1 = acc * (MIN_ACC_FACTOR + (1 - MIN_ACC_FACTOR) * toEndTime1 / SLOW_DOWN_TIME);

            float averageAcc = (a0 + a1) * 0.5f;
            float v1 = profile[i+1].v;
            float t = std::abs(v0 - v1) / averageAcc;

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

    float endTime = profile[counter-1].t + SLOW_DOWN_TIME - slowDownTime;
    float totalTime = t0;
    for (;i<counter-1;i++) {

        float toEndTime0 = endTime - t0;
        float toEndTime1 = endTime - profile[i+1].t;
        float a0 = acc * (MIN_ACC_FACTOR + (1 - MIN_ACC_FACTOR) * toEndTime0 / SLOW_DOWN_TIME);
        float a1 = acc * (MIN_ACC_FACTOR + (1 - MIN_ACC_FACTOR) * toEndTime1 / SLOW_DOWN_TIME);

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

    float endTime = profile[counter-1].t + SLOW_DOWN_TIME - slowDownTime;
    float totalTime = t0;
    for (;i<counter-1;i++) {

        float toEndTime0 = endTime - t0;
        float toEndTime1 = endTime - profile[i+1].t;
        float a0 = acc * (MIN_ACC_FACTOR + (1 - MIN_ACC_FACTOR) * toEndTime0 / SLOW_DOWN_TIME);
        float a1 = acc * (MIN_ACC_FACTOR + (1 - MIN_ACC_FACTOR) * toEndTime1 / SLOW_DOWN_TIME);

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

bool AlphaTimeTrajectory::isInputValidExactEndSpeed(Vector v0, Vector v1, float time, float acc)
{
    Vector diff = v1 - v0;
    Vector absDiff(std::abs(diff.x), std::abs(diff.y));
    return time * time >= (absDiff.x * absDiff.x + absDiff.y * absDiff.y) / (acc * acc);
}

bool AlphaTimeTrajectory::isInputValidFastEndSpeed(Vector v0, Vector v1, float time, float acc)
{
    // use endspeed as the closest value of startSpeed on [0, endSpeed]
    float endSpeedX = std::max(std::min(v0.x, std::max(v1.x, 0.0f)), std::min(v1.x, 0.0f));
    float endSpeedY = std::max(std::min(v0.y, std::max(v1.y, 0.0f)), std::min(v1.y, 0.0f));
    return isInputValidExactEndSpeed(v0, Vector(endSpeedX, endSpeedY), time, acc);
}

float AlphaTimeTrajectory::minTimeExactEndSpeed(Vector v0, Vector v1, float acc)
{
    Vector diff = v1 - v0;
    Vector absDiff(std::abs(diff.x), std::abs(diff.y));

    if (absDiff.x == 0.0f && absDiff.y == 0.0f) {
        return 0;
    } else if (absDiff.x == 0.0f) {
        return absDiff.y / acc;
    } else if (absDiff.y == 0.0f) {
        return absDiff.x / acc;
    }
    // tx = absDiff.x / alpha
    // ty = absDiff.y / sqrt(1 - alpha * alpha)
    // => Solve tx =!= ty
    float alpha = absDiff.x / std::sqrt(absDiff.x * absDiff.x + absDiff.y * absDiff.y);
    // TODO: this can be calculated more efficiently
    // but is is floating point stable this way
    if (absDiff.x > absDiff.y) {
        return absDiff.x / (acc * alpha);
    } else {
        return absDiff.y / (acc * std::sqrt(1 - alpha * alpha));
    }
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

AlphaTimeTrajectory::TrajectoryPosInfo1D AlphaTimeTrajectory::calculateEndPos1D(float v0, float v1, float hintDist, float acc, float vMax)
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

AlphaTimeTrajectory::TrajectoryPosInfo1D AlphaTimeTrajectory::calculate1DTrajectoryFastEndSpeed(float v0, float v1, float time, bool directionPositive, float acc, float vMax)
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

    TrajectoryPosInfo1D xInfo = calculate1DTrajectoryFastEndSpeed(v0.x, v1.x, time, alphaX > 0, acc * std::abs(alphaX), vMax * std::abs(alphaX));
    TrajectoryPosInfo1D yInfo = calculate1DTrajectoryFastEndSpeed(v0.y, v1.y, time, alphaY > 0, acc * std::abs(alphaY), vMax * std::abs(alphaY));
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
    auto xInfo = calculateEndPos1D(v0.x, v1.x, sign(alphaX) * restTimeX, acc * std::abs(alphaX), vMax * std::abs(alphaX));
    auto yInfo = calculateEndPos1D(v0.y, v1.y, sign(alphaY) * restTimeY, acc * std::abs(alphaY), vMax * std::abs(alphaY));
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

void AlphaTimeTrajectory::calculate1DSpeedProfile(float v0, float v1, float hintDist, float acc, float vMax, SpeedProfile1D &p)
{
    p.acc = acc;
    p.profile[0] = {v0, 0};

    if (hintDist == 0.0f) {
        p.profile[1] = {v1, std::abs(v0 - v1) / acc};
        p.counter = 2;
    } else if (hintDist < 0 && v0 <= v1) {
        if (v0 >= -vMax) {
            createFreeExtraTimeSegment(v0, v0, v1, hintDist, acc, vMax, p);
        } else if (v0 < -vMax && v1 >= -vMax) {
            p.profile[1] = {-vMax, std::abs(v0 + vMax) / acc};
            p.profile[2] = {-vMax, -hintDist};
            p.profile[3] = {v1, std::abs(v1 + vMax) / acc};
            p.counter = 4;
        } else {
            createFreeExtraTimeSegment(v0, v1, v1, hintDist, acc, vMax, p);
        }
    } else if (hintDist < 0 && v0 > v1) {
        if (v1 >= -vMax) {
            createFreeExtraTimeSegment(v0, v1, v1, hintDist, acc, vMax, p);
        } else if (v1 < -vMax && v0 >= -vMax) {
            p.profile[1] = {-vMax, std::abs(v0 + vMax) / acc};
            p.profile[2] = {-vMax, -hintDist};
            p.profile[3] = {v1, std::abs(v1 + vMax) / acc};
            p.counter = 4;
        } else {
            createFreeExtraTimeSegment(v0, v0, v1, hintDist, acc, vMax, p);
        }
    } else if (hintDist > 0 && v0 <= v1) {
        if (v1 <= vMax) {
            createFreeExtraTimeSegment(v0, v1, v1, hintDist, acc, vMax, p);
        } else if (v1 > vMax && v0 <= vMax) {
            p.profile[1] = {vMax, std::abs(v0 - vMax) / acc};
            p.profile[2] = {vMax, hintDist};
            p.profile[3] = {v1, std::abs(v1 - vMax) / acc};
            p.counter = 4;
        } else {
            createFreeExtraTimeSegment(v0, v0, v1, hintDist, acc, vMax, p);
        }
    } else { // hintDist > 0, v0 > v1
        //assert(hintDist > 0 && v0 > v1);
        if (v0 <= vMax) {
            createFreeExtraTimeSegment(v0, v0, v1, hintDist, acc, vMax, p);
        } else if (v0 > vMax && v1 <= vMax) {
            p.profile[1] = {vMax, std::abs(v0 - vMax) / acc};
            p.profile[2] = {vMax, hintDist};
            p.profile[3] = {v1, std::abs(v1 - vMax) / acc};
            p.counter = 4;
        } else {
            createFreeExtraTimeSegment(v0, v1, v1, hintDist, acc, vMax, p);
        }
    }
}

void AlphaTimeTrajectory::calculate1DTrajectoryFastEndSpeed(float v0, float v1, float time, bool directionPositive, float acc, float vMax, SpeedProfile1D &profile)
{
    // TODO: simple case with v1 = 0 seperately?
    float realV1, extraTime;
    adjustEndSpeed(v0, v1, time, directionPositive, acc, extraTime, realV1);

    if (extraTime == 0.0f) {
        profile.acc = acc;
        profile.profile[0] = {v0, 0};
        profile.profile[1] = {realV1, std::abs(realV1 - v0) / acc};
        profile.counter = 2;
    } else {
        // TODO: remove the negative time in calculateEndPos1D
        calculate1DSpeedProfile(v0, realV1, directionPositive ? extraTime : -extraTime, acc, vMax, profile);
    }
}

SpeedProfile AlphaTimeTrajectory::calculateTrajectoryFastEndSpeed(Vector v0, Vector v1, float time, float angle, float acc, float vMax)
{
    angle = adjustAngleFastEndSpeed(v0, v1, time, angle, acc);
    float alphaX = std::sin(angle);
    float alphaY = std::cos(angle);

    SpeedProfile result;
    calculate1DTrajectoryFastEndSpeed(v0.x, v1.x, time, alphaX > 0, acc * std::abs(alphaX), vMax * std::abs(alphaX), result.xProfile);
    calculate1DTrajectoryFastEndSpeed(v0.y, v1.y, time, alphaY > 0, acc * std::abs(alphaY), vMax * std::abs(alphaY), result.yProfile);
    result.xProfile.integrateTime();
    result.yProfile.integrateTime();
    result.inputTime = time;
    result.inputAngle = angle;
    return result;
}

SpeedProfile AlphaTimeTrajectory::calculateTrajectoryExactEndSpeed(Vector v0, Vector v1, float time, float angle, float acc, float vMax)
{
    angle = adjustAngle(v0, v1, time, angle, acc);
    float alphaX = std::sin(angle);
    float alphaY = std::cos(angle);

    Vector diff = v1 - v0;
    float restTimeX = (time - std::abs(diff.x) / (acc * std::abs(alphaX)));
    float restTimeY = (time - std::abs(diff.y) / (acc * std::abs(alphaY)));

    SpeedProfile result;
    calculate1DSpeedProfile(v0.x, v1.x, alphaX > 0 ? restTimeX : -restTimeX, acc * std::abs(alphaX), vMax * std::abs(alphaX), result.xProfile);
    calculate1DSpeedProfile(v0.y, v1.y, alphaY > 0 ? restTimeY : -restTimeY, acc * std::abs(alphaY), vMax * std::abs(alphaY), result.yProfile);
    result.xProfile.integrateTime();
    result.yProfile.integrateTime();
    result.inputTime = time;
    result.inputAngle = angle;
    return result;
}

// functions for position search
static Vector minTimePos(Vector startSpeed, Vector endSpeed)
{
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
    // TODO: this can be calculated more efficiently
    return Vector(dist(startSpeed.x, endSpeed.x, alpha), dist(startSpeed.y, endSpeed.y, std::sqrt(1 - alpha * alpha)));
}

static float minTime(Vector startSpeed, Vector endSpeed)
{
    // TODO: dont recalculate these vectors everywhere
    Vector diff = endSpeed - startSpeed;
    Vector absDiff(std::abs(diff.x), std::abs(diff.y));

    if (absDiff.x == 0.0f && absDiff.y == 0.0f) {
        return 0;
    }
    // tx = absDiff.x / alpha
    // ty = absDiff.y / sqrt(1 - alpha * alpha)
    // => Solve tx =!= ty
    float alpha = absDiff.x / std::sqrt(absDiff.x * absDiff.x + absDiff.y * absDiff.y);
    // TODO: this can be calculated more efficiently
    return std::min(absDiff.x / alpha, absDiff.y / std::sqrt(1 - alpha * alpha));
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

static float vectorAngleDiff(Vector a, Vector b)
{
    float y = (a.x * b.y) - (b.x * a.y);
    float x = (a.x * b.x) + (a.y * b.y);
    return std::atan2(y, x);
}

// normalize between [-pi, pi]
static float angleDiff(float a1, float a2)
{
    float angle = a1 - a2;
    while (angle < -float(M_PI)) angle += float(2 * M_PI);
    while (angle >= float(M_PI)) angle -= float(2 * M_PI);
    return angle;
}

SpeedProfile AlphaTimeTrajectory::findTrajectoryFastEndSpeed(Vector v0, Vector v1, Vector position, float acc, float vMax, float slowDownTime)
{
    if (v1.x == 0.0f && v1.y == 0.0f) {
        return findTrajectoryExactEndSpeed(v0, v1, position, acc, vMax, slowDownTime);
    }
    SpeedProfile result;
    // TODO: custom minTimePos for fast endspeed mode
    float minTimeDistance = position.distance(minTimePos(v0, v1));

    // estimate rough time from distance
    // TODO: improve this estimate?
    float estimatedTime = minTimeDistance / acc;

    Vector estimateCenterPos = fastEndSpeedCenterTimePos(v0, v1, estimatedTime);

    float estimatedAngle = normalizeAnglePositive((position - estimateCenterPos).angle());
    // TODO: custom minTime for fast endspeed mode
    // calculate better estimate for the time
    estimatedTime = std::max(estimatedTime, minTime(v0, v1) + 0.01f);

    // TODO: can this even still occur??
    if (std::isnan(estimatedTime)) {
        estimatedTime = 3;
    }
    if (std::isnan(estimatedAngle)) {
        // 0 is floating point instable, dont use that
        estimatedAngle = 0.05f;
    }

    float currentTime = estimatedTime;
    float currentAngle = estimatedAngle;

    float distanceFactor = 0.8f;
    float lastCenterDistanceDiff = 0;

    float angleFactor = 0.8f;
    float lastAngleDiff = 0;

    for (int i = 0;i<30;i++) {
        // TODO: calculate minimum time and just dont got below that
        if (!isInputValidFastEndSpeed(v0, v1, currentTime, acc)) {
            currentTime *= 1.5f;
            continue;
        }
        Vector endPos;
        float assumedSpeed;
        if (slowDownTime > 0) {
            result = calculateTrajectoryFastEndSpeed(v0, v1, currentTime, currentAngle, acc, vMax);
            endPos = result.calculateSlowDownPos(slowDownTime);
            Vector continuationSpeed = result.continuationSpeed();
            assumedSpeed = std::max(std::abs(continuationSpeed.x), std::abs(continuationSpeed.y));
        } else {
            auto trajectoryInfo = calculatePositionFastEndSpeed(v0, v1, currentTime, currentAngle, acc, vMax);
            endPos = trajectoryInfo.endPos;
            assumedSpeed = std::max(std::abs(trajectoryInfo.increaseAtSpeed.x), std::abs(trajectoryInfo.increaseAtSpeed.y));
        }

        float targetDistance = position.distance(endPos);
        if (targetDistance < 0.01f) {
            if (slowDownTime <= 0) {
                result = calculateTrajectoryFastEndSpeed(v0, v1, currentTime, currentAngle, acc, vMax);
            }
            result.inputTime = currentTime;
            result.inputAngle = currentAngle;
            return result;
        }

        Vector currentCenterTimePos = fastEndSpeedCenterTimePos(v0, v1, currentTime);
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

SpeedProfile AlphaTimeTrajectory::findTrajectoryExactEndSpeed(Vector v0, Vector v1, Vector position, float acc, float vMax, float slowDownTime)
{
    SpeedProfile result;
    float minTimeDistance = position.distance(minTimePos(v0, v1));

    // estimate rough time from distance
    // TODO: improve this estimate?
    float estimatedTime = minTimeDistance / acc;

    Vector estimateCenterPos = centerTimePos(v0, v1, estimatedTime);

    float estimatedAngle = normalizeAnglePositive((position - estimateCenterPos).angle());
    // calculate better estimate for the time
    estimatedTime = std::max(estimatedTime, minTime(v0, v1) + 0.01f);

    // TODO: can this even still occur??
    if (std::isnan(estimatedTime)) {
        estimatedTime = 3;
    }
    if (std::isnan(estimatedAngle)) {
        // 0 is floating point instable, dont use that
        estimatedAngle = 0.05f;
    }

    float currentTime = estimatedTime;
    float currentAngle = estimatedAngle;

    float distanceFactor = 0.8f;
    float lastCenterDistanceDiff = 0;

    float angleFactor = 0.8f;
    float lastAngleDiff = 0;

    for (int i = 0;i<30;i++) {
        // TODO: calculate minimum time and just dont got below that
        if (!isInputValidExactEndSpeed(v0, v1, currentTime, acc)) {
            currentTime *= 1.5f;
            continue;
        }
        Vector endPos;
        float assumedSpeed;
        if (slowDownTime > 0) {
            result = calculateTrajectoryExactEndSpeed(v0, v1, currentTime, currentAngle, acc, vMax);
            endPos = result.calculateSlowDownPos(slowDownTime);
            Vector continuationSpeed = result.continuationSpeed();
            assumedSpeed = std::max(std::abs(continuationSpeed.x), std::abs(continuationSpeed.y));
        } else {
            auto trajectoryInfo = calculatePositionExactEndSpeed(v0, v1, currentTime, currentAngle, acc, vMax);
            endPos = trajectoryInfo.endPos;
            assumedSpeed = std::max(std::abs(trajectoryInfo.increaseAtSpeed.x), std::abs(trajectoryInfo.increaseAtSpeed.y));
        }

        float targetDistance = position.distance(endPos);
        if (targetDistance < 0.01f) {
            if (slowDownTime <= 0) {
                result = calculateTrajectoryExactEndSpeed(v0, v1, currentTime, currentAngle, acc, vMax);
            }
            result.inputTime = currentTime;
            result.inputAngle = currentAngle;
            return result;
        }

        Vector currentCenterTimePos = centerTimePos(v0, v1, currentTime);
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

std::vector<Vector> AlphaTimeTrajectory::searchPoints(Vector v0, Vector v1, Vector position, float acc, float vMax, float slowDownTime)
{
    SpeedProfile result;
    float minTimeDistance = position.distance(minTimePos(v0, v1));

    // estimate rough time from distance
    // TODO: improve this estimate?
    float estimatedTime = minTimeDistance / acc;

    Vector estimateCenterPos = centerTimePos(v0, v1, estimatedTime);

    float estimatedAngle = normalizeAnglePositive((position - estimateCenterPos).angle());
    // calculate better estimate for the time
    estimatedTime = std::max(estimatedTime, minTime(v0, v1) + 0.01f);

    // TODO: can this even still occur??
    if (std::isnan(estimatedTime)) {
        estimatedTime = 3;
    }
    if (std::isnan(estimatedAngle)) {
        // 0 is floating point instable, dont use that
        estimatedAngle = 0.05f;
    }

    float currentTime = estimatedTime;
    float currentAngle = estimatedAngle;

    float distanceFactor = 0.8f;
    float lastCenterDistanceDiff = 0;

    std::vector<Vector> res;
    for (int i = 0;i<10;i++) {
        // TODO: calculate minimum time and just dont got below that
        if (!isInputValidExactEndSpeed(v0, v1, currentTime, acc)) {
            currentTime *= 1.5f;
            continue;
        }
        Vector endPos;
        float assumedSpeed;
        if (slowDownTime > 0) {
            result = calculateTrajectoryExactEndSpeed(v0, v1, currentTime, currentAngle, acc, vMax);
            endPos = result.calculateSlowDownPos(slowDownTime);
            Vector continuationSpeed = result.continuationSpeed();
            assumedSpeed = std::max(std::abs(continuationSpeed.x), std::abs(continuationSpeed.y));
        } else {
             auto trajectoryInfo = calculatePositionExactEndSpeed(v0, v1, currentTime, currentAngle, acc, vMax);
             endPos = trajectoryInfo.endPos;
             assumedSpeed = std::max(std::abs(trajectoryInfo.increaseAtSpeed.x), std::abs(trajectoryInfo.increaseAtSpeed.y));
        }
        res.push_back(endPos);

        float targetDistance = position.distance(endPos);
        if (targetDistance < 0.01f) {
            if (slowDownTime <= 0) {
                result = calculateTrajectoryExactEndSpeed(v0, v1, currentTime, currentAngle, acc, vMax);
            }
            result.inputTime = currentTime;
            result.inputAngle = currentAngle;
            return res;
        }

        Vector currentCenterTimePos = centerTimePos(v0, v1, currentTime);
        float newDistance = endPos.distance(currentCenterTimePos);
        float targetCenterDistance = currentCenterTimePos.distance(position);
        float currentCenterDistanceDiff = targetCenterDistance - newDistance;
        if ((lastCenterDistanceDiff < 0) != (currentCenterDistanceDiff < 0)) {
            distanceFactor *= 0.85f;
        } else {
            distanceFactor *= 1.05f;
        }
        lastCenterDistanceDiff = currentCenterDistanceDiff;
        currentTime += currentCenterDistanceDiff * distanceFactor / assumedSpeed;

        // correct angle
        float newAngle = (endPos - currentCenterTimePos).angle();
        float targetCenterAngle = (position - currentCenterTimePos).angle();
        //currentAngle += vectorAngleDiff((position - currentCenterTimePos), (endPos - currentCenterTimePos));
        currentAngle += angleDiff(targetCenterAngle, newAngle) * 0.8f;
    }
    result.valid = false;
    return res;
}

static float random(float min, float max)
{
    float range = max - min;
    return min + float(rand()) * range / RAND_MAX;
}

static Vector randomSpeed(float maxSpeed)
{
    Vector testSpeed;
    do {
        testSpeed.x = random(-maxSpeed, maxSpeed);
        testSpeed.y = random(-maxSpeed, maxSpeed);
    } while (testSpeed.lengthSquared() > maxSpeed);
    return testSpeed;
}

static Vector randomPointInField()
{
    return Vector(random(-6, 6), random(-6, 6));
}

#include <sys/time.h>
static long getTime()
{
    timeval tv;
    if (gettimeofday(&tv, NULL) != 0) {
        return 0;
    }

    return (long long)(tv.tv_sec) * 1000000LL + (long long)(tv.tv_usec);
}

void AlphaTimeTrajectory::testSearch()
{
    qDebug() <<"Start!";
    long startTime = getTime();
    for (int i = 0;i<1000000;i++) {
        Vector startSpeed = randomSpeed(3), endSpeed = randomSpeed(3);
        Vector position = randomPointInField();
        SpeedProfile p = findTrajectoryFastEndSpeed(startSpeed, endSpeed, position, 3.0f, 3.5f, 0.0f);
        p.positionForTime(p.time());
    }
    qDebug() <<"fast end speed no slowdown: "<<(getTime() - startTime) / 1000.0f;
    /*startTime = getTime();
    for (int i = 0;i<1000000;i++) {
        Vector startSpeed = randomSpeed(3), endSpeed = randomSpeed(3);
        Vector position = randomPointInField();
        SpeedProfile p = findTrajectoryFastEndSpeed(startSpeed, endSpeed, position, 3.0f, 3.5f, 0.4f);
        p.positionForTime(p.time());
    }
    qDebug() <<"fast end speed with slowdown: "<<(getTime() - startTime) / 1000.0f;
    startTime = getTime();
    for (int i = 0;i<1000000;i++) {
        Vector startSpeed = randomSpeed(3), endSpeed = randomSpeed(3);
        Vector position = randomPointInField();
        SpeedProfile p = findTrajectoryExactEndSpeed(startSpeed, endSpeed, position, 3.0f, 3.5f, 0.0f);
        p.positionForTime(p.time());
    }
    qDebug() <<"exact end speed no slowdown: "<<(getTime() - startTime) / 1000.0f;
    startTime = getTime();
    for (int i = 0;i<1000000;i++) {
        Vector startSpeed = randomSpeed(3), endSpeed = randomSpeed(3);
        Vector position = randomPointInField();
        SpeedProfile p = findTrajectoryExactEndSpeed(startSpeed, endSpeed, position, 3.0f, 3.5f, 0.4f);
        p.positionForTime(p.time());
    }
    qDebug() <<"exact end speed with slowdown: "<<(getTime() - startTime) / 1000.0f;*/
    // normal, 03: fast endspeed, no slowdown 3085
    // normal, 03: fast endspeed, slowdown 3745
    // normal, 03: exact endspeed, no slowdown 2375
    // normal, 03: exact endspeed, slowdown 2898

    // optimierung von calculate1DSpeedProfile
    // normal, 03: fast endspeed, no slowdown 3147
    // normal, 03: fast endspeed, slowdown 3711
    // normal, 03: exact endspeed, no slowdown 2415
    // normal, 03: exact endspeed, slowdown 2847

    // optimierung von calculateEndPos1D
    // normal, 03: fast endspeed, no slowdown 3019
    // normal, 03: fast endspeed, slowdown 3738
    // normal, 03: exact endspeed, no slowdown 2289
    // normal, 03: exact endspeed, slowdown 2844
}
