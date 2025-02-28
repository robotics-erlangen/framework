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

#ifndef ALPHATIMETRAJECTORY_H
#define ALPHATIMETRAJECTORY_H

#include "core/vector.h"
#include "trajectory.h"
#include "trajectoryinput.h"
#include <vector>
#include <optional>

#ifdef TESTING
    #include "gtest/gtest.h"
#endif

// WARNING: generated trajectories may exceed the maximum velocity by a factor of up to sqrt(2) in rare cases
class AlphaTimeTrajectory
{
#ifdef TESTING
    FRIEND_TEST(AlphaTimeTrajectory, calculateTrajectoryPositionInvariant);
#endif

private:
    // helper functions
    static float minimumTime(Vector startSpeed, Vector endSpeed, float acc, EndSpeed endSpeedType);
    static Vector minTimePos(const RobotState &start, Vector v1, float acc, float slowDownTime);

    // any input is valid as long as time is not negative
    // if minTime is given, it must be the value of minTimeFastEndSped(v0, v1, acc)
    static Trajectory calculateTrajectory(const RobotState &start, Vector v1, float time, float angle, float acc, float vMax,
                                            float slowDownTime, EndSpeed endSpeedType, float minTime = -1);

    struct TrajectoryPosInfo2D {
        Vector endPos;
        Vector increaseAtSpeed;
    };

    // pos only
    // WARNING: assumes that the input is valid and solvable
    static TrajectoryPosInfo2D calculatePosition(const RobotState &start, Vector v1, float time, float angle, float acc, float vMax,
                                                 EndSpeed endSpeedType, float minTime = -1);
    static std::optional<Trajectory> tryDirectBrake(const RobotState &start, const RobotState &target, float acc, float slowDownTime);
    static Trajectory minTimeTrajectory(const RobotState &start, Vector v1, float slowDownTime, float minTime);

    static constexpr float REGULAR_TARGET_PRECISION = 0.01f;
    static constexpr float HIGH_QUALITY_TARGET_PRECISION = 0.0002f;

    static constexpr int MAX_SEARCH_ITERATIONS = 30;
    static constexpr int HIGH_PRECISION_ITERATIONS = 50;

public:
    AlphaTimeTrajectory(
        RobotState start,
        Vector v1,
        float time,
        float angle,
        float acc,
        float vMax,
        float slowDownTime,
        EndSpeed endSpeedType,
        std::optional<float> minTime = {}
    ) : start(start)
      , v1(v1)
      , time(time)
      , angle(angle)
      , acc(acc)
      , vMax(vMax)
      , slowDownTime(slowDownTime)
      , endSpeedType(endSpeedType)
      , minTime(minTime)
    {}

private:
    RobotState start;
    Vector v1;
    float time;
    float angle;
    float acc;
    float vMax;
    float slowDownTime;
    EndSpeed endSpeedType;
    std::optional<float> minTime;
    std::optional<Trajectory> trajectory;

public:
    static std::optional<AlphaTimeTrajectory> find(const RobotState &start, const RobotState &target, float acc, float vMax, float slowDownTime, EndSpeed endSpeedType);

    // speed profile output
    Trajectory const &getTrajectory();

    void setStartPos(const Vector pos) {
        start.pos = pos;
        if (trajectory.has_value()) {
            trajectory.value().setStartPos(pos);
        }
    }

    void setCorrectionOffset(const Vector offset) {
        getTrajectory();
        trajectory->setCorrectionOffset(offset);
    }

    void limitToTime(const float t) {
        time = t;
        if (trajectory.has_value()) {
            trajectory.value().limitToTime(t);
        }
    }

    float endTime() {
        return getTrajectory().endTime();
    };

    RobotState endState() {
        Trajectory const &traj = getTrajectory();
        return {
            traj.endPosition(),
            traj.endSpeed()
        };
    }

    RobotState stateAtTime(float t) {
        return getTrajectory().stateAtTime(t);
    };

public:
    AlphaTimeTrajectoryData data() {
        return {
            .start = start,
            .v1 = v1,
            .time = time,
            .angle = angle,
            .acc = acc,
            .vMax = vMax,
            .slowDownTime = slowDownTime,
            .endSpeedType = endSpeedType
        };
    }

public:
#ifdef ACTIVE_PATHFINDING_PARAMETER_OPTIMIZATION
    // for the trajectorycli paramter optimization of AlphaTimeTrajectory::find (for single threaded use only)
    static int searchIterationCounter;
#endif
};

#endif // ALPHATIMETRAJECTORY_H
