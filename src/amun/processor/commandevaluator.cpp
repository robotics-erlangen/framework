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
#include "path/trajectoryinput.h"
#include "processor.h"
#include "protobuf/debug.pb.h"
#include "protobuf/world.pb.h"
#include <cmath>
#include <QString>
#include <qdebug.h>

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

    m_trajs.clear();
    for (int i = 0; i < m_input.trajectory_size(); i++) {
        robot::AlphaTimeTrajectory inputTraj = m_input.trajectory(i);
        if (!inputTraj.has_start_pos()
                || !inputTraj.has_start_vel()
                || !inputTraj.has_end_vel()
                || !inputTraj.has_start_angle()
                || !inputTraj.has_end_angle()
                || !inputTraj.has_alpha()
                || !inputTraj.has_time()
                || !inputTraj.has_acceleration()
                || !inputTraj.has_v_max()
                || !inputTraj.has_end_speed_type()
                || !inputTraj.has_slow_down_time()) {
            qDebug() << "Incomplete AlphaTimeTrajectory object - skipping";
            continue;
        }

        const AlphaTimeTrajectory traj{
            RobotState(Vector(inputTraj.start_pos().x(), inputTraj.start_pos().y()), Vector(inputTraj.start_vel().x(), inputTraj.start_vel().y())),
            Vector(inputTraj.end_vel().x(), inputTraj.end_vel().y()),
            inputTraj.time(),
            inputTraj.alpha(),
            inputTraj.acceleration(),
            inputTraj.v_max(),
            inputTraj.slow_down_time(),
            inputTraj.end_speed_type() == robot::AlphaTimeTrajectory::EndSpeedType::AlphaTimeTrajectory_EndSpeedType_Fast ? EndSpeed::FAST : EndSpeed::EXACT
        };
        m_trajs.emplace_back(std::make_pair(traj, inputTraj.end_angle()));
    }
}

void CommandEvaluator::clearInput()
{
    setInput(robot::ControllerInput(), 0);
}

bool CommandEvaluator::hasInput()
{
    return (m_startTime != 0);
}

// normalizes to [-pi, pi)
static float normalizeAngle(float angle) {
    while (angle < -std::numbers::pi) {
        angle += 2 * std::numbers::pi;
    }
    while (angle >= std::numbers::pi) {
        angle -= 2 * std::numbers::pi;
    }
    return angle;
}

void CommandEvaluator::calculateCommand(const world::Robot *robot, qint64 worldTime, robot::Command &command, amun::DebugValues *debug)
{
    if (m_baseSpeedTime == 0) {
        m_baseSpeedTime = worldTime;
    }

    const bool hasRobot = (robot != nullptr);
    const float robotTheta = robotToTheta(robot);
    const float robotPhi = hasRobot ? robot->phi() : 0;

    // update the PID controller for the robot orientation if we are currently
    // using alpha time trajectories, as these only describe the final robot rotation,
    // thus requiring a separate controller
    if (hasRobot && m_trajs.size() > 0) {
        const float targetPhi = m_trajs[0].second;
        const float deltaPhi = normalizeAngle(targetPhi - robotPhi);
        m_trajOmega = m_robotPhiPID.update(deltaPhi, (worldTime - m_lastTrajOmegaUpdate) * 1e-9f);
        m_lastTrajOmegaUpdate = worldTime;
    } else {
        m_robotPhiPID.reset();
        m_lastTrajOmegaUpdate = worldTime;
    }

    // if the command contains desired speeds, the robot is being controlled manually
    // if command.local() is set to false and the robot is tracked, v_[sf] is actually v_[xy]
    bool hasManualCommand = command.has_v_s() && command.has_v_f() && command.has_omega();

    if (hasRobot) {
        // use the tracking data information, as it is better than our guess from last iteration
        m_baseSpeed.v_x = robot->v_x();
        m_baseSpeed.v_y = robot->v_y();
        m_baseSpeed.omega = robot->omega();
    }

    if (hasManualCommand) {
        command.clear_controller();
        robot::ControllerInput *controller = command.mutable_controller();
        if (hasRobot) {
            GlobalSpeed manualSpeed = command.local()
                ? evaluateLocalManualControl(command).toGlobal(robotTheta)
                : evaluateGlobalManualControl(command);

            float xPos = robot->p_x();
            float yPos = robot->p_y();
            float phi = robot->phi();

            float xVel = manualSpeed.v_x;
            float yVel = manualSpeed.v_y;
            float omega = manualSpeed.omega;

            robot::Spline *spline = controller->add_global_spline();
            spline->set_t_start(0);
            spline->set_t_end(INFINITY);

            robot::Polynomial *xSpline = spline->mutable_x();
            xSpline->set_a0(xPos);
            xSpline->set_a1(xVel);
            xSpline->set_a2(0);
            xSpline->set_a3(0);

            robot::Polynomial *ySpline = spline->mutable_y();
            ySpline->set_a0(yPos);
            ySpline->set_a1(yVel);
            xSpline->set_a2(0);
            xSpline->set_a3(0);

            robot::Polynomial *phiSpline = spline->mutable_phi();
            phiSpline->set_a0(phi);
            phiSpline->set_a1(omega);
            phiSpline->set_a2(0);
            phiSpline->set_a3(0);
        } else {
            LocalSpeed manualSpeed = command.local()
                ? evaluateLocalManualControl(command)
                : LocalSpeed(0, 0, 0);

            robot::Spline *spline = controller->add_local_spline();
            spline->set_t_start(0);
            spline->set_t_end(INFINITY);

            robot::Polynomial *sSpline = spline->mutable_x();
            sSpline->set_a0(0);
            sSpline->set_a1(manualSpeed.v_s);
            sSpline->set_a2(0);
            sSpline->set_a3(0);

            robot::Polynomial *fSpline = spline->mutable_y();
            fSpline->set_a0(0);
            fSpline->set_a1(manualSpeed.v_f);
            fSpline->set_a2(0);
            fSpline->set_a3(0);

            robot::Polynomial *phiSpline = spline->mutable_phi();
            phiSpline->set_a0(0);
            phiSpline->set_a1(manualSpeed.omega);
            phiSpline->set_a2(0);
            phiSpline->set_a3(0);
        }
        setInput(*controller, worldTime);
    }

    GlobalSpeed outputBase = m_baseSpeed;
    // falls back to local coordinates if robot is invisible
    const float robotThetaBase = robotTheta;
    LocalSpeed localOutputBase = outputBase.toLocal(robotThetaBase);

    const qint64 worldTimeOne = worldTime + (qint64)(CONTROL_STEP * 1000 * 1000 * 1000);
    GlobalSpeed outputOne = evaluateInput(hasRobot, robotPhi, worldTimeOne, command, debug, hasManualCommand); // TODO
    const float timeStepOne = (worldTimeOne - m_baseSpeedTime) * 1E-9; // = CONTROL_STEP as long as the robot is tracked
    GlobalSpeed limitedOutputOne = limitAcceleration(robotThetaBase, outputOne, timeStepOne, hasManualCommand);
    // predict robot rotation, assume the robot managed to follow the command
    const float robotThetaOne = robotThetaBase + (localOutputBase.omega + limitedOutputOne.omega) / 2 * timeStepOne;
    LocalSpeed localOutputOne = limitedOutputOne.toLocal(robotThetaOne);

    if (hasRobot && !hasManualCommand) {
        // splines only work if we know where the robot is and we arent controlling it by hand
        drawSpline(debug);
    }
    drawSpeed(robot, limitedOutputOne, debug);

    m_baseSpeed = limitedOutputOne;
    m_baseSpeedTime = worldTimeOne;

    const qint64 worldTimeTwo = worldTimeOne + (qint64)(CONTROL_STEP * 1000 * 1000 * 1000);
    GlobalSpeed outputTwo = evaluateInput(hasRobot, robotPhi, worldTimeTwo, command, debug, hasManualCommand);
    const float timeStepTwo = CONTROL_STEP;
    GlobalSpeed limitedOutputTwo = limitAcceleration(robotThetaOne, outputTwo, timeStepTwo, hasManualCommand);
    const float robotThetaTwo = robotThetaOne + (localOutputOne.omega + limitedOutputTwo.omega) / 2 * CONTROL_STEP;
    LocalSpeed localOutputTwo = limitedOutputTwo.toLocal(robotThetaTwo);

    // localOutputBase is exactly one CONTROL_STEP before localOutputOne while the robot is tracked
    // and therefore optimal. The baseSpeed of an untracked robot may be off by about one millisecond.
    // This is not compensated as precise control of the robot is not possible under these circumstances.
    localOutputBase.copyToSpeedVector(*command.mutable_output0());
    localOutputOne.copyToSpeedVector(*command.mutable_output1());
    localOutputTwo.copyToSpeedVector(*command.mutable_output2());

    // Its VERY IMPORTANT that the global speeds we write here to output[012]
    // match with the locals speed we write above (localOutputBase is the local version
    // of outputBase, etc). The angles for the local coordinates have to be theta0 = cur_theta, and
    // then from there need to be calculated with theta1 = theta0 + (omega0 + omega1) * CONTROLSTEP / 2
    // and theta2 = theta1 + (omega1 + omega2) * CONTROLSTEP / 2.
    outputBase.copyToSpeedVector(*command.mutable_output0());
    limitedOutputOne.copyToSpeedVector(*command.mutable_output1());
    limitedOutputTwo.copyToSpeedVector(*command.mutable_output2());

    command.set_cur_phi(robotPhi);
}

float CommandEvaluator::robotToTheta(const world::Robot *robot)
{
    // phi is the direction the robot is currently facing (in global coordinates (xy), 0 being towards positive x).
    // theta is the (counter clockwise) angle necessary for the transformation from the local (sf) to the global (xy) coordinate system.
    //
    // For phi = pi/2, the robot is facing in positive y direction.
    // As the sidewards component is to the right, you get the following picture:
    //        y         f
    //    +---->    +---->
    //    |         |
    //   x|        s|
    //    v         v
    //
    // So no rotation is necessary, thus theta = 0.
    //
    // For phi = 0, the robot is facing in positive x direction.
    // As the sidewards component is to the right, you get the following picture:
    //        y     s
    //    +---->   <----+
    //    |             |
    //   x|            f|
    //    v             v
    //
    // So to rotate from the local to the global coordinate system, we need to rotate
    // by 90 degrees clockwise, so theta = -pi/2, as theta describes the counter clockwise rotation needed.
    //
    // Other cases follow similarly.
    return robot == nullptr ? 0 : (robot->phi() - std::numbers::pi / 2);
}

GlobalSpeed CommandEvaluator::evaluateInput(bool hasTrackedRobot, float robotPhi, qint64 worldTime, const robot::Command &command,
                                            amun::DebugValues *debug, bool hasManualCommand)
{
    // default to stopping
    GlobalSpeed output(0, 0, 0);

    if (m_input.local_spline_size() > 0) {
        output = evaluateSplineAtTime(m_input.local_spline(), worldTime);
    } else if (hasTrackedRobot && m_input.global_spline_size() > 0) {
        output = evaluateSplineAtTime(m_input.global_spline(), worldTime);
    } else if (hasTrackedRobot && m_trajs.size() > 0) {
        output = evaluateAlphaTimeTrajectoryAtTime(worldTime, robotPhi);
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

GlobalSpeed CommandEvaluator::evaluateGlobalManualControl(const robot::Command &command)
{
    // v_s and v_f actually contain v_x and v_y
    float v_x = command.v_s();
    float v_y = command.v_f();
    float omega = command.omega();
    return GlobalSpeed(v_x, v_y, omega);
}

GlobalSpeed CommandEvaluator::evaluateSplineAtTime(const google::protobuf::RepeatedPtrField<robot::Spline> &splines, const qint64 worldTime)
{
    float timeElapsed = (worldTime - m_startTime) * 1E-9f;
    const robot::Spline *activeSpline = findActiveSpline(splines, timeElapsed);
    if (activeSpline == nullptr) {
        return GlobalSpeed(0, 0, 0);
    }
    return evaluateSplinePartAtTime(*activeSpline, timeElapsed);
}

const robot::Spline *CommandEvaluator::findActiveSpline(const google::protobuf::RepeatedPtrField<robot::Spline> &splines, const float time)
{
    for (const auto &spline : splines) {
        if (spline.t_start() <= time && time < spline.t_end()) {
            return &spline;
        }
    }
    return nullptr;
}

GlobalSpeed CommandEvaluator::evaluateSplinePartAtTime(const robot::Spline &spline, const float t)
{
    float v_x = spline.x().a1() + (2 * spline.x().a2() + 3 * spline.x().a3() * t) * t;
    float v_y = spline.y().a1() + (2 * spline.y().a2() + 3 * spline.y().a3() * t) * t;
    float omega = spline.phi().a1() + (2 * spline.phi().a2() + 3 * spline.phi().a3() * t) * t;
    return GlobalSpeed(v_x, v_y, omega);
}

GlobalSpeed CommandEvaluator::evaluateAlphaTimeTrajectoryAtTime(const qint64 worldTime, const float robotPhi)
{
    float timeElapsed = (worldTime - m_startTime) * 1E-9f;
    for (auto &[traj, endAngle] : m_trajs) {
        if (timeElapsed < traj.endTime()) {
            const RobotState state = traj.stateAtTime(timeElapsed);
            return GlobalSpeed(state.speed.x, state.speed.y, m_trajOmega);
        } else {
            timeElapsed -= traj.endTime();
        }
    }
    return GlobalSpeed(0, 0, 0);
}


void CommandEvaluator::logInvalidCommand(amun::DebugValues *debug, qint64 worldTime)
{
    amun::StatusLog *log = debug->add_log();
    log->set_timestamp(worldTime);
    log->set_text(QString("Invalid command for robot %1-%2").arg(m_specs.generation()).arg(m_specs.id()).toStdString());
}

void CommandEvaluator::drawSpline(amun::DebugValues *debug)
{
    const google::protobuf::RepeatedPtrField<robot::Spline> &input = m_input.global_spline();

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
GlobalSpeed CommandEvaluator::limitAcceleration(float robotTheta, const GlobalSpeed &command, float timeStep, bool hasManualCommand)
{
    if (timeStep == 0) {
        return m_baseSpeed;
    }

    // Try to reach desired velocity within one step - would result in very high control output
    const float a_d_x = (command.v_x - m_baseSpeed.v_x) * (1 / timeStep);
    const float a_d_y = (command.v_y - m_baseSpeed.v_y) * (1 / timeStep);
    const float a_d_phi = (command.omega - m_baseSpeed.omega) * (1 / timeStep);

    GlobalAcceleration desiredAccel(a_d_x, a_d_y, a_d_phi);
    LocalAcceleration localAccel = desiredAccel.toLocal(robotTheta);

    LocalSpeed localCommand = command.toLocal(robotTheta);
    const robot::LimitParameters& a_limits = hasManualCommand ? m_specs.strategy() : m_specs.acceleration();

    // Robot has different speed up / slow down accelerations
    localAccel.a_s = boundAcceleration(localAccel.a_s, localCommand.v_s, a_limits.a_speedup_s_max(), a_limits.a_brake_s_max());
    localAccel.a_f = boundAcceleration(localAccel.a_f, localCommand.v_f, a_limits.a_speedup_f_max(), a_limits.a_brake_f_max());
    localAccel.a_phi = boundAcceleration(localAccel.a_phi, localCommand.omega, a_limits.a_speedup_phi_max(), a_limits.a_brake_phi_max());

    GlobalAcceleration boundedAccel = localAccel.toGlobal(robotTheta);

    // Integrate bounded and scaled acceleration to velocity
    GlobalSpeed boundedSpeed = m_baseSpeed;
    boundedSpeed.v_x += boundedAccel.a_x * timeStep;
    boundedSpeed.v_y += boundedAccel.a_y * timeStep;
    boundedSpeed.omega += boundedAccel.a_phi * timeStep;
    return boundedSpeed;
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

void CommandEvaluator::drawSpeed(const world::Robot *robot, const GlobalSpeed &output, amun::DebugValues *debug)
{
    if (robot != nullptr) {
        DebugHelper::drawLine(debug, robot->p_x(), robot->p_y(), robot->p_x() + output.v_x, robot->p_y() + output.v_y,
                              0, 0, 255, 0.01, "Controller/Accelerator");
    }
}
