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
#include "parameterization.h"
#include <QDebug>

// helper functions
static float sign(float x)
{
    return x < 0.0f ? -1.0f : 1.0f;
}

static float normalizeAnglePositive(float angle)
{
    while (angle < 0) angle += float(2 * M_PI);
    while (angle >= float(2 * M_PI)) angle -= float(2 * M_PI);
    return angle;
}

// returns endspeed as the closest value of startSpeed on [0, endSpeed]
static Vector minTimeEndSpeed(Vector startSpeed, Vector endSpeed)
{
    float endSpeedX = std::max(std::min(startSpeed.x, std::max(endSpeed.x, 0.0f)), std::min(endSpeed.x, 0.0f));
    float endSpeedY = std::max(std::min(startSpeed.y, std::max(endSpeed.y, 0.0f)), std::min(endSpeed.y, 0.0f));
    return Vector(endSpeedX, endSpeedY);
}

static float adjustAngle(Vector startSpeed, Vector endSpeed, float time, float angle, float acc, bool fastEndSpeed)
{
    if (fastEndSpeed) {
        endSpeed = minTimeEndSpeed(startSpeed, endSpeed);
    }
    angle = normalizeAnglePositive(angle);

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
        // sometimes happens because of floating point inaccuracies
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

float AlphaTimeTrajectory::minimumTime(Vector startSpeed, Vector endSpeed, float acc, bool fastEndSpeed)
{
    if (fastEndSpeed) {
        endSpeed = minTimeEndSpeed(startSpeed, endSpeed);
    }
    Vector diff = endSpeed - startSpeed;
    return diff.length() / acc;
}



AlphaTimeTrajectory::TrajectoryPosInfo2D AlphaTimeTrajectory::calculatePosition(Vector v0, Vector v1, float time, float angle,
                                                                                float acc, float vMax, bool fastEndSpeed)
{
    angle = adjustAngle(v0, v1, time, angle, acc, fastEndSpeed);
    float alphaX = std::sin(angle);
    float alphaY = std::cos(angle);

    SpeedProfile1D::TrajectoryPosInfo1D xInfo, yInfo;
    if (fastEndSpeed) {
        xInfo = SpeedProfile1D::calculateEndPos1DFastSpeed(v0.x, v1.x, time, alphaX > 0, acc * std::abs(alphaX), vMax * std::abs(alphaX));
        yInfo = SpeedProfile1D::calculateEndPos1DFastSpeed(v0.y, v1.y, time, alphaY > 0, acc * std::abs(alphaY), vMax * std::abs(alphaY));
    } else {
        Vector diff = v1 - v0;
        float restTimeX = (time - std::abs(diff.x) / (acc * std::abs(alphaX)));
        float restTimeY = (time - std::abs(diff.y) / (acc * std::abs(alphaY)));

        xInfo = SpeedProfile1D::calculateEndPos1D(v0.x, v1.x, sign(alphaX) * restTimeX, acc * std::abs(alphaX), vMax * std::abs(alphaX));
        yInfo = SpeedProfile1D::calculateEndPos1D(v0.y, v1.y, sign(alphaY) * restTimeY, acc * std::abs(alphaY), vMax * std::abs(alphaY));
    }


    return {Vector(xInfo.endPos, yInfo.endPos), Vector(xInfo.increaseAtSpeed, yInfo.increaseAtSpeed)};
}

SpeedProfile AlphaTimeTrajectory::calculateTrajectory(Vector v0, Vector v1, float time, float angle, float acc, float vMax,
                                                      float slowDownTime, bool fastEndSpeed, float minTime)
{
    if (minTime < 0) {
        minTime = minimumTime(v0, v1, acc, fastEndSpeed);
    }
    time += minTime;

    angle = adjustAngle(v0, v1, time, angle, acc, fastEndSpeed);
    float alphaX = std::sin(angle);
    float alphaY = std::cos(angle);

    SpeedProfile result(slowDownTime);

    if (fastEndSpeed) {
        result.xProfile.calculate1DTrajectoryFastEndSpeed(v0.x, v1.x, time, alphaX > 0, acc * std::abs(alphaX), vMax * std::abs(alphaX));
        result.yProfile.calculate1DTrajectoryFastEndSpeed(v0.y, v1.y, time, alphaY > 0, acc * std::abs(alphaY), vMax * std::abs(alphaY));
    } else {
        Vector diff = v1 - v0;
        float restTimeX = (time - std::abs(diff.x) / (acc * std::abs(alphaX)));
        float restTimeY = (time - std::abs(diff.y) / (acc * std::abs(alphaY)));

        result.xProfile.calculate1DTrajectory(v0.x, v1.x, restTimeX, alphaX > 0, acc * std::abs(alphaX), vMax * std::abs(alphaX));
        result.yProfile.calculate1DTrajectory(v0.y, v1.y, restTimeY, alphaY > 0, acc * std::abs(alphaY), vMax * std::abs(alphaY));
    }

    result.xProfile.integrateTime();
    result.yProfile.integrateTime();
    return result;
}

// functions for position search
static Vector centerTimePos(Vector startSpeed, Vector endSpeed, float time, bool fastEndSpeed)
{
    if (fastEndSpeed) {
        endSpeed = minTimeEndSpeed(startSpeed, endSpeed);
    }
    return (startSpeed + endSpeed) * (0.5f * time);
}

Vector AlphaTimeTrajectory::minTimePos(Vector v0, Vector v1, float acc, float slowDownTime)
{
    float minTime = minimumTime(v0, v1, acc, false);
    if (slowDownTime == 0.0f) {
        return (v0 + v1) * (minTime * 0.5f);
    } else {
        // assumes that slowDownTime can only be given with v1 = (0, 0)
        // construct speed profile for slowing down to zero
        SpeedProfile profile(slowDownTime);
        profile.xProfile.counter = 2;
        profile.xProfile.profile[0] = {v0.x, 0};
        profile.xProfile.profile[1] = {v1.x, minTime};

        profile.yProfile.counter = 2;
        profile.yProfile.profile[0] = {v0.y, 0};
        profile.yProfile.profile[1] = {v1.y, minTime};

        return profile.endPos();
    }
}

// normalize between [-pi, pi]
static float angleDiff(float a1, float a2)
{
    float angle = a1 - a2;
    while (angle < -float(M_PI)) angle += float(2 * M_PI);
    while (angle >= float(M_PI)) angle -= float(2 * M_PI);
    return angle;
}

static Vector necessaryAcceleration(Vector v0, Vector distance)
{
    // solve dist(v0, 0) == d
    // 0.5 * v0 * abs(v0) / acc = d
    // acc = 0.5 * v0 * abs(v0) / d = acc
    return Vector(v0.x * std::abs(v0.x) * 0.5f / distance.x,
                  v0.y * std::abs(v0.y) * 0.5f / distance.y);
}

SpeedProfile AlphaTimeTrajectory::findTrajectory(Vector v0, Vector v1, Vector position, float acc, float vMax,
                                                 float slowDownTime, bool highPrecision, bool fastEndSpeed)
{
    const float MAX_ACCELERATION_FACTOR = 1.2f;
    SpeedProfile result(slowDownTime);
    if (v1 == Vector(0, 0)) {
        fastEndSpeed = false; // using fast end speed is more computationally intensive

        Vector necessaryAcc = necessaryAcceleration(v0, position);
        float accLength = necessaryAcc.length();
        const Vector times(std::abs(v0.x) / necessaryAcc.x, std::abs(v0.y) / necessaryAcc.y);
        const float timeDiff = std::abs(times.x - times.y);
        const bool directionMatches = std::signbit(v0.x) == std::signbit(position.x) && std::signbit(v0.y) == std::signbit(position.y);
        if (directionMatches && accLength > acc && accLength < acc * MAX_ACCELERATION_FACTOR && slowDownTime == 0.0f) {
            result.valid = true;
            result.slowDownTime = 0;
            result.xProfile.counter = 2;
            result.xProfile.profile[0] = {v0.x, 0};
            result.xProfile.profile[1] = {0, std::abs(v0.x / necessaryAcc.x)};
            result.yProfile.counter = 2;
            result.yProfile.profile[0] = {v0.y, 0};
            result.yProfile.profile[1] = {0, std::abs(v0.y / necessaryAcc.y)};
            if (timeDiff < 0.1f) {
                return result;
            } else {
                if (times.x > times.y) {
                    result.xProfile.create1DAccelerationByDistance(v0.x, 0, times.y, position.x);
                    result.xProfile.integrateTime();
                } else {
                    result.yProfile.create1DAccelerationByDistance(v0.y, 0, times.x, position.y);
                    result.yProfile.integrateTime();
                }
                const float accX = (result.xProfile.profile[1].v - result.xProfile.profile[0].v) / (result.xProfile.profile[1].t - result.xProfile.profile[0].t);
                const float accY = (result.yProfile.profile[1].v - result.yProfile.profile[0].v) / (result.yProfile.profile[1].t - result.yProfile.profile[0].t);
                const float totalAcc = std::sqrt(accX * accX + accY * accY);
                if (totalAcc < acc * MAX_ACCELERATION_FACTOR && result.endPos().distanceSq(position) < 0.01f * 0.01f) {
                    return result;
                }
            }
        }
    }

    // TODO: custom minTimePos for fast endspeed mode
    Vector minPos = minTimePos(v0, v1, acc, slowDownTime);
    float minTimeDistance = position.distance(minPos);

    const bool useMinTimePosForCenterPos = minTimeDistance < PARAMETER(AlphaTimeTrajectory, 0, 0.007f, 0.05);

    // estimate rough time from distance
    // TODO: improve this estimate?
    float estimatedTime = minTimeDistance / acc;

    Vector estimateCenterPos = centerTimePos(v0, v1, estimatedTime, fastEndSpeed);

    float estimatedAngle = normalizeAnglePositive((position - estimateCenterPos).angle());
    if (std::isnan(estimatedAngle)) {
        // 0 might be floating point instable, dont use that
        estimatedAngle = 0.05f;
    }

    // calculate better estimate for the time
    estimatedTime = std::max(estimatedTime, 0.001f);

    // cached for usage in calculateTrajectory
    float minTime = minimumTime(v0, v1, acc, fastEndSpeed);

    float currentTime = estimatedTime;
    float currentAngle = estimatedAngle;

    float distanceFactor = PARAMETER(AlphaTimeTrajectory, 0.3, 0.8f, 1.5);
    float lastCenterDistanceDiff = 0;

    float angleFactor = PARAMETER(AlphaTimeTrajectory, 0.7, 1.07f, 1.5);
    float lastAngleDiff = 0;

    const int ITERATIONS = highPrecision ? HIGH_PRECISION_ITERATIONS : MAX_SEARCH_ITERATIONS;
    for (int i = 0;i<ITERATIONS;i++) {
        currentTime = std::max(currentTime, 0.0f);

        Vector endPos;
        float assumedSpeed;
        if (slowDownTime > 0) {
            result = calculateTrajectory(v0, v1, currentTime, currentAngle, acc, vMax, slowDownTime, fastEndSpeed, minTime);
            endPos = result.endPos();
            Vector continuationSpeed = result.continuationSpeed();
            assumedSpeed = std::max(std::abs(continuationSpeed.x), std::abs(continuationSpeed.y));
        } else {
            auto trajectoryInfo = calculatePosition(v0, v1, currentTime + minTime, currentAngle, acc, vMax, fastEndSpeed);
            endPos = trajectoryInfo.endPos;
            assumedSpeed = std::max(std::abs(trajectoryInfo.increaseAtSpeed.x), std::abs(trajectoryInfo.increaseAtSpeed.y));
        }

        float targetDistance = position.distance(endPos);
        if (targetDistance < (highPrecision ? HIGH_QUALITY_TARGET_PRECISION : REGULAR_TARGET_PRECISION)) {
            if (slowDownTime <= 0) {
                result = calculateTrajectory(v0, v1, currentTime, currentAngle, acc, vMax, slowDownTime, fastEndSpeed, minTime);
            }
#ifdef ACTIVE_PATHFINDING_PARAMETER_OPTIMIZATION
            searchIterationCounter += i;
#endif
            return result;
        }

        // update time
        Vector currentCenterTimePos = useMinTimePosForCenterPos ? minPos : centerTimePos(v0, v1, currentTime + minTime, fastEndSpeed);
        float newDistance = endPos.distance(currentCenterTimePos);
        float targetCenterDistance = currentCenterTimePos.distance(position);
        float currentCenterDistanceDiff = targetCenterDistance - newDistance;
        if ((lastCenterDistanceDiff < 0) != (currentCenterDistanceDiff < 0)) {
            distanceFactor *= PARAMETER(AlphaTimeTrajectory, 0.7, 0.92f, 1);
        } else {
            distanceFactor *= PARAMETER(AlphaTimeTrajectory, 1, 1.1f, 1.3);
        }
        lastCenterDistanceDiff = currentCenterDistanceDiff;
        currentTime += currentCenterDistanceDiff * distanceFactor / std::max(PARAMETER(AlphaTimeTrajectory, 0.3, 0.82f, 1.5), assumedSpeed);

        // update angle
        float newAngle = (endPos - currentCenterTimePos).angle();
        float targetCenterAngle = (position - currentCenterTimePos).angle();
        float currentAngleDiff = angleDiff(targetCenterAngle, newAngle);
        if (i >= 1 && (currentAngleDiff < 0) != (lastAngleDiff < 0)) {
            angleFactor *= PARAMETER(AlphaTimeTrajectory, 0.5, 0.82f, 1.1);
        }
        lastAngleDiff = currentAngleDiff;
        currentAngle += currentAngleDiff * angleFactor;
    }
    result.valid = false;
#ifdef ACTIVE_PATHFINDING_PARAMETER_OPTIMIZATION
    searchIterationCounter += ITERATIONS;
#endif
    return result;
}

#ifdef ACTIVE_PATHFINDING_PARAMETER_OPTIMIZATION
int AlphaTimeTrajectory::searchIterationCounter = 0;
#endif
