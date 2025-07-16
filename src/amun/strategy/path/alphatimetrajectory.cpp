/***************************************************************************
 *   Copyright 2019 Andreas Wendler, Christoph Schmidtmeier                *
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
#include <cassert>

#ifndef FIRMWARE
#include <QDebug>
#endif // !FIRMWARE

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

static std::optional<std::tuple<float, float, float>> getAngleAdjustmentValues(Vector startSpeed, Vector endSpeed, float time, float acc, EndSpeed endSpeedType)
{
    if (endSpeedType == EndSpeed::FAST) {
        endSpeed = minTimeEndSpeed(startSpeed, endSpeed);
    }

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
        // TODO I think these assert are reasonable, but the fail constantly
        //assert(absDiff.x - time * acc < 0.01);
        //assert(absDiff.y - time * acc < 0.01);

        // sometimes happens because of floating point inaccuracies
        return {};
    }
    // offset to ensure that values directly on the border of an invalid segment are not treated as invalid later
    const float FLOATING_POINT_OFFSET = 0.0005f;
    const float gapSizeHalfX = std::asin(absDiff.x / (time * acc)) + FLOATING_POINT_OFFSET;
    // solution gaps are now [-fS, fS] and [pi - fS, pi + fS]
    const float gapSizeHalfY = std::asin(absDiff.y / (time * acc)) + FLOATING_POINT_OFFSET;

    const float circleCircumference = float(2 * M_PI) - gapSizeHalfX * 4 - gapSizeHalfY * 4;
    if (circleCircumference < 0) {
        // TODO how does this happen?
        return {};
    }

    const float circumferenceFactor = circleCircumference / float(2 * M_PI);

    return std::make_tuple(gapSizeHalfX, gapSizeHalfY, circumferenceFactor);
}

// the inverse of adjustAngle, i.e.
//     adjusted = adjustAngle(..., angle, ...)
//     unadjusted = unadjustAngle(..., adjusted, ...)
//     assert unadjusted == angle
std::optional<float> unadjustAngle(Vector startSpeed, Vector endSpeed, float time, float angle, float acc, EndSpeed endSpeedType)
{
    const std::optional<std::tuple<float, float, float>> angleAdjustmentValues = getAngleAdjustmentValues(startSpeed, endSpeed, time, acc, endSpeedType);
    if (!angleAdjustmentValues.has_value()) {
        return angle;
    }

    const float gapSizeHalfX = std::get<0>(angleAdjustmentValues.value());
    const float gapSizeHalfY = std::get<1>(angleAdjustmentValues.value());
    const float circumferenceFactor = std::get<2>(angleAdjustmentValues.value());

    // the following intervals are invalid for angle:
    //   - [0, gapSizeHalfX]
    //   - [pi/2 - gapSizeHalfY, pi/2 + gapSizeHalfY]
    //   - [pi - gapSizeHalfX, pi + gapSizeHalfX]
    //   - [3pi/2 - gapSizeHalfY, 3pi/2 + gapSizeHalfY]
    //   - [2pi - gapSizeHalfX, 2pi]
    angle = normalizeAnglePositive(angle);
    if ((0 <= angle && angle < gapSizeHalfX)
            || (0.5f * M_PI - gapSizeHalfY <= angle && angle < 0.5f * M_PI + gapSizeHalfY)
            || (1.0f * M_PI - gapSizeHalfX <= angle && angle < 1.0f * M_PI + gapSizeHalfX)
            || (1.5f * M_PI - gapSizeHalfY <= angle && angle < 1.5f * M_PI + gapSizeHalfY)
            || (2.0f * M_PI - gapSizeHalfX <= angle && angle < 2.0f * M_PI)) {
        return {};
    }

    if (angle > float(M_PI * 1.5) + gapSizeHalfY) {
        angle -= gapSizeHalfY * 2.0f;
    }
    if (angle > float(M_PI) + gapSizeHalfX) {
        angle -= gapSizeHalfX * 2.0f;
    }
    if (angle > float(M_PI / 2) + gapSizeHalfY) {
        angle -= gapSizeHalfY * 2.0f;
    }
    angle -= gapSizeHalfX;
    angle /= circumferenceFactor;
    return angle;
}

float adjustAngle(Vector startSpeed, Vector endSpeed, float time, float angle, float acc, EndSpeed endSpeedType)
{
    const std::optional<std::tuple<float, float, float>> angleAdjustmentValues = getAngleAdjustmentValues(startSpeed, endSpeed, time, acc, endSpeedType);
    if (!angleAdjustmentValues.has_value()) {
        return angle;
    }

    const float gapSizeHalfX = std::get<0>(angleAdjustmentValues.value());
    const float gapSizeHalfY = std::get<1>(angleAdjustmentValues.value());
    const float circumferenceFactor = std::get<2>(angleAdjustmentValues.value());

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

float AlphaTimeTrajectory::minimumTime(Vector startSpeed, Vector endSpeed, float acc, EndSpeed endSpeedType)
{
    if (endSpeedType == EndSpeed::FAST) {
        endSpeed = minTimeEndSpeed(startSpeed, endSpeed);
    }
    const Vector diff = endSpeed - startSpeed;
    return diff.length() / acc;
}



AlphaTimeTrajectory::TrajectoryPosInfo AlphaTimeTrajectory::calculatePosInfo() const {
    const Vector v0 = start.speed;
    const float totalTime = minTime + time;

    if (time < 0.0005f) {
        return {start.pos + (v0 + v1) * 0.5f * minTime, v1};
    }

    const float adjustedAngle = adjustAngle(v0, v1, totalTime, angle, acc, endSpeedType);
    const float alphaX = std::sin(adjustedAngle);
    const float alphaY = std::cos(adjustedAngle);

    Trajectory1D::TrajectoryPosInfo1D xInfo, yInfo;
    if (endSpeedType == EndSpeed::FAST) {
        xInfo = Trajectory1D::calculateEndPos1DFastSpeed(v0.x, v1.x, totalTime, alphaX > 0, acc * std::abs(alphaX), vMax * std::abs(alphaX));
        yInfo = Trajectory1D::calculateEndPos1DFastSpeed(v0.y, v1.y, totalTime, alphaY > 0, acc * std::abs(alphaY), vMax * std::abs(alphaY));
    } else {
        const Vector diff = v1 - v0;
        const float restTimeX = totalTime - std::abs(diff.x) / (acc * std::abs(alphaX));
        const float restTimeY = totalTime - std::abs(diff.y) / (acc * std::abs(alphaY));

        xInfo = Trajectory1D::calculateEndPos1D(v0.x, v1.x, sign(alphaX) * restTimeX, acc * std::abs(alphaX), vMax * std::abs(alphaX));
        yInfo = Trajectory1D::calculateEndPos1D(v0.y, v1.y, sign(alphaY) * restTimeY, acc * std::abs(alphaY), vMax * std::abs(alphaY));
    }


    return {Vector(xInfo.endPos, yInfo.endPos) + start.pos, Vector(xInfo.increaseAtSpeed, yInfo.increaseAtSpeed)};
}

// this function assumes that, if endSpeedType is FAST, v1 has been adjusted with minTimeEndSpeed
Trajectory AlphaTimeTrajectory::minTimeTrajectory(const RobotState &start, Vector v1, float slowDownTime, float minTime)
{
    const Trajectory1D x = Trajectory1D::createLinearSpeedSegment(start.speed.x, v1.x, minTime);
    const Trajectory1D y = Trajectory1D::createLinearSpeedSegment(start.speed.y, v1.y, minTime);
    return Trajectory{x, y, start.pos, slowDownTime};
}

Trajectory AlphaTimeTrajectory::calculateTrajectory() const {
    const Vector v0 = start.speed;

    // note that this also checks for very small differences that just square to zero
    if ((v1 - v0).lengthSquared() == 0 && time < 0.0001f) {
        const float EPSILON = 0.00001f;
        const Trajectory1D x = Trajectory1D::createLinearSpeedSegment(v0.x, v0.x, EPSILON);
        const Trajectory1D y = Trajectory1D::createLinearSpeedSegment(v0.y, v0.y, EPSILON);
        return Trajectory{x, y, start.pos, slowDownTime};
    }

    const float totalTime = minTime + time;
    if (time < 0.0005f) {
        return minTimeTrajectory(start, (endSpeedType == EndSpeed::FAST) ? minTimeEndSpeed(v0, v1) : v1, slowDownTime, totalTime);
    }

    const float adjustedAngle = adjustAngle(v0, v1, totalTime, angle, acc, endSpeedType);
    const float alphaX = std::sin(adjustedAngle);
    const float alphaY = std::cos(adjustedAngle);

    Trajectory1D x, y;
    if (endSpeedType == EndSpeed::FAST) {
        x = Trajectory1D::calculate1DTrajectoryFastEndSpeed(v0.x, v1.x, totalTime, alphaX > 0, acc * std::abs(alphaX), vMax * std::abs(alphaX));
        y = Trajectory1D::calculate1DTrajectoryFastEndSpeed(v0.y, v1.y, totalTime, alphaY > 0, acc * std::abs(alphaY), vMax * std::abs(alphaY));
    } else {
        const Vector diff = v1 - v0;
        const float restTimeX = totalTime - std::abs(diff.x) / (acc * std::abs(alphaX));
        const float restTimeY = totalTime - std::abs(diff.y) / (acc * std::abs(alphaY));

        x = Trajectory1D::calculate1DTrajectory(v0.x, v1.x, restTimeX, alphaX > 0, acc * std::abs(alphaX), vMax * std::abs(alphaX));
        y = Trajectory1D::calculate1DTrajectory(v0.y, v1.y, restTimeY, alphaY > 0, acc * std::abs(alphaY), vMax * std::abs(alphaY));
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
        return start.pos + (start.speed + v1) * (minTime * 0.5f);
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
    if (slowDownTime != 0.0f) {
        return {};
    }

    const float MAX_ACCELERATION_FACTOR = 1.2f;

    const Vector targetOffset = target.pos - start.pos;
    const Vector v0 = start.speed;
    const bool directionMatches = std::signbit(v0.x) == std::signbit(targetOffset.x) && std::signbit(v0.y) == std::signbit(targetOffset.y);
    if (!directionMatches) {
        return {};
    }

    const Vector necessaryAcc = necessaryAcceleration(v0, targetOffset);
    const float accLength = necessaryAcc.length();
    if (acc >= accLength || accLength >= acc * MAX_ACCELERATION_FACTOR) {
        return {};
    }

    const Vector times(std::abs(v0.x) / necessaryAcc.x, std::abs(v0.y) / necessaryAcc.y);
    const float timeDiff = std::abs(times.x - times.y);

    Trajectory1D x = Trajectory1D::createLinearSpeedSegment(v0.x, 0, std::abs(v0.x / necessaryAcc.x));
    Trajectory1D y = Trajectory1D::createLinearSpeedSegment(v0.y, 0, std::abs(v0.y / necessaryAcc.y));
    if (timeDiff < 0.1f) {
        return Trajectory{x, y, start.pos, slowDownTime};
    }

    if (times.x > times.y) {
        x = Trajectory1D::create1DAccelerationByDistance(v0.x, 0, times.y, targetOffset.x);
        x.integrateTime();
    } else {
        y = Trajectory1D::create1DAccelerationByDistance(v0.y, 0, times.x, targetOffset.y);
        y.integrateTime();
    }
    const float accX = x.initialAcceleration();
    const float accY = y.initialAcceleration();
    const float totalAcc = std::sqrt(accX * accX + accY * accY);
    const Trajectory converted{x, y, start.pos, slowDownTime};
    if (totalAcc < acc * MAX_ACCELERATION_FACTOR && converted.endPosition().distanceSq(target.pos) < 0.01f * 0.01f) {
        return converted;
    }
    return {};
}

std::optional<AlphaTimeTrajectory> AlphaTimeTrajectory::find(const RobotState &start, const RobotState &target, float acc, float vMax, float slowDownTime, EndSpeed endSpeedType)
{
    const float HIGH_PRECISION_DISTANCE_THRESHOLD = 0.1f;
    const float HIGH_PRECISION_SPEED_THRESHOLD = 0.2f;
    const float MAX_ALLOWED_TIME = 20.0f;

    const bool highPrecision = (start.pos.distanceSq(target.pos) < HIGH_PRECISION_DISTANCE_THRESHOLD * HIGH_PRECISION_DISTANCE_THRESHOLD)
        && target.speed == Vector(0, 0)
        && start.speed.lengthSquared() < HIGH_PRECISION_SPEED_THRESHOLD * HIGH_PRECISION_SPEED_THRESHOLD;

    bool wouldBeDirectBrake = false;
    if (target.speed == Vector(0, 0)) {
        endSpeedType = EndSpeed::EXACT; // using fast end speed is more computationally intensive

        const auto directBrake = tryDirectBrake(start, target, acc, slowDownTime);
        if (directBrake) {
            // TODO
            //return directBrake;
            wouldBeDirectBrake = true;
        }
    }

    // TODO: custom minTimePos for fast endspeed mode
    const Vector minPos = minTimePos(start, target.speed, acc, slowDownTime);
    const float minTimeDistance = target.pos.distance(minPos);

    const bool useMinTimePosForCenterPos = minTimeDistance < PARAMETER(AlphaTimeTrajectory, 0, 0.0025f, 0.05);

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

    AlphaTimeTrajectory traj{start, target.speed, estimatedTime, estimatedAngle, acc, vMax, slowDownTime, endSpeedType};

    float distanceFactor = PARAMETER(AlphaTimeTrajectory, 0.3, 0.8f, 1.5);
    float lastCenterDistanceDiff = 0;

    float angleFactor = PARAMETER(AlphaTimeTrajectory, 0.7, 1.07f, 1.5);
    float lastAngleDiff = 0;

    const int ITERATIONS = highPrecision ? HIGH_PRECISION_ITERATIONS : MAX_SEARCH_ITERATIONS;
    for (int i = 0;i<ITERATIONS;i++) {
        Vector endPos;
        float assumedSpeed;
        Trajectory result;
        if (slowDownTime > 0) {
            result = traj.getTrajectory();
            endPos = result.endPosition();
            const Vector continuationSpeed = result.continuationSpeed();
            assumedSpeed = std::max(std::abs(continuationSpeed.x), std::abs(continuationSpeed.y));
        } else {
            //const auto trajectoryInfo = calculatePosition(start, target.speed, traj.time, traj.angle, acc, vMax, endSpeedType, minTime);
            const auto trajectoryInfo = traj.calculatePosInfo();
            endPos = trajectoryInfo.endPos;
            assumedSpeed = std::max(std::abs(trajectoryInfo.increaseAtSpeed.x), std::abs(trajectoryInfo.increaseAtSpeed.y));
        }

        const float targetDistance = target.pos.distance(endPos);
        if (targetDistance < (highPrecision ? HIGH_QUALITY_TARGET_PRECISION : REGULAR_TARGET_PRECISION)) {
            if (slowDownTime <= 0) {
                result = traj.getTrajectory();
            }
#ifdef ACTIVE_PATHFINDING_PARAMETER_OPTIMIZATION
            searchIterationCounter += i;
#endif
            traj.setCorrectionOffset(target.pos - endPos);
            if (wouldBeDirectBrake) {
                //std::cout << "wouldBeDirectBrake, and succeeded" << std::endl;
            }
            return traj;
        }

        // update time
        const Vector centerPos = centerTimePos(start, target.speed, traj.time + traj.minTime, endSpeedType);
        // use minPos if the time is small enough to avoid a situation similar to gimbal locking
        // since the angle has little to no effect with a very small time and the time may be further
        // decreased if centerPos is used
        const float forceMinPos = traj.time < PARAMETER(AlphaTimeTrajectory, 0.0, 0.007f, 0.5);
        const bool useMinPos = useMinTimePosForCenterPos || forceMinPos;
        const Vector currentCenterTimePos = useMinPos ? minPos : centerPos;
        const float newDistance = endPos.distance(currentCenterTimePos);
        const float targetCenterDistance = currentCenterTimePos.distance(target.pos);
        const float currentCenterDistanceDiff = targetCenterDistance - newDistance;
        if ((lastCenterDistanceDiff < 0) != (currentCenterDistanceDiff < 0)) {
            distanceFactor *= PARAMETER(AlphaTimeTrajectory, 0.7, 0.92f, 1);
        } else {
            distanceFactor *= PARAMETER(AlphaTimeTrajectory, 1, 1.1f, 1.3);
        }
        lastCenterDistanceDiff = currentCenterDistanceDiff;
        const float trajTime = traj.time + currentCenterDistanceDiff * distanceFactor / std::max(PARAMETER(AlphaTimeTrajectory, 0.3, 0.82f, 1.5), assumedSpeed);
        traj.time = std::max(std::min(MAX_ALLOWED_TIME, trajTime), 0.0f);
        traj.trajectory.reset();

        // update angle
        const float newAngle = (endPos - currentCenterTimePos).angle();
        const float targetCenterAngle = (target.pos - currentCenterTimePos).angle();
        const float currentAngleDiff = angleDiff(targetCenterAngle, newAngle);
        if (i >= 1 && (currentAngleDiff < 0) != (lastAngleDiff < 0)) {
            angleFactor *= PARAMETER(AlphaTimeTrajectory, 0.5, 0.82f, 1.1);
        }
        lastAngleDiff = currentAngleDiff;
        traj.angle += currentAngleDiff * angleFactor;
        traj.trajectory.reset();
    }
#ifdef ACTIVE_PATHFINDING_PARAMETER_OPTIMIZATION
    searchIterationCounter += ITERATIONS;
#endif
    if (wouldBeDirectBrake) {
        std::cout << "wouldBeDirectBrake, but failed" << std::endl;
    }
    return {};
}

#ifdef ACTIVE_PATHFINDING_PARAMETER_OPTIMIZATION
int AlphaTimeTrajectory::searchIterationCounter = 0;
#endif
