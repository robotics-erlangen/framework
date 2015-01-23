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

#include "accelerator.h"
#include "debughelper.h"
#include <cmath>

/*!
 * \class Accelerator
 * \ingroup processor
 * \brief Class to generate velocity commands with limited acceleration (ramp)
 */

/*!
 * \brief Initializing constructor
 * \param specs Specs of the robot controlled by this instance
 */
Accelerator::Accelerator(const robot::Specs &specs) :
    m_specs(specs),
    m_lastTime(0),
    m_v_d_x(0),
    m_v_d_y(0),
    m_v_d_omega(0)
{
}

/*!
 * \brief Updated command to change velocity with limited acceleration
 * \param robot Pointer to the robot being controlled
 * \param command Command to be sent to the robot
 * \param time Current world time in nanoseconds
 */
void Accelerator::limit(const world::Robot *robot, robot::Command &command, qint64 time, amun::DebugValues *debug)
{
    // if this is the first time that this function is called
    if (m_lastTime == 0) {
        // Store time in m_lastTime initially and return without action.
        m_lastTime =  time;
        return;
    }

    // Get time since last call of the method (calculate period time)
    const float T = (time - m_lastTime) / 1E9;
    m_lastTime = time;

    if (T == 0) {
        // copy last speed, if no time has passed
        command.set_v_x(m_v_d_x);
        command.set_v_y(m_v_d_y);
        command.set_omega(m_v_d_omega);
        return;
    }

    // global velocity is independent of robot orientation
    // local velocitiy DEPENDS on robot orientation
    float robot_phi = 0;
    if (robot != NULL) {
        robot_phi = robot->phi() - M_PI_2;
    }

    // Calculate deviation of the desired velocity to the command velocity
    // in global coordinates
    const float v_d_error_x = command.v_x() - m_v_d_x;
    const float v_d_error_y = command.v_y() - m_v_d_y;
    const float v_d_error_omega = command.omega() - m_v_d_omega;

    // Get Parameters from config
    const robot::LimitParameters& a_limits = m_specs.acceleration();

    // Try to reach desired velocity within one step - would result in very high control output
    float a_d_x = v_d_error_x / T;
    float a_d_y = v_d_error_y / T;
    float a_d_phi = v_d_error_omega / T;

    // Transform desired acceleration to robot coordinates
    float a_d_s = std::cos(-robot_phi) * a_d_x - std::sin(-robot_phi) * a_d_y;
    float a_d_f = std::sin(-robot_phi) * a_d_x + std::cos(-robot_phi) * a_d_y;

    // Transform (last) desired velocity to robot coordinates
    float v_d_s = std::cos(-robot_phi) * m_v_d_x - std::sin(-robot_phi) * m_v_d_y;
    float v_d_f = std::sin(-robot_phi) * m_v_d_x + std::cos(-robot_phi) * m_v_d_y;

    // Bound accelerations (in robot coordinates), but preserve the direction of the acceleration vector
    // As desired acceleration in local coordinates is derived from local coordinates position error,
    // its sign gives an indication whether the movement of the robot needs to speed up or whether
    // the speed of the robot needs to be diminished. We need to distinguish between speed up and speed down
    // due to different acceleration capability of the robot (physical: back-emf facilitates to speed down)

    float a_d_s_bound = bound(a_d_s, v_d_s, a_limits.a_speedup_s_max(), a_limits.a_brake_s_max());
    float a_d_f_bound = bound(a_d_f, v_d_f, a_limits.a_speedup_f_max(), a_limits.a_brake_f_max());

    // If scaling is required in order to conserve the direction of the acceleration vector, do it!
    if ((a_d_f_bound != a_d_f) || (a_d_s_bound != a_d_s)) {
        // If acceleration exists only in one direction just use the bounded one
        if (a_d_f == 0) {
            a_d_s = a_d_s_bound;
        } else if (a_d_s == 0) {
            a_d_f = a_d_f_bound;
        } else {
            // else scale down both directions of acceleration, make sure direction remains the same
            // This scaling + bounding is validated and works!
            float ratio_f = a_d_f_bound / a_d_f;
            float ratio_s = a_d_s_bound / a_d_s;
            float min_ratio = qMin(ratio_f, ratio_s);
            a_d_f *= min_ratio;
            a_d_s *= min_ratio;
        }
    }

    // Transform bounded accelerations to robot coordinates
    float a_d_x_scaled_down = std::cos(robot_phi) * a_d_s - std::sin(robot_phi) * a_d_f;
    float a_d_y_scaled_down = std::sin(robot_phi) * a_d_s + std::cos(robot_phi) * a_d_f;
    float a_d_phi_bound = bound(a_d_phi, m_v_d_omega, a_limits.a_speedup_phi_max(), a_limits.a_brake_phi_max());

    // Integrate bounded and scaled acceleration to velocity
    m_v_d_x += a_d_x_scaled_down * T;
    m_v_d_y += a_d_y_scaled_down * T;
    m_v_d_omega += a_d_phi_bound * T;

    // Set new v_d in global coordinates
    command.set_v_x(m_v_d_x);
    command.set_v_y(m_v_d_y);
    command.set_omega(m_v_d_omega);

    if (robot != NULL) {
        float a_d_x = std::cos(robot_phi) * a_d_s - std::sin(robot_phi) * a_d_f;
        float a_d_y = std::sin(robot_phi) * a_d_s + std::cos(robot_phi) * a_d_f;

        DebugHelper::drawLine(debug, robot->p_x(), robot->p_y(), robot->p_x() + m_v_d_x, robot->p_y() + m_v_d_y,
                              0, 0, 255, 0.01, "Controller/Accelerator");
        DebugHelper::drawLine(debug, robot->p_x(), robot->p_y(), robot->p_x() + a_d_x, robot->p_y() + a_d_y,
                              255, 0, 0, 0.03, "Controller/Accelerator");
    }
}

float Accelerator::bound(float acceleration, float oldSpeed, float speedupLimit, float brakeLimit) const
{
    // In case the robot needs to gain speed
    if ((std::signbit(acceleration) == std::signbit(oldSpeed)) || (oldSpeed == 0)) {
        // the acceleration needs to be bounded with values for speeding up.
        return qBound(-speedupLimit, acceleration, speedupLimit);
    } else {
        // bound braking acceleration, in order to avoid fallover
        return qBound(-brakeLimit, acceleration, brakeLimit);
    }
}
