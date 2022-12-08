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
    const float endSpeedX = std::max(std::min(startSpeed.x, std::max(endSpeed.x, 0.0f)), std::min(endSpeed.x, 0.0f));
    const float endSpeedY = std::max(std::min(startSpeed.y, std::max(endSpeed.y, 0.0f)), std::min(endSpeed.y, 0.0f));
    return Vector(endSpeedX, endSpeedY);
}

static float adjustAngle(Vector startSpeed, Vector endSpeed, float time, float angle, float acc, EndSpeed endSpeedType)
{
    if (endSpeedType == EndSpeed::FAST) {
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
    const Vector diff = endSpeed - startSpeed;
    const Vector absDiff(std::abs(diff.x), std::abs(diff.y));
    if (absDiff.x > time * acc || absDiff.y > time * acc) {
        // sometimes happens because of floating point inaccuracies
        return angle;
    }
    // offset to ensure that values directly on the border of an invalid segment are not treated as invalid later
    const float FLOATING_POINT_OFFSET = 0.0005f;
    const float gapSizeHalfX = std::asin(absDiff.x / (time * acc)) + FLOATING_POINT_OFFSET;
    // solution gaps are now [-fS, fS] and [pi - fS, pi + fS]
    const float gapSizeHalfY = std::asin(absDiff.y / (time * acc)) + FLOATING_POINT_OFFSET;

    const float circleCircumference = float(2 * M_PI) - gapSizeHalfX * 4 - gapSizeHalfY * 4;
    const float circumferenceFactor = circleCircumference / float(2 * M_PI);
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

float AlphaTimeTrajectory::minimumTime(Vector startSpeed, Vector endSpeed, float acc, EndSpeed endSpeedType)
{
    if (endSpeedType == EndSpeed::FAST) {
        endSpeed = minTimeEndSpeed(startSpeed, endSpeed);
    }
    const Vector diff = endSpeed - startSpeed;
    return diff.length() / acc;
}



AlphaTimeTrajectory::TrajectoryPosInfo2D AlphaTimeTrajectory::calculatePosition(const RobotState &start, Vector v1, float time, float angle,
                                                                                float acc, float vMax, EndSpeed endSpeedType)
{
    const Vector v0 = start.speed;
    angle = adjustAngle(v0, v1, time, angle, acc, endSpeedType);
    const float alphaX = std::sin(angle);
    const float alphaY = std::cos(angle);

    SpeedProfile1D::TrajectoryPosInfo1D xInfo, yInfo;
    if (endSpeedType == EndSpeed::FAST) {
        xInfo = SpeedProfile1D::calculateEndPos1DFastSpeed(v0.x, v1.x, time, alphaX > 0, acc * std::abs(alphaX), vMax * std::abs(alphaX));
        yInfo = SpeedProfile1D::calculateEndPos1DFastSpeed(v0.y, v1.y, time, alphaY > 0, acc * std::abs(alphaY), vMax * std::abs(alphaY));
    } else {
        const Vector diff = v1 - v0;
        const float restTimeX = (time - std::abs(diff.x) / (acc * std::abs(alphaX)));
        const float restTimeY = (time - std::abs(diff.y) / (acc * std::abs(alphaY)));

        xInfo = SpeedProfile1D::calculateEndPos1D(v0.x, v1.x, sign(alphaX) * restTimeX, acc * std::abs(alphaX), vMax * std::abs(alphaX));
        yInfo = SpeedProfile1D::calculateEndPos1D(v0.y, v1.y, sign(alphaY) * restTimeY, acc * std::abs(alphaY), vMax * std::abs(alphaY));
    }


    return {Vector(xInfo.endPos, yInfo.endPos) + start.pos, Vector(xInfo.increaseAtSpeed, yInfo.increaseAtSpeed)};
}

Trajectory AlphaTimeTrajectory::minTimeTrajectory(const RobotState &start, Vector v1, float slowDownTime, float minTime)
{
    const SpeedProfile1D x = SpeedProfile1D::createLinearSpeedSegment(start.speed.x, v1.x, minTime);
    const SpeedProfile1D y = SpeedProfile1D::createLinearSpeedSegment(start.speed.y, v1.y, minTime);
    return Trajectory{x, y, start.pos, slowDownTime};
}

Trajectory AlphaTimeTrajectory::calculateTrajectory(const RobotState &start, Vector v1, float time, float angle, float acc, float vMax,
                                                      float slowDownTime, EndSpeed endSpeedType, float minTime)
{
    const Vector v0 = start.speed;

    // note that this also checks for very small differences that just square to zero
    if ((v1 - v0).lengthSquared() == 0 && time < 0.0001f) {
        const float EPSILON = 0.00001f;
        const SpeedProfile1D x = SpeedProfile1D::createLinearSpeedSegment(v0.x, v0.x, EPSILON);
        const SpeedProfile1D y = SpeedProfile1D::createLinearSpeedSegment(v0.y, v0.y, EPSILON);
        return Trajectory{x, y, start.pos, slowDownTime};
    }

    if (minTime < 0) {
        minTime = minimumTime(v0, v1, acc, endSpeedType);
    }

    if (time < 0.0005f) {
        return minTimeTrajectory(start, v1, slowDownTime, minTime);
    }

    time += minTime;

    angle = adjustAngle(v0, v1, time, angle, acc, endSpeedType);
    const float alphaX = std::sin(angle);
    const float alphaY = std::cos(angle);


    SpeedProfile1D x, y;
    if (endSpeedType == EndSpeed::FAST) {
        x = SpeedProfile1D::calculate1DTrajectoryFastEndSpeed(v0.x, v1.x, time, alphaX > 0, acc * std::abs(alphaX), vMax * std::abs(alphaX));
        y = SpeedProfile1D::calculate1DTrajectoryFastEndSpeed(v0.y, v1.y, time, alphaY > 0, acc * std::abs(alphaY), vMax * std::abs(alphaY));
    } else {
        const Vector diff = v1 - v0;
        const float restTimeX = (time - std::abs(diff.x) / (acc * std::abs(alphaX)));
        const float restTimeY = (time - std::abs(diff.y) / (acc * std::abs(alphaY)));

        x = SpeedProfile1D::calculate1DTrajectory(v0.x, v1.x, restTimeX, alphaX > 0, acc * std::abs(alphaX), vMax * std::abs(alphaX));
        y = SpeedProfile1D::calculate1DTrajectory(v0.y, v1.y, restTimeY, alphaY > 0, acc * std::abs(alphaY), vMax * std::abs(alphaY));
    }

    x.integrateTime();
    y.integrateTime();

    return Trajectory{x, y, start.pos, slowDownTime};
}

// functions for position search
static Vector centerTimePos(const RobotState &start, Vector endSpeed, float time, EndSpeed endSpeedType)
{
    if (endSpeedType == EndSpeed::FAST) {
        endSpeed = minTimeEndSpeed(start.speed, endSpeed);
    }
    return start.pos + (start.speed + endSpeed) * (0.5f * time);
}

Vector AlphaTimeTrajectory::minTimePos(const RobotState &start, Vector v1, float acc, float slowDownTime)
{
    const float minTime = minimumTime(start.speed, v1, acc, EndSpeed::EXACT);
    if (slowDownTime == 0.0f) {
        return (start.speed + v1) * (minTime * 0.5f);
    } else {
        // assumes that slowDownTime can only be given with v1 = (0, 0)
        // construct speed profile for slowing down to zero
        const auto minTrajectory = minTimeTrajectory(start, v1, slowDownTime, minTime);
        return minTrajectory.endPosition();
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

std::optional<Trajectory> AlphaTimeTrajectory::tryDirectBrake(const RobotState &start, const RobotState &target, float acc, float slowDownTime)
{
    const float MAX_ACCELERATION_FACTOR = 1.2f;

    const Vector targetOffset = target.pos - start.pos;

    const Vector v0 = start.speed;
    const Vector necessaryAcc = necessaryAcceleration(v0, targetOffset);
    const float accLength = necessaryAcc.length();
    const Vector times(std::abs(v0.x) / necessaryAcc.x, std::abs(v0.y) / necessaryAcc.y);
    const float timeDiff = std::abs(times.x - times.y);
    const bool directionMatches = std::signbit(v0.x) == std::signbit(targetOffset.x) && std::signbit(v0.y) == std::signbit(targetOffset.y);
    if (directionMatches && accLength > acc && accLength < acc * MAX_ACCELERATION_FACTOR && slowDownTime == 0.0f) {

        SpeedProfile1D x = SpeedProfile1D::createLinearSpeedSegment(v0.x, 0, std::abs(v0.x / necessaryAcc.x));
        SpeedProfile1D y = SpeedProfile1D::createLinearSpeedSegment(v0.y, 0, std::abs(v0.y / necessaryAcc.y));

        if (timeDiff < 0.1f) {
            return Trajectory{x, y, start.pos, slowDownTime};
        } else {
            if (times.x > times.y) {
                x = SpeedProfile1D::create1DAccelerationByDistance(v0.x, 0, times.y, targetOffset.x);
                x.integrateTime();
            } else {
                y = SpeedProfile1D::create1DAccelerationByDistance(v0.y, 0, times.x, targetOffset.y);
                y.integrateTime();
            }
            const float accX = x.initialAcceleration();
            const float accY = y.initialAcceleration();
            const float totalAcc = std::sqrt(accX * accX + accY * accY);
            const Trajectory converted{x, y, start.pos, slowDownTime};
            if (totalAcc < acc * MAX_ACCELERATION_FACTOR && converted.endPosition().distanceSq(target.pos) < 0.01f * 0.01f) {
                return converted;
            }
        }
    }
    return {};
}

std::optional<Trajectory> AlphaTimeTrajectory::findTrajectory(const RobotState &start, const RobotState &target, float acc, float vMax,
                                                                float slowDownTime, EndSpeed endSpeedType)
{
    const float HIGH_PRECISION_DISTANCE_THRESHOLD = 0.1f;
    const float HIGH_PRECISION_SPEED_THRESHOLD = 0.2f;
    const bool highPrecision = (start.pos.distanceSq(target.pos) < HIGH_PRECISION_DISTANCE_THRESHOLD * HIGH_PRECISION_DISTANCE_THRESHOLD)
        && target.speed == Vector(0, 0)
        && start.speed.lengthSquared() < HIGH_PRECISION_SPEED_THRESHOLD * HIGH_PRECISION_SPEED_THRESHOLD;

    if (target.speed == Vector(0, 0)) {
        endSpeedType = EndSpeed::EXACT; // using fast end speed is more computationally intensive

        const auto directBrake = tryDirectBrake(start, target, acc, slowDownTime);
        if (directBrake) {
            return directBrake;
        }
    }

    // TODO: custom minTimePos for fast endspeed mode
    const Vector minPos = minTimePos(start, target.speed, acc, slowDownTime);
    const float minTimeDistance = target.pos.distance(minPos);

    const bool useMinTimePosForCenterPos = minTimeDistance < PARAMETER(AlphaTimeTrajectory, 0, 0.007f, 0.05);

    // estimate rough time from distance
    // TODO: improve this estimate?
    float estimatedTime = minTimeDistance / acc;

    const Vector estimateCenterPos = centerTimePos(start, target.speed, estimatedTime, endSpeedType);

    float estimatedAngle = normalizeAnglePositive((target.pos - estimateCenterPos).angle());
    if (std::isnan(estimatedAngle)) {
        // 0 might be floating point instable, dont use that
        estimatedAngle = 0.05f;
    }

    // calculate better estimate for the time
    estimatedTime = std::max(estimatedTime, 0.001f);

    // cached for usage in calculateTrajectory
    const float minTime = minimumTime(start.speed, target.speed, acc, endSpeedType);

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
        Trajectory result;
        if (slowDownTime > 0) {
            result = calculateTrajectory(start, target.speed, currentTime, currentAngle, acc, vMax, slowDownTime, endSpeedType, minTime);
            endPos = result.endPosition();
            const Vector continuationSpeed = result.continuationSpeed();
            assumedSpeed = std::max(std::abs(continuationSpeed.x), std::abs(continuationSpeed.y));
        } else {
            const auto trajectoryInfo = calculatePosition(start, target.speed, currentTime + minTime, currentAngle, acc, vMax, endSpeedType);
            endPos = trajectoryInfo.endPos;
            assumedSpeed = std::max(std::abs(trajectoryInfo.increaseAtSpeed.x), std::abs(trajectoryInfo.increaseAtSpeed.y));
        }

        const float targetDistance = target.pos.distance(endPos);
        if (targetDistance < (highPrecision ? HIGH_QUALITY_TARGET_PRECISION : REGULAR_TARGET_PRECISION)) {
            if (slowDownTime <= 0) {
                result = calculateTrajectory(start, target.speed, currentTime, currentAngle, acc, vMax, slowDownTime, endSpeedType, minTime);
            }
#ifdef ACTIVE_PATHFINDING_PARAMETER_OPTIMIZATION
            searchIterationCounter += i;
#endif
            result.setCorrectionOffset(target.pos - endPos);
            return result;
        }

        // update time
        const Vector centerPos = centerTimePos(start, target.speed, currentTime + minTime, endSpeedType);
        const Vector currentCenterTimePos = useMinTimePosForCenterPos ? minPos : centerPos;
        const float newDistance = endPos.distance(currentCenterTimePos);
        const float targetCenterDistance = currentCenterTimePos.distance(target.pos);
        const float currentCenterDistanceDiff = targetCenterDistance - newDistance;
        if ((lastCenterDistanceDiff < 0) != (currentCenterDistanceDiff < 0)) {
            distanceFactor *= PARAMETER(AlphaTimeTrajectory, 0.7, 0.92f, 1);
        } else {
            distanceFactor *= PARAMETER(AlphaTimeTrajectory, 1, 1.1f, 1.3);
        }
        lastCenterDistanceDiff = currentCenterDistanceDiff;
        currentTime += currentCenterDistanceDiff * distanceFactor / std::max(PARAMETER(AlphaTimeTrajectory, 0.3, 0.82f, 1.5), assumedSpeed);

        // update angle
        const float newAngle = (endPos - currentCenterTimePos).angle();
        const float targetCenterAngle = (target.pos - currentCenterTimePos).angle();
        const float currentAngleDiff = angleDiff(targetCenterAngle, newAngle);
        if (i >= 1 && (currentAngleDiff < 0) != (lastAngleDiff < 0)) {
            angleFactor *= PARAMETER(AlphaTimeTrajectory, 0.5, 0.82f, 1.1);
        }
        lastAngleDiff = currentAngleDiff;
        currentAngle += currentAngleDiff * angleFactor;
    }
#ifdef ACTIVE_PATHFINDING_PARAMETER_OPTIMIZATION
    searchIterationCounter += ITERATIONS;
#endif
    return {};
}

#ifdef ACTIVE_PATHFINDING_PARAMETER_OPTIMIZATION
int AlphaTimeTrajectory::searchIterationCounter = 0;
#endif
