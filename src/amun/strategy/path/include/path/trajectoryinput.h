/***************************************************************************
 *   Copyright 2022 Andreas Wendler                                        *
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

#ifndef TRAJECTORYINPUT_H
#define TRAJECTORYINPUT_H

#include "core/vector.h"

struct RobotState {
    RobotState() = default;
    RobotState(Vector pos, Vector speed) :
        pos(pos), speed(speed) {}
    Vector pos;
    Vector speed;
};

struct TrajectoryInput {
    RobotState start;
    RobotState target;
    float t0 = 0;
    bool exponentialSlowDown;
    float maxSpeed;
    float maxSpeedSquared;
    float acceleration;
};

struct TrajectoryPoint
{
    TrajectoryPoint() = default;
    TrajectoryPoint(const RobotState &state, const float time) :
        state(state), time(time) {}
    RobotState state;
    float time;
};

#endif // TRAJECTORYINPUT_H
