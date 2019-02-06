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

#include "commandevaluator.h"
#include "debughelper.h"
#include "processor.h"
#include "protobuf/debug.pb.h"
#include "protobuf/world.pb.h"
#include <cmath>
#include <QString>

const float CONTROL_STEP = 0.01f;

CommandEvaluator::CommandEvaluator(const robot::Specs &specs) :
    m_specs(specs),
    m_startTime(0),
    m_baseSpeed(0, 0, 0),
    m_baseSpeedTime(0)
{
}

void CommandEvaluator::setInput(const robot::ControllerInput &input, qint64 currentTime)
{
    m_input = input;
    m_startTime = currentTime;
}

void CommandEvaluator::clearInput()
{
    setInput(robot::ControllerInput(), 0);
}

bool CommandEvaluator::hasInput()
{
    return (m_startTime != 0);
}

void CommandEvaluator::calculateCommand(const world::Robot *robot, qint64 worldTime, robot::Command &command, amun::DebugValues *debug)
{
    const bool hasRobot = (robot != nullptr);

    // falls back to local coordinates if robot is invisible
    const float robotPhi = robotToPhi(robot);

    // If the command contains desired local robot speeds, the robot is being controlled manually.
    bool hasManualCommand = command.has_v_s() && command.has_v_f() && command.has_omega();
    GlobalSpeed output = evaluateInput(hasRobot, robotPhi, worldTime, command, debug, true, hasManualCommand);

    prepareBaseSpeed(robot, worldTime);
    LocalSpeed localOutputBase = m_baseSpeed.toLocal(robotPhi);
    // equal to CONTROL_STEP as long as the robot is tracked
    float timeStep = (worldTime - m_baseSpeedTime) * 1E-9;
    GlobalSpeed limitedOutput = limitAcceleration(robotPhi, output, m_baseSpeed, timeStep, hasManualCommand);
    updateBaseSpeed(worldTime, limitedOutput);

    // predict robot rotation, assume the robot managed to follow the command
    const float robotPhiOne = robotPhi + (localOutputBase.omega + limitedOutput.omega) / 2 * timeStep;
    drawSpeed(robot, limitedOutput, debug);
    LocalSpeed localOutput = limitedOutput.toLocal(robotPhiOne);

    const qint64 worldTimeTwo = worldTime + (qint64)(CONTROL_STEP * 1000 * 1000 * 1000);
    GlobalSpeed outputTwo = evaluateInput(hasRobot, robotPhiOne, worldTimeTwo, command, debug, false, hasManualCommand);
    float timeStepTwo = CONTROL_STEP;
    GlobalSpeed limitedOutputTwo = limitAcceleration(robotPhiOne, outputTwo, limitedOutput, timeStepTwo, hasManualCommand);

    const float robotPhiTwo = robotPhiOne + (limitedOutput.omega + limitedOutputTwo.omega) / 2 * CONTROL_STEP;
    LocalSpeed localOutputTwo = limitedOutputTwo.toLocal(robotPhiTwo);

    // localOutputBase is exactly one CONTROL_STEP before localOutput while the robot is tracked
    // and therefore optimal. The baseSpeed of an untracked robot may be off by about one millisecond.
    // This is not compensated as precise control of the robot is not possible under these circumstances.
    localOutputBase.copyToSpeedVector(*command.mutable_output0());
    localOutput.copyToSpeedVector(*command.mutable_output1());
    localOutputTwo.copyToSpeedVector(*command.mutable_output2());
}

float CommandEvaluator::robotToPhi(const world::Robot *robot)
{
    float robot_phi = 0;
    if (robot) {
        // coordinate systems are x-y and s-f for the right-up axis
        // moving in x direction = moving in forward direction -> 90 degree cw
        robot_phi = robot->phi() - M_PI_2;
    }
    return robot_phi;
}

GlobalSpeed CommandEvaluator::evaluateInput(bool hasTrackedRobot, float robotPhi, qint64 worldTime, const robot::Command &command,
                                            amun::DebugValues *debug, bool drawSplines, bool hasManualCommand)
{
    // default to stopping
    GlobalSpeed output(0, 0, 0);

    if (hasManualCommand) {
        if (command.local() || !hasTrackedRobot) {
            output = evaluateLocalManualControl(command).toGlobal(robotPhi);
        } else {
            output = evaluateManualControl(command);
        }
    } else if (hasTrackedRobot) {
        if (drawSplines) {
            // splines only work if we know where the robot is
            drawSpline(debug);
        }
        output = evaluateSplineAtTime(worldTime);
    }

    if (!output.isValid()) {
        logInvalidCommand(debug, worldTime);
        output = GlobalSpeed(0, 0, 0);
    }

    return output;
}

LocalSpeed CommandEvaluator::evaluateLocalManualControl(const robot::Command &command)
{
    float v_s = command.v_s();
    float v_f = command.v_f();
    float omega = command.omega();
    return LocalSpeed(v_s, v_f, omega);
}

GlobalSpeed CommandEvaluator::evaluateManualControl(const robot::Command &command)
{
    // v_s and v_f actually contain v_x and v_y
    float v_x = command.v_s();
    float v_y = command.v_f();
    float omega = command.omega();
    return GlobalSpeed(v_x, v_y, omega);
}

GlobalSpeed CommandEvaluator::evaluateSplineAtTime(const qint64 worldTime)
{
    float timeElapsed = (worldTime - m_startTime) * 1E-9f;
    int activeSplineIndex = findActiveSpline(timeElapsed);
    if (activeSplineIndex >= 0) {
        // generate the desired state
        return evaluateSplinePartAtTime(m_input.spline(activeSplineIndex), timeElapsed);
    }
    return GlobalSpeed(0, 0, 0);
}

int CommandEvaluator::findActiveSpline(const float time)
{
    for (int i = 0; i < m_input.spline_size(); i++) {
        const robot::Spline &spline = m_input.spline(i);
        if (spline.t_start() <= time && time < spline.t_end()) {
            return i;
        }
    }
    return -1;
}

GlobalSpeed CommandEvaluator::evaluateSplinePartAtTime(const robot::Spline &spline, const float t)
{
    float v_x = spline.x().a1() + (2 * spline.x().a2() + 3 * spline.x().a3() * t) * t;
    float v_y = spline.y().a1() + (2 * spline.y().a2() + 3 * spline.y().a3() * t) * t;
    float omega = spline.phi().a1() + (2 * spline.phi().a2() + 3 * spline.phi().a3() * t) * t;
    return GlobalSpeed(v_x, v_y, omega);
}

void CommandEvaluator::logInvalidCommand(amun::DebugValues *debug, qint64 worldTime)
{
    amun::StatusLog *log = debug->add_log();
    log->set_timestamp(worldTime);
    log->set_text(QString("Invalid command for robot %1-%2").arg(m_specs.generation()).arg(m_specs.id()).toStdString());
}

void CommandEvaluator::drawSpline(amun::DebugValues *debug)
{
    const google::protobuf::RepeatedPtrField<robot::Spline> &input = m_input.spline();

    amun::Visualization *vis = debug->add_visualization();
    vis->set_name("Controller/Spline");
    vis->set_width(0.01f);
    vis->mutable_pen()->mutable_color()->set_red(255);

    amun::Path *path = vis->mutable_path();

    // iterate over the spline
    for(google::protobuf::RepeatedPtrField<robot::Spline>::const_iterator it = input.begin(); it != input.end(); ++it) {
        // get spline part of this index
        const robot::Spline &spline = *it;

        // Plot this part of the spline by evaluating some points of the spline part
        float d = spline.t_end() - spline.t_start();
        if (spline.t_end() == INFINITY) {
            // just give a short glimpse of infinity
            d = 1;
        }

        float last_p_x, last_p_y;

        // Add points of spline (position) to path
        for (int i = 0; i <= 10; ++i) {
            const float t = spline.t_start() + i * d / 10;

            const float p_x = spline.x().a0() + (spline.x().a1() + (spline.x().a2() + spline.x().a3() * t) * t) * t;
            const float p_y = spline.y().a0() + (spline.y().a1() + (spline.y().a2() + spline.y().a3() * t) * t) * t;

            amun::Point *p = path->add_point();
            p->set_x(p_x);
            p->set_y(p_y);

            last_p_x = p_x;
            last_p_y = p_y;
        }

        {
            const float t = spline.t_start() + d;
            // Visualize desired velocities on spline part end
            const float v_x = spline.x().a1() + (2 * spline.x().a2() + 3 * spline.x().a3() * t) * t;
            const float v_y = spline.y().a1() + (2 * spline.y().a2() + 3 * spline.y().a3() * t) * t;

            amun::Visualization *vis = debug->add_visualization();
            vis->set_name("Controller/Spline/Velocity");
            vis->set_width(0.01f);
            vis->mutable_pen()->mutable_color()->set_blue(255);

            amun::Path *path = vis->mutable_path();

            amun::Point *p = path->add_point();
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

// Limit acceleration and velocities in global coordinates
// as the robots momentum is relative to the global frame
GlobalSpeed CommandEvaluator::limitAcceleration(float robotPhi, const GlobalSpeed &command, const GlobalSpeed &baseSpeed, float timeStep,
                                                bool hasManualCommand)
{
    if (timeStep == 0) {
        return baseSpeed;
    }

    // Try to reach desired velocity within one step - would result in very high control output
    const float a_d_x = (command.v_x - baseSpeed.v_x) * (1 / timeStep);
    const float a_d_y = (command.v_y - baseSpeed.v_y) * (1 / timeStep);
    const float a_d_phi = (command.omega - baseSpeed.omega) * (1 / timeStep);

    GlobalAcceleration desiredAccel(a_d_x, a_d_y, a_d_phi);
    LocalAcceleration localAccel = desiredAccel.toLocal(robotPhi);

    LocalSpeed localCommand = command.toLocal(robotPhi);
    const robot::LimitParameters& a_limits = hasManualCommand ? m_specs.strategy() : m_specs.acceleration();

    // Robot has different speed up / slow down accelerations
    localAccel.a_s = boundAcceleration(localAccel.a_s, localCommand.v_s, a_limits.a_speedup_s_max(), a_limits.a_brake_s_max());
    localAccel.a_f = boundAcceleration(localAccel.a_f, localCommand.v_f, a_limits.a_speedup_f_max(), a_limits.a_brake_f_max());
    localAccel.a_phi = boundAcceleration(localAccel.a_phi, localCommand.omega, a_limits.a_speedup_phi_max(), a_limits.a_brake_phi_max());

    GlobalAcceleration boundedAccel = localAccel.toGlobal(robotPhi);

    // Integrate bounded and scaled acceleration to velocity
    GlobalSpeed boundedSpeed = baseSpeed;
    boundedSpeed.v_x += boundedAccel.a_x * timeStep;
    boundedSpeed.v_y += boundedAccel.a_y * timeStep;
    boundedSpeed.omega += boundedAccel.a_phi * timeStep;
    return boundedSpeed;
}

void CommandEvaluator::prepareBaseSpeed(const world::Robot *robot, qint64 worldTime)
{
    if (robot) {
        // use the tracking data information
        m_baseSpeed.v_x = robot->v_x();
        m_baseSpeed.v_y = robot->v_y();
        m_baseSpeed.omega = robot->omega();
    }

    if (m_baseSpeedTime == 0) {
        m_baseSpeedTime = worldTime;
    }
}

float CommandEvaluator::boundAcceleration(float acceleration, float oldSpeed, float speedupLimit, float brakeLimit) const
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

void CommandEvaluator::updateBaseSpeed(qint64 worldTime, GlobalSpeed limitedOutput)
{
    m_baseSpeed = limitedOutput;
    m_baseSpeedTime = worldTime;
}

void CommandEvaluator::drawSpeed(const world::Robot *robot, const GlobalSpeed &output, amun::DebugValues *debug)
{
    if (robot != nullptr) {
        DebugHelper::drawLine(debug, robot->p_x(), robot->p_y(), robot->p_x() + output.v_x, robot->p_y() + output.v_y,
                              0, 0, 255, 0.01, "Controller/Accelerator");
    }
}
