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
        float timeDiff = std::abs(std::abs(v0.x) / necessaryAcc.x - std::abs(v0.y) / necessaryAcc.y);
        if (accLength > acc && accLength < acc * MAX_ACCELERATION_FACTOR && timeDiff < 0.1f) {
            result.valid = true;
            result.slowDownTime = 0;
            result.xProfile.counter = 2;
            result.xProfile.profile[0] = {v0.x, 0};
            result.xProfile.profile[1] = {0, std::abs(v0.x / necessaryAcc.x)};
            result.yProfile.counter = 2;
            result.yProfile.profile[0] = {v0.y, 0};
            result.yProfile.profile[1] = {0, std::abs(v0.y / necessaryAcc.y)};
            return result;
        }
    }

    // TODO: custom minTimePos for fast endspeed mode
    Vector minPos = minTimePos(v0, v1, acc, slowDownTime);
    float minTimeDistance = position.distance(minPos);

    const bool useMinTimePosForCenterPos = minTimeDistance < 0.1f;

    // estimate rough time from distance
    // TODO: improve this estimate?
    float estimatedTime = minTimeDistance / acc;

    Vector estimateCenterPos = centerTimePos(v0, v1, estimatedTime, fastEndSpeed);

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

    // cached for usage in calculateTrajectory
    float minTime = minimumTime(v0, v1, acc, fastEndSpeed);

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
            return result;
        }

        Vector currentCenterTimePos = useMinTimePosForCenterPos ? minPos : centerTimePos(v0, v1, currentTime + minTime, fastEndSpeed);
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
