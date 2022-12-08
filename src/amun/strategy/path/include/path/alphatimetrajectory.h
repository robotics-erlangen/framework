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
#include "speedprofile.h"
#include <vector>
#include <optional>

enum class EndSpeed {
    FAST,
    EXACT,
};


// WARNING: generated trajectories may exceed the maximum velocity by a factor of up to sqrt(2) in rare cases
class AlphaTimeTrajectory
{
public:
    // helper functions
    static float minimumTime(Vector startSpeed, Vector endSpeed, float acc, EndSpeed endSpeedType);
    static Vector minTimePos(const RobotState &start, Vector v1, float acc, float slowDownTime);

    // search for position
    static std::optional<Trajectory> findTrajectory(const RobotState &start, const RobotState &target, float acc, float vMax, float slowDownTime, EndSpeed endSpeedType);

    // speed profile output
    // any input is valid as long as time is not negative
    // if minTime is given, it must be the value of minTimeFastEndSped(v0, v1, acc)
    static Trajectory calculateTrajectory(const RobotState &start, Vector v1, float time, float angle, float acc, float vMax,
                                            float slowDownTime, EndSpeed endSpeedType, float minTime = -1);

private:
    struct TrajectoryPosInfo2D {
        Vector endPos;
        Vector increaseAtSpeed;
    };

    // pos only
    // WARNING: assumes that the input is valid and solvable (minimumTime must be included)
    static TrajectoryPosInfo2D calculatePosition(const RobotState &start, Vector v1, float time, float angle, float acc, float vMax, EndSpeed endSpeedType);
    static std::optional<Trajectory> tryDirectBrake(const RobotState &start, const RobotState &target, float acc, float slowDownTime);
    static Trajectory minTimeTrajectory(const RobotState &start, Vector v1, float slowDownTime, float minTime);

    static constexpr float REGULAR_TARGET_PRECISION = 0.01f;
    static constexpr float HIGH_QUALITY_TARGET_PRECISION = 0.0002f;

    static constexpr int MAX_SEARCH_ITERATIONS = 30;
    static constexpr int HIGH_PRECISION_ITERATIONS = 50;

public:
    // for the trajectorycli paramter optimization of findTrajectory (for single threaded use only)
#ifdef ACTIVE_PATHFINDING_PARAMETER_OPTIMIZATION
    static int searchIterationCounter;
#endif

};

#endif // ALPHATIMETRAJECTORY_H
