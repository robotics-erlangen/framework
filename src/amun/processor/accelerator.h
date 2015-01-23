/***************************************************************************
 *   Copyright 2015 Michael Eischer, Jan Kallwies, Philipp Nordhus         *
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

#ifndef ACCELERATOR_H
#define ACCELERATOR_H

#include "protobuf/robot.pb.h"
#include "protobuf/world.pb.h"
#include <QtGlobal>

namespace amun { class DebugValues; }

class Accelerator
{
public:
    Accelerator(const robot::Specs &specs);

public:
    void limit(const world::Robot *robot, robot::Command &command, qint64 time, amun::DebugValues *debug);

private:
    float bound(float acceleration, float oldSpeed, float speedupLimit, float brakeLimit) const;

private:
    //! Specs of the robot being accelerated
    const robot::Specs m_specs;
    //! Instant of time in ns when limit was last calleds
    qint64 m_lastTime;
    //! Desired velocity in global x direction
    float m_v_d_x;
    //! Desired velocity in global y direction
    float m_v_d_y;
    //! Desired rotational velocity
    float m_v_d_omega;
};

#endif // ACCELERATOR_H
