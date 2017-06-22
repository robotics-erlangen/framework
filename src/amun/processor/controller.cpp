/***************************************************************************
 *   Copyright 2015 Simon Dirauf, Michael Eischer, Stefan Friedrich,       *
 *       Jan Kallwies, Philipp Nordhus                                     *
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

#include "controller.h"
#include "debughelper.h"
#include "processor.h"
#include "protobuf/debug.pb.h"
#include "protobuf/world.pb.h"
#include <cmath>
#include <QString>

/*!
 * \class Controller
 * \ingroup processor
 * \brief Position controller for robot control (both manual and automatic drive modes)
 */

/*!
 * \brief Initializing constructor
 * \param specs Specs of the robot controlled by this instance
 */
Controller::Controller(const robot::Specs &specs) :
    m_specs(specs),
    m_startTime(0)
{
}

/*!
 * \brief Sets new controller input, i.e. mostly a set of polynomes (spline)
 * \param input New controller input
 * \param current_time Timestamp for input
 */
void Controller::setInput(const robot::ControllerInput &input, qint64 current_time)
{
    // store input parameters (spline etc.)
    m_input = input;
    // store starting nanos
    m_startTime = current_time;
}

/*!
 * \brief Resets any controller input
 */
void Controller::clearInput()
{
    setInput(robot::ControllerInput(), 0);
}

/*!
 * \brief Run controller on @c robot
 *
 * Function to be called from outside, generates new (i.e. current) control command
 *
 * \param robot Current robot state
 * \param world_time Timestamp for robot state
 * \param command Command generated for the robot
 * \param debug Pointer to amun::DebugValues to be used as debugging interface
 */
void Controller::calculateCommand(const world::Robot &robot, qint64 world_time, robot::Command &command, amun::DebugValues *debug)
{
    // calculate elapsed time since the trajectory was planned
    // calculate expected state for the next strategy call
    float timeElapsed = (world_time - m_startTime) / 1E9;

    // If the command contains desired local robot speeds, the robot is being controlled
    // manually.
    if (command.has_v_s() && command.has_v_f() && command.has_omega()) {
        // In case the robot is not sent to the robot in a direct fashion
        if (!command.direct()) {
            // get the desired state from the manual commands
            getDesiredState_ManualControl(robot, command);
            controlAlgorithm(robot, world_time, command, debug);
        }

        // In case of manual control we are done.
        return;
    }

    // ------------ driving with splines ------------
    drawSpline(debug, m_input.spline());

    // current_index is the index variable of the currently active part of the spline
    int current_index = -1;

    // iterate through the spline
    for (int i = 0; i < m_input.spline_size(); i++) {
        const robot::Spline &spline = m_input.spline(i);
        if (spline.t_start() <= timeElapsed && timeElapsed < spline.t_end()) {
            current_index = i;
            break;
        }
    }

    // If there is a spline part that is currently active
    if (current_index >= 0) {
        // Evaluate the spline part in order to generate desired states
        getDesiredState_AutomaticControl(m_input.spline(current_index), timeElapsed);
        controlAlgorithm(robot, world_time, command, debug);
    }
}

//----------- control functionality ----------------

/*!
 * \brief The actual control algorithm implementation
 * \param robot Constant reference to current robot state
 * \param world_time Current world time
 * \param command Reference to command to be written
 * \param debug Pointer to amun::DebugValues to be used as debugging interface
 */
void Controller::controlAlgorithm(const world::Robot &robot, qint64 world_time, robot::Command &command, amun::DebugValues *debug)
{
    // abort if desired state is invalid
    if (std::isnan(m_v_x_d) || std::isinf(m_v_x_d) || std::isnan(m_v_y_d) || std::isinf(m_v_y_d)
            || std::isnan(m_omega_d) || std::isinf(m_omega_d)) {
        amun::StatusLog *log = debug->add_log();
        log->set_timestamp(world_time);
        log->set_text(QString("Invalid command for robot %1-%2").arg(m_specs.generation()).arg(m_specs.id()).toStdString());
        return;
    }

    // coordinate systems (global and robot coordinates) have rotational offset of pi/2
    const float robot_phi = robot.phi() - M_PI_2;
    // rotate cw
    const float v_s_d = std::cos(-robot_phi) * m_v_x_d - std::sin(-robot_phi) * m_v_y_d;
    const float v_f_d = std::sin(-robot_phi) * m_v_x_d + std::cos(-robot_phi) * m_v_y_d;

    command.set_v_s(v_s_d);
    command.set_v_f(v_f_d);
    command.set_omega(m_omega_d);
}

/*!
 * \brief Generate and store the desired state for the current control algorithm iteration during manually driven robot
 * \param robot Constant reference to current robot state
 * \param command Constant reference of command generated by manual input device (keyboard, joystick, etc)
 */
void Controller::getDesiredState_ManualControl(const world::Robot &robot, const robot::Command &command)
{
    // The desired speeds of the robot simply are the commanded speeds
    m_v_x_d = command.v_s();
    m_v_y_d = command.v_f();
    m_omega_d = command.omega();
}

/*!
 * \brief Generate and store the desired state for AI-controlled driven robot
 * \param spline Constant reference to the Spline to be evaluated in order to get desired states
 * \param t time to evaluate the spline at in seconds since spline was set
 */
void Controller::getDesiredState_AutomaticControl(const robot::Spline &spline, const float t)
{
    // calculate desired velocity from spline part
    m_v_x_d   = spline.x().a1() + (2 * spline.x().a2() + 3 * spline.x().a3() * t) * t;
    m_v_y_d   = spline.y().a1() + (2 * spline.y().a2() + 3 * spline.y().a3() * t) * t;
    m_omega_d = spline.phi().a1() + (2 * spline.phi().a2() + 3 * spline.phi().a3() * t) * t;
}

//-------------- util functions ---------------------
/*!
 * \brief Helper function to draw a spline.
 * \param debug Pointer to amun::DebugValues to be used as debugging interface
 * \param input spline to draw
 */
void Controller::drawSpline(amun::DebugValues *debug, const google::protobuf::RepeatedPtrField<robot::Spline> &input)
{
    amun::Visualization *vis = debug->add_visualization();
    vis->set_name("Controller/Spline");
    vis->set_width(0.01f);
    vis->mutable_pen()->mutable_color()->set_red(255);

    amun::Path *path = vis->mutable_path();

    // iterate over the spline
    for(google::protobuf::RepeatedPtrField<robot::Spline>::const_iterator it = input.begin(); it != input.end(); ++it) {
        // get spline part of this index
        const robot::Spline &spline = *it;

        // don't draw until infinity
        if (spline.t_end() == INFINITY) {
            break;
        }

        // Plot this part of the spline by evaluating some points of the spline part
        const float d = spline.t_end() - spline.t_start();
        float t = spline.t_start();
        float last_p_x = spline.x().a0() + (spline.x().a1() + (spline.x().a2() + spline.x().a3() * t) * t) * t;
        float last_p_y = spline.y().a0() + (spline.y().a1() + (spline.y().a2() + spline.y().a3() * t) * t) * t;

        // Create path
        amun::Point *p;
        p = path->add_point();
        p->set_x(last_p_x);
        p->set_y(last_p_y);

        // Add points of spline (position) to path
        for (int i = 1; i <= 10; ++i) {
            t = spline.t_start() + i * d / 10;

            const float p_x = spline.x().a0() + (spline.x().a1() + (spline.x().a2() + spline.x().a3() * t) * t) * t;
            const float p_y = spline.y().a0() + (spline.y().a1() + (spline.y().a2() + spline.y().a3() * t) * t) * t;

            p = path->add_point();
            p->set_x(p_x);
            p->set_y(p_y);

            last_p_x = p_x;
            last_p_y = p_y;
        }

        {
            // Visualize desired velocities on spline part end
            const float v_x = spline.x().a1() + (2 * spline.x().a2() + 3 * spline.x().a3() * t) * t;
            const float v_y = spline.y().a1() + (2 * spline.y().a2() + 3 * spline.y().a3() * t) * t;

            amun::Visualization *vis = debug->add_visualization();
            vis->set_name("Controller/Spline/Velocity");
            vis->set_width(0.01f);
            vis->mutable_pen()->mutable_color()->set_blue(255);

            amun::Path *path = vis->mutable_path();

            p = path->add_point();
            p->set_x(last_p_x);
            p->set_y(last_p_y);

            p = path->add_point();
            p->set_x(last_p_x + v_x);
            p->set_y(last_p_y + v_y);
        }

        {
            // Visualize switching points
            amun::Visualization *vis = debug->add_visualization();
            vis->set_name("Controller/Spline/SwitchingPoints");
            vis->set_width(0.01f);
            vis->mutable_pen()->mutable_color()->set_red(255);

            amun::Circle *circle = vis->mutable_circle();
            circle->set_p_x(last_p_x);
            circle->set_p_y(last_p_y);
            circle->set_radius(0.05);
        }
    }
}
