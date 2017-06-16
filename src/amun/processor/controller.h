/***************************************************************************
 *   Copyright 2015 Michael Eischer, Stefan Friedrich, Jan Kallwies,       *
 *       Philipp Nordhus                                                   *
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

#ifndef CONTROLLER_H
#define CONTROLLER_H

#include "protobuf/robot.pb.h"
#include <QtGlobal>

namespace amun { class DebugValues; }
namespace world { class Robot; }

class Controller
{
    // no copy of this instance
    Q_DISABLE_COPY(Controller)

public:
    explicit Controller(const robot::Specs &specs);

public:
    void calculateCommand(const world::Robot &robot, qint64 world_time, robot::Command &command, amun::DebugValues *debug);
    void setInput(const robot::ControllerInput &input, qint64 world_time);
    void clearInput();

    // Returns the robot specs
    const robot::Specs& specs() const { return m_specs; }

private:
    void controlAlgorithm(const world::Robot &robot, qint64 world_time, robot::Command &command, amun::DebugValues *debug);
    void getDesiredState_ManualControl(const world::Robot &robot, const robot::Command &command);
    void getDesiredState_AutomaticControl(const robot::Spline &spline, const float t);

    void drawSpline(amun::DebugValues *debug, const google::protobuf::RepeatedPtrField<robot::Spline> &input);

private:
    // Constant specs of the robot controlled by this instance of Controller
    const robot::Specs m_specs;

    // Input defining the desired control output
    robot::ControllerInput m_input;
    // Instant of time (absolute) when new input arrives, in ns.
    qint64 m_startTime;

private:
    // desired velocity in x-direction (global coordinates)
    float m_v_x_d;
    // desired velocity in y-direction (global coordinates)
    float m_v_y_d;
    // desired rotational speed (global coordinates)
    float m_omega_d;
};

#endif // CONTROLLER_H
