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

#include "gtest/gtest.h"
#include <iostream>
#include "path/alphatimetrajectory.h"
#include "core/rng.h"

// tests both SpeedProfile and AlphaTimeTrajectory

static Vector makePos(RNG &rng, float fieldSizeHalf) {
    return rng.uniformVectorIn(Vector(-fieldSizeHalf, -fieldSizeHalf), Vector(fieldSizeHalf, fieldSizeHalf));
}

static Vector makeSpeed(RNG &rng, float maxSpeed) {
    Vector v = rng.uniformVector() * maxSpeed - rng.uniformVector() * maxSpeed;
    while (v.length() >= maxSpeed) {
        v = rng.uniformVector() * maxSpeed - rng.uniformVector() * maxSpeed;
    }
    return v;
}

static void ASSERT_VECTOR_EQ(Vector v1, Vector v2) {
    ASSERT_LE(std::abs(v1.x - v2.x), 0.0001f);
    ASSERT_LE(std::abs(v1.y - v2.y), 0.0001f);
}

// checks without fast endspeed and without slowdown
// v0 and v1 must be slower than maxSpeed
static void checkTrajectorySimple(const Trajectory &trajectory, Vector v0, Vector v1, float acc, EndSpeed endSpeedType) {

    // check start speed
    ASSERT_VECTOR_EQ(trajectory.stateAtTime(0).speed, v0);

    // check end speed
    if (endSpeedType == EndSpeed::EXACT) {
        ASSERT_VECTOR_EQ(trajectory.stateAtTime(trajectory.time()).speed, v1);
        ASSERT_VECTOR_EQ(trajectory.endSpeed(), v1);
    } else {
        ASSERT_LE(trajectory.endSpeed().length(), v1.length());
    }

    // TODO: test that end pos calculation matches

    const int SEGMENTS = 100;
    const float timeDiff = trajectory.time() / float(SEGMENTS - 1);
    const auto bulkPositions = trajectory.trajectoryPositions(SEGMENTS, timeDiff, 0.0f);

    // TODO: test t0
    Trajectory::Iterator it{trajectory, 0};

    Vector lastPos = trajectory.stateAtTime(0).pos;
    Vector lastSpeed = trajectory.stateAtTime(0).speed;
    for (int i = 0;i<SEGMENTS;i++) {
        const float time = i * timeDiff;
        const auto state = trajectory.stateAtTime(time);
        const Vector speed = state.speed;

        ASSERT_LE((bulkPositions[i].state.pos).distance(state.pos), 0.01);
        ASSERT_LE((bulkPositions[i].state.speed).distance(state.speed), 0.01);
        ASSERT_LE(bulkPositions[i].time - time, 0.0001f);

        const auto itState = it.next(timeDiff);
        ASSERT_LE((itState.state.pos).distance(state.pos), 0.01);
        ASSERT_LE((itState.state.speed).distance(state.speed), 0.01);
        ASSERT_LE(itState.time - time, 0.0001f);

        // check acceleration limit
        const float diff = speed.distance(lastSpeed) / timeDiff;
        ASSERT_LE(diff, acc * 1.01f); // something extra for floating point


        // check if position is continuous
        const float posDiff = lastPos.distance(state.pos);
        if (posDiff > 0.001f) {
            ASSERT_LE(posDiff / timeDiff, std::max(lastSpeed.length(), speed.length()) * 1.2f);
        }

        lastSpeed = speed;
        lastPos = state.pos;
    }
}

static void checkMaxSpeed(const Trajectory &trajectory, float maxSpeed) {

    const float MAX_FASTER_FACTOR = std::sqrt(2);

    const int SEGMENTS = 100;
    for (int i = 0;i<SEGMENTS;i++) {
        const float time = i * trajectory.time() / float(SEGMENTS - 1);
        const Vector speed = trajectory.stateAtTime(time).speed;

        ASSERT_LE(speed.length(), maxSpeed * MAX_FASTER_FACTOR);
    }
}

static void checkBoundingBox(const Trajectory &trajectory) {
    const auto manyPositions = trajectory.trajectoryPositions(1000, trajectory.time() / 999, 0.0f);
    BoundingBox fromPoints(manyPositions[0].state.pos, manyPositions[0].state.pos);
    for (const auto &p : manyPositions) {
        fromPoints.mergePoint(p.state.pos);
    }

    const BoundingBox direct = trajectory.calculateBoundingBox();
    ASSERT_LE(std::abs(fromPoints.left - direct.left), 0.01f);
    ASSERT_LE(std::abs(fromPoints.right - direct.right), 0.01f);
    ASSERT_LE(std::abs(fromPoints.top - direct.top), 0.01f);
    ASSERT_LE(std::abs(fromPoints.bottom - direct.bottom), 0.01f);
}

static void checkEndPosition(const Trajectory &trajectory, const Vector expected) {
    const float time = trajectory.time();
    {
        const Vector endPos = trajectory.endPosition();
        ASSERT_VECTOR_EQ(endPos, expected);
    }
    {
        const Vector endPos = trajectory.stateAtTime(time).pos;
        ASSERT_VECTOR_EQ(endPos, expected);
    }
    {
        const Vector endPos = trajectory.stateAtTime(time + 1.0f).pos;
        ASSERT_VECTOR_EQ(endPos, expected);
    }
    {
        const int steps = 20;
        const int extraSteps = 10;
        const int totalSteps = steps + extraSteps;
        const float timeStep = time / (float)(steps - 1);
        const auto states = trajectory.trajectoryPositions(totalSteps, timeStep, 0.0f);
        for (int i = steps; i < totalSteps; i++) {
            ASSERT_VECTOR_EQ(states[i].state.pos, expected);
        }
    }

    const float offset = 1e-6;
    const auto closeToEnd = trajectory.stateAtTime(time - offset);
    ASSERT_VECTOR_EQ(closeToEnd.pos, expected - closeToEnd.speed * offset);
}

static void checkLimitToTime(const Trajectory &profile, RNG &rng) {
    const float timeLimit = rng.uniformFloat(profile.time() * 0.1f, profile.time());
    Trajectory limited = profile;
    limited.limitToTime(timeLimit);
    ASSERT_FLOAT_EQ(limited.time(), timeLimit);
    for (int i = 0;i<100;i++) {
        const float t = i * timeLimit / 99.0f;
        const auto sp1 = profile.stateAtTime(t);
        const auto sp2 = limited.stateAtTime(t);

        ASSERT_VECTOR_EQ(sp1.pos, sp2.pos);
        ASSERT_VECTOR_EQ(sp1.speed, sp2.speed);
    }
}

static void checkDistanceIncrease(const Vector v0, const float time, const float maxSpeed, const float acc, const float angle) {

    // more time must result in more distance traveled
    const Trajectory p1 = AlphaTimeTrajectory::calculateTrajectory(RobotState(Vector(0, 0), v0), Vector(0, 0), time, angle, acc, maxSpeed, 0, EndSpeed::EXACT);
    const Trajectory p2 = AlphaTimeTrajectory::calculateTrajectory(RobotState(Vector(0, 0), v0), Vector(0, 0), time + 0.1, angle, acc, maxSpeed, 0, EndSpeed::EXACT);
    const Trajectory p3 = AlphaTimeTrajectory::calculateTrajectory(RobotState(Vector(0, 0), v0), Vector(0, 0), time + 0.2, angle, acc, maxSpeed, 0, EndSpeed::EXACT);

    ASSERT_LT((p2.endPosition() - p1.endPosition()).length(), (p3.endPosition() - p1.endPosition()).length());
}

static void checkBasic(RNG &rng, const Trajectory &profile, const Vector v0, const Vector v1, const float maxSpeed, const float acc, const float slowDownTime, const EndSpeed endSpeedType) {
    checkTrajectorySimple(profile, v0, v1, acc, endSpeedType);
    checkBoundingBox(profile);
    checkMaxSpeed(profile, maxSpeed);
    if (slowDownTime == 0) {
        checkLimitToTime(profile, rng);
    }
}

TEST(AlphaTimeTrajectory, calculateTrajectory) {
    RNG rng(1);

    for (int i = 0;i<10000;i++) {

        const float maxSpeed = rng.uniformFloat(0.3, 5);

        const Vector v0 = makeSpeed(rng, maxSpeed);
        const Vector v1 = rng.uniform() > 0.9 ? Vector(0, 0) : makeSpeed(rng, maxSpeed);
        const float time = rng.uniformFloat(0.005, 5);
        const float angle = rng.uniformFloat(0, 2 * M_PI);
        const float acc = rng.uniformFloat(0.5, 4);
        const float slowDown = rng.uniform() > 0.5 ? rng.uniformFloat(0, SlowdownAcceleration::SLOW_DOWN_TIME) : 0;
        const EndSpeed endSpeedType = rng.uniform() > 0.5 ? EndSpeed::EXACT : EndSpeed::FAST;

        const auto profile = AlphaTimeTrajectory::calculateTrajectory(RobotState(Vector(1, 2), v0), v1, time, angle, acc, maxSpeed, slowDown, endSpeedType);

        // generic checks
        checkBasic(rng, profile, v0, v1, maxSpeed, acc, slowDown, endSpeedType);
        checkDistanceIncrease(v0, time, maxSpeed, acc, angle);
    }
}

TEST(AlphaTimeTrajectory, findTrajectory) {
    constexpr int RUNS = 10'000;

    int fails = 0;
    for (int i = 0; i < RUNS; i++) {
        RNG rng(i + 1);
        const float maxSpeed = rng.uniformFloat(0.3, 5);

        const Vector s0 = makePos(rng, 2);
        const Vector v0 = makeSpeed(rng, maxSpeed);
        const Vector s1 = rng.uniform() > 0.9 ? makePos(rng, 5) : (s0 + makePos(rng, 0.1));
        const Vector v1 = rng.uniform() > 0.9 ? Vector(0, 0) : makeSpeed(rng, maxSpeed);

        const float acc = rng.uniformFloat(0.5, 4);
        const float slowDownTime = rng.uniform() > 0.5 ? rng.uniformFloat(0, SlowdownAcceleration::SLOW_DOWN_TIME) : 0;
        const EndSpeed endSpeedType = rng.uniform() > 0.5 ? EndSpeed::FAST : EndSpeed::EXACT;

        const auto profileOpt = AlphaTimeTrajectory::findTrajectory(RobotState(s0, v0), RobotState(s1, v1), acc, maxSpeed, slowDownTime, endSpeedType);
        if (!profileOpt) {
            fails += 1;
            continue;
        }
        const auto profile = profileOpt.value();

        // generic checks
        checkBasic(rng, profile, v0, v1, maxSpeed, acc, slowDownTime, endSpeedType);
        checkEndPosition(profile, s1);
    }

    ASSERT_LT((float)fails / RUNS, 0.01f);
}

// TODO: test total time
