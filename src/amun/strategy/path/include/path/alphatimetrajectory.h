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


class AlphaTimeTrajectory
{
public:
    // helper functions
    static float minimumTime(Vector startSpeed, Vector endSpeed, float acc, bool fastEndSpeed);
    static Vector minTimePos(Vector v0, Vector v1, float acc, float slowDownTime);

    // search for position
    static SpeedProfile findTrajectory(Vector v0, Vector v1, Vector position, float acc, float vMax, float slowDownTime, bool highPrecision, bool fastEndSpeed);

    // speed profile output
    // any input is valid as long as time is not negative
    // if minTime is given, it must be the value of minTimeFastEndSped(v0, v1, acc)
    static SpeedProfile calculateTrajectory(Vector v0, Vector v1, float time, float angle, float acc, float vMax,
                                            float slowDownTime, bool fastEndSpeed, float minTime = -1);

private:
    struct TrajectoryPosInfo2D {
        Vector endPos;
        Vector increaseAtSpeed;
    };

    // pos only
    // WARNING: assumes that the input is valid and solvable (minimumTime must be included)
    static TrajectoryPosInfo2D calculatePosition(Vector v0, Vector v1, float time, float angle, float acc, float vMax, bool fastEndSpeed);

    static constexpr float REGULAR_TARGET_PRECISION = 0.01f;
    static constexpr float HIGH_QUALITY_TARGET_PRECISION = 0.0002f;

    static constexpr int MAX_SEARCH_ITERATIONS = 30;
    static constexpr int HIGH_PRECISION_ITERATIONS = 50;

};

#endif // ALPHATIMETRAJECTORY_H
