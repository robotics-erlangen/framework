/***************************************************************************
 *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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

#include "robotfilter.h"
#include "core/timer.h"

const qint64 PROCESSOR_TICK_DURATION = 10 * 1000 * 1000;
const float MAX_LINEAR_ACCELERATION = 10.;
const float MAX_ROTATION_ACCELERATION = 60.;
const float OMEGA_MAX = 10 * 2 * M_PI;

RobotFilter::RobotFilter(const SSL_DetectionRobot &robot, qint64 lastTime, bool teamIsYellow) :
    Filter(lastTime),
    m_id(robot.robot_id()),
    m_teamIsYellow(teamIsYellow),
    m_kalman(observationFromDetection(robot)),
    m_futureKalman(observationFromDetection(robot)),
    m_futureTime(0)
{
    // we can only observe the position
    m_kalman->H(0, 0) = 1.0;
    m_kalman->H(1, 1) = 1.0;
    m_kalman->H(2, 2) = 1.0;

    resetFutureKalman();
}

RobotFilter::Kalman::Vector RobotFilter::observationFromDetection(const SSL_DetectionRobot &robot)
{
    // translate from sslvision coordinate system
    Kalman::Vector x;
    x(0) = -robot.y() / 1000.0;
    x(1) = robot.x() / 1000.0;
    x(2) = robot.orientation() + M_PI_2;
    x(3) = 0.0;
    x(4) = 0.0;
    x(5) = 0.0;
    return x;
}

void RobotFilter::resetFutureKalman()
{
    m_futureKalman = m_kalman;
    m_futureTime = m_lastTime;

    m_futureKalman->H = Kalman::MatrixM::Zero();
    m_futureKalman->H(0, 3) = 1.0;
    m_futureKalman->H(1, 4) = 1.0;
    m_futureKalman->H(2, 5) = 1.0;
}

// updates the filter to the best possible prediction for the given time
// vision frames are applies permanently that is their timestamps must
// increase monotonically. The same is true for the robot speed estimates,
// with the exception that these are only applied temporarily if they are
// newer than the newest vision frame
void RobotFilter::update(qint64 time)
{
    // apply new vision frames
    bool isVisionUpdated = false;
    while (!m_visionFrames.isEmpty()) {
        VisionFrame &frame = m_visionFrames.first();
        if (frame.time > time) {
            break;
        }

        // only apply radio commands that have reached the robot yet
        foreach (const RadioCommand &command, m_radioCommands) {
            const qint64 commandTime = command.second;
            if (commandTime > frame.time) {
                break;
            }
            predict(commandTime, false, true, false, m_lastRadioCommand);
            m_lastRadioCommand = command;
        }
        invalidateRobotCommand(frame.time);

        predict(frame.time, false, true, frame.switchCamera, m_lastRadioCommand);
        applyVisionFrame(frame);

        isVisionUpdated = true;
        m_visionFrames.removeFirst();
    }
    if (isVisionUpdated || time < m_futureTime) {
        // prediction is rebased on latest vision frame
        resetFutureKalman();
        m_futureRadioCommand = m_lastRadioCommand;
    }

    // only apply radio commands that have reached the robot yet
    foreach (const RadioCommand &command, m_radioCommands) {
        const qint64 commandTime = command.second;
        if (commandTime > time) {
            break;
        }
        // only apply radio commands not used yet
        if (commandTime > m_futureTime) {
            // updates m_futureKalman
            predict(commandTime, true, true, false, m_futureRadioCommand);
            m_futureRadioCommand = command;
        }
    }

    // predict to requested timestep
    predict(time, true, false, false, m_futureRadioCommand);
}

void RobotFilter::invalidateRobotCommand(qint64 time)
{
    // cleanup outdated radio commands
    while (!m_radioCommands.isEmpty()) {
        const RadioCommand &command = m_radioCommands.first();
        if (command.second > time) {
            break;
        }
        m_radioCommands.removeFirst();
    }
}

void RobotFilter::predict(qint64 time, bool updateFuture, bool permanentUpdate, bool cameraSwitched, const RadioCommand &cmd)
{
    // just assume that the prediction step is the same for now and the future
    KalmanHolder& kalman = (updateFuture) ? m_futureKalman : m_kalman;
    const qint64 lastTime = (updateFuture) ? m_futureTime : m_lastTime;
    const double timeDiff = (time - lastTime) * 1E-9;
    Q_ASSERT(timeDiff >= 0);

    // local and global coordinate system are rotated by 90 degree (see processor)
    const float phi = kalman->baseState()(2) - M_PI_2;
    const float v_x = kalman->baseState()(3);
    const float v_y = kalman->baseState()(4);
    const float omega = kalman->baseState()(5);

    // Process state transition: update position with the current speed
    kalman->F(0, 3) = timeDiff;
    kalman->F(1, 4) = timeDiff;
    kalman->F(2, 5) = timeDiff;

    kalman->F(3, 3) = 1;
    kalman->F(4, 4) = 1;
    kalman->F(5, 5) = 1;
    // clear control input
    kalman->u = Kalman::Vector::Zero();
    if (time < cmd.second + 2 * PROCESSOR_TICK_DURATION) {
        // radio commands are intended to be applied over 10ms
        float cmd_interval = (float)std::max(PROCESSOR_TICK_DURATION*1E-9, timeDiff);
        float cmd_omega = cmd.first.output1().omega();

        float cmd_v_s = cmd.first.output1().v_s();
        float cmd_v_f = cmd.first.output1().v_f();

        // predict phi to execution end time
        float cmd_phi = phi + (omega + cmd_omega) / 2 * cmd_interval;
        float cmd_v_x = std::cos(cmd_phi)*cmd_v_s - std::sin(cmd_phi)*cmd_v_f;
        float cmd_v_y = std::sin(cmd_phi)*cmd_v_s + std::cos(cmd_phi)*cmd_v_f;

        float accel_x = (cmd_v_x - v_x)/cmd_interval;
        float accel_y = (cmd_v_y - v_y)/cmd_interval;
        float accel_omega = (cmd_omega - omega)/cmd_interval;

        float bounded_a_x = qBound(-MAX_LINEAR_ACCELERATION, accel_x, MAX_LINEAR_ACCELERATION);
        float bounded_a_y = qBound(-MAX_LINEAR_ACCELERATION, accel_y, MAX_LINEAR_ACCELERATION);
        float bounded_a_omega = qBound(-MAX_ROTATION_ACCELERATION, accel_omega, MAX_ROTATION_ACCELERATION);

        kalman->u(0) = 0;
        kalman->u(1) = 0;
        kalman->u(2) = 0;
        kalman->u(3) = bounded_a_x * timeDiff;
        kalman->u(4) = bounded_a_y * timeDiff;
        kalman->u(5) = bounded_a_omega * timeDiff;
    }

    // prevent rotation speed windup
    if (omega > OMEGA_MAX) {
        kalman->u(5) = std::min<float>(kalman->u(5), OMEGA_MAX - omega);
    } else if (omega < -OMEGA_MAX) {
        kalman->u(5) = std::max<float>(kalman->u(5), -OMEGA_MAX + omega);
    }

    // update covariance jacobian
    kalman->B = kalman->F;

    // Process noise: stddev for acceleration
    // guessed from the accelerations that are possible on average
    const float sigma_a_x = 4.0f;
    const float sigma_a_y = 4.0f;
    // a bit too low, but that speed is nearly impossible all the time
    const float sigma_a_phi = 10.0f;

    // using no position errors (in opposite to the CMDragons model)
    // seems to yield better results in the simulator
    // d = timediff
    // G = (d^2/2, d^2/2, d^2/2, d, d, d)
    // sigma = (x, y, phi, x, y, phi)  (using x = sigma_a_x, ...)
    // Q = GG^T*(diag(sigma)^2)
    Kalman::Vector G;
    G(0) = timeDiff * timeDiff / 2 * sigma_a_x;
    G(1) = timeDiff * timeDiff / 2 * sigma_a_y;
    G(2) = timeDiff * timeDiff / 2 * sigma_a_phi;
    G(3) = timeDiff * sigma_a_x;
    G(4) = timeDiff * sigma_a_y;
    G(5) = timeDiff * sigma_a_phi;

    if (cameraSwitched) {
        // handle small errors in camera alignment
        G(0) += 0.02;
        G(1) += 0.02;
        G(2) += 0.05;
    }

    kalman->Q(0, 0) = G(0) * G(0);
    kalman->Q(0, 3) = G(0) * G(3);
    kalman->Q(3, 0) = G(3) * G(0);
    kalman->Q(3, 3) = G(3) * G(3);

    kalman->Q(1, 1) = G(1) * G(1);
    kalman->Q(1, 4) = G(1) * G(4);
    kalman->Q(4, 1) = G(4) * G(1);
    kalman->Q(4, 4) = G(4) * G(4);

    kalman->Q(2, 2) = G(2) * G(2);
    kalman->Q(2, 5) = G(2) * G(5);
    kalman->Q(5, 2) = G(5) * G(2);
    kalman->Q(5, 5) = G(5) * G(5);

    kalman->predict(permanentUpdate);
    if (permanentUpdate) {
        if (updateFuture) {
            m_futureTime = time;
        } else {
            m_lastTime = time;
        }
    }
}

double RobotFilter::limitAngle(double angle) const
{
    while (angle > M_PI) {
        angle -= 2 * M_PI;
    }
    while (angle < -M_PI) {
        angle += 2 * M_PI;
    }
    return angle;
}

void RobotFilter::applyVisionFrame(const VisionFrame &frame)
{
    if (frame.switchCamera || m_primaryCamera == -1) {
        m_primaryCamera = frame.cameraId;
    }
    if (frame.cameraId == m_primaryCamera) {
        m_lastPrimaryTime = frame.time;
    }

    const float pRot = m_kalman->state()(2);
    const float pRotLimited = limitAngle(pRot);
    if (pRot != pRotLimited) {
        // prevent rotation windup
        m_kalman->modifyState(2, pRotLimited);
    }
    float rot = frame.detection.orientation() + M_PI_2;
    // prevent discontinuities
    float diff = limitAngle(rot - pRotLimited);

    // keep for debugging
    world::RobotPosition p;
    p.set_time(frame.time);
    p.set_p_x(-frame.detection.y() / 1000.0);
    p.set_p_y(frame.detection.x() / 1000.0);
    p.set_phi(pRotLimited + diff);
    p.set_camera_id(frame.cameraId);
    p.set_vision_processing_time(frame.visionProcessingTime);
    m_measurements.append(p);

    m_kalman->z(0) = p.p_x();
    m_kalman->z(1) = p.p_y();
    m_kalman->z(2) = p.phi();

    Kalman::MatrixMM R = Kalman::MatrixMM::Zero();
    if (frame.cameraId == m_primaryCamera) {
        // measurement covariance matrix
        // a good calibration should work with 0.002, 0.002, 0.006
        // however add some safety margin, except for orientation which is a perfect normal distribution
        // for moving robots the safety margin is required, probably to smooth out the robot vibrations
        R(0, 0) = 0.004;
        R(1, 1) = 0.004;
        R(2, 2) = 0.01;
    } else {
        // handle small errors in camera alignment
        // ensure that the measurements don't corrupt the results
        R(0, 0) = 0.02;
        R(1, 1) = 0.02;
        R(2, 2) = 0.03;
    }
    m_kalman->R = R.cwiseProduct(R);
    m_kalman->update();
}

void RobotFilter::get(world::Robot *robot, const FieldTransform &transform, bool noRawData)
{
    float px = m_futureKalman->state()(0);
    float py = m_futureKalman->state()(1);
    float phi = m_futureKalman->state()(2);
    // convert to global coordinates
    float vx = m_futureKalman->state()(3);
    float vy = m_futureKalman->state()(4);
    float omega = m_futureKalman->state()(5);

    phi = transform.applyAngle(phi);
    float transformedPX = transform.applyPosX(px, py);
    float transformedPY = transform.applyPosY(px, py);
    px = transformedPX;
    py = transformedPY;
    float transformedVX = transform.applySpeedX(vx, vy);
    float transformedVY = transform.applySpeedY(vx, vy);
    vx = transformedVX;
    vy = transformedVY;

    robot->set_id(m_id);
    robot->set_p_x(px);
    robot->set_p_y(py);
    robot->set_phi(limitAngle(phi));
    robot->set_v_x(vx);
    robot->set_v_y(vy);
    robot->set_omega(omega);

    if (noRawData) {
        return;
    }

    foreach (const world::RobotPosition &p, m_measurements) {
        world::RobotPosition *np = robot->add_raw();
        np->set_time(p.time());
        float rot;
        np->set_p_x(transform.applyPosX(p.p_x(), p.p_y()));
        np->set_p_y(transform.applyPosY(p.p_x(), p.p_y()));
        rot = transform.applyAngle(p.phi());
        np->set_phi(limitAngle(rot));
        np->set_camera_id(p.camera_id());
        np->set_vision_processing_time(p.vision_processing_time());

        const world::RobotPosition &prevPos = m_lastRaw[np->camera_id()];

        if (prevPos.IsInitialized() && np->time() > prevPos.time()
                && prevPos.time() + 200*1000*1000 > np->time()) {
            np->set_v_x((np->p_x() - prevPos.p_x()) / ((np->time() - prevPos.time()) * 1E-9));
            np->set_v_y((np->p_y() - prevPos.p_y()) / ((np->time() - prevPos.time()) * 1E-9));
            np->set_omega(limitAngle(np->phi() - prevPos.phi()) / ((np->time() - prevPos.time()) * 1E-9));
            np->set_time_diff_scaled((np->time() - prevPos.time()) * 1E-7);
            np->set_system_delay((m_lastTime - np->time()) * 1E-9);
        }
        m_lastRaw[np->camera_id()] = *np;
    }

    m_measurements.clear();
}

// uses the tracked position only based on vision data!!!
float RobotFilter::distanceTo(const SSL_DetectionRobot &robot) const
{
    Eigen::Vector2f b;
    b(0) = -robot.y() / 1000.0;
    b(1) = robot.x() / 1000.0;

    Eigen::Vector2f p;
    p(0) = m_kalman->state()(0);
    p(1) = m_kalman->state()(1);

    return (b - p).norm();
}

void RobotFilter::addVisionFrame(qint32 cameraId, const SSL_DetectionRobot &robot, qint64 time, qint64 visionProcessingTime, bool switchCamera)
{
    m_visionFrames.append(VisionFrame(cameraId, robot, time, visionProcessingTime, switchCamera));
    // only count frames for the primary camera
    if (m_primaryCamera == -1 || m_primaryCamera == cameraId) {
        m_frameCounter++;
    }
}

void RobotFilter::addRadioCommand(const robot::Command &radioCommand, qint64 time)
{
    m_radioCommands.append(qMakePair(radioCommand, time));
}

RobotInfo RobotFilter::getRobotInfo() const
{
    const float DRIBBLER_DIST = 0.08;

    RobotInfo result;
    result.robotPos = Eigen::Vector2f(m_futureKalman->state()(0), m_futureKalman->state()(1));
    float phi = limitAngle(m_futureKalman->state()(2));
    result.dribblerPos = result.robotPos + DRIBBLER_DIST * Eigen::Vector2f(cos(phi), sin(phi));
    result.speed = Eigen::Vector2f(m_futureKalman->state()[3], m_futureKalman->state()[4]);
    result.angularVelocity = m_futureKalman->state()(5);

    result.pastRobotPos = Eigen::Vector2f(m_kalman->state()(0), m_kalman->state()(1));
    phi = limitAngle(m_kalman->state()(2));
    result.pastDribblerPos = result.pastRobotPos + DRIBBLER_DIST * Eigen::Vector2f(cos(phi), sin(phi));

    const auto& cmd = m_lastRadioCommand.first;
    result.chipCommand = cmd.has_kick_style() && cmd.kick_style() == robot::Command::Chip;;
    result.linearCommand = cmd.has_kick_style() && cmd.kick_style() == robot::Command::Linear;
    result.dribblerActive = cmd.has_dribbler() && cmd.dribbler() > 0;
    result.kickPower = cmd.has_kick_power() ? cmd.kick_power() : 0;

    result.identifier = m_id + (m_teamIsYellow ? 0 : 100);

    return result;
}
