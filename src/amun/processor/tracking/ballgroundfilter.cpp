/***************************************************************************
 *   Copyright 2020 Alexander Danzer, Andreas Wendler                      *
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

#include "ballgroundfilter.h"
#include <QDebug>

// TODO maybe exclude z axis from kalman filter

GroundFilter::GroundFilter(const VisionFrame& frame, CameraInfo* cameraInfo, const FieldTransform &transform, const world::BallModel &ballModel) :
    AbstractBallFilter(frame, cameraInfo, transform, ballModel)
{
    reset(frame);
}

GroundFilter::GroundFilter(const GroundFilter& groundFilter, qint32 primaryCamera) :
    AbstractBallFilter(groundFilter, primaryCamera),
    m_kalman(new Kalman(*groundFilter.m_kalman)),
    m_lastUpdate(groundFilter.m_lastUpdate)
{ }

void GroundFilter::reset(const VisionFrame& frame)
{
    Kalman::Vector x(Kalman::Vector::Zero());
    x(0) = frame.x;
    x(1) = frame.y;
    m_kalman.reset(new Kalman(x));
    m_kalman->H = Kalman::MatrixM::Identity();

    // a good calibration should also work with 0.002 0.002 or a bit less
    // if the ball isn't moving then 0.001 0.001 should be enough
    setObservationStdDev(0.003f);

    m_lastUpdate = frame.time;
}

void GroundFilter::setSpeed(Eigen::Vector2f speed)
{
    m_kalman->modifyState(3, speed.x());
    m_kalman->modifyState(4, speed.y());
}

void GroundFilter::predict(qint64 time)
{
    if (time == m_lastUpdate) {
        return;
    }
    const double timeDiff = (time  - m_lastUpdate) * 1E-9;
    Q_ASSERT(timeDiff > 0);


    // used to update position with current speed
    m_kalman->F(0, 3) = timeDiff;
    m_kalman->F(1, 4) = timeDiff;
    m_kalman->F(2, 5) = timeDiff;
    m_kalman->B = m_kalman->F;

    // simple ball rolling friction estimation
    const float deceleration = m_ballModel.slow_deceleration() * timeDiff;
    const Kalman::Vector d = m_kalman->baseState();
    const double v = std::sqrt(d(3) * d(3) + d(4) * d(4));
    const double phi = std::atan2(d(4), d(3));
    if (v < deceleration) {
        m_kalman->u(0) = -v * std::cos(phi) * timeDiff/2;
        m_kalman->u(1) = -v * std::sin(phi) * timeDiff/2;
        m_kalman->u(3) = -d(3)/2;
        m_kalman->u(4) = -d(4)/2;
        // only a moving ball can fly
        m_kalman->u(2) = -d(2)/2;
        m_kalman->u(5) = -d(5)/2;
    } else {
        if (d(2) < 0.1f) {
            // rolling
            m_kalman->u(0) = -deceleration * std::cos(phi) * timeDiff/2;
            m_kalman->u(1) = -deceleration * std::sin(phi) * timeDiff/2;
            m_kalman->u(3) = -deceleration * std::cos(phi);
            m_kalman->u(4) = -deceleration * std::sin(phi);
            m_kalman->u(2) = -d(2)/2;
            m_kalman->u(5) = -d(5)/2;
        } else {
            m_kalman->u(0) = 0;
            m_kalman->u(1) = 0;
            m_kalman->u(3) = 0;
            m_kalman->u(4) = 0;
            m_kalman->u(2) = -9.81 * timeDiff * timeDiff/2;
            m_kalman->u(5) = -9.81 * timeDiff;
        }
    }

    // Process noise: stddev for acceleration
    // just a random guess
    const bool probableShoot = false;
    const float sigma_a_x = (probableShoot) ? 10.f : 4.f;
    const float sigma_a_y = (probableShoot) ? 10.f : 4.f;
    const bool probableChip = false;
    const float sigma_a_z = (probableChip) ? 20.f : 4.f;


    // d = timediff
    // G = (d^2/2, d^2/2, d, d)
    // sigma = (x, y, x, y)  (using x = sigma_a_x, ...)
    // Q = GG^T*(diag(sigma)^2)
    Kalman::Vector G;
    G(0) = timeDiff * timeDiff / 2 * sigma_a_x;
    G(1) = timeDiff * timeDiff / 2 * sigma_a_y;
    G(2) = timeDiff * timeDiff / 2 * sigma_a_z;
    G(3) = timeDiff * sigma_a_x;
    G(4) = timeDiff * sigma_a_y;
    G(5) = timeDiff * sigma_a_z;

    if (probableShoot) {
        G(0) += 0.1;
        G(1) += 0.1;
    }
    if (probableChip) {
        G(2) += 0.1;
    }

    m_kalman->Q(0, 0) = G(0) * G(0);
    m_kalman->Q(0, 3) = G(0) * G(3);
    m_kalman->Q(3, 0) = G(3) * G(0);
    m_kalman->Q(3, 3) = G(3) * G(3);

    m_kalman->Q(1, 1) = G(1) * G(1);
    m_kalman->Q(1, 4) = G(1) * G(4);
    m_kalman->Q(4, 1) = G(4) * G(1);
    m_kalman->Q(4, 4) = G(4) * G(4);

    m_kalman->Q(2, 2) = G(2) * G(2);
    m_kalman->Q(2, 5) = G(2) * G(5);
    m_kalman->Q(5, 2) = G(5) * G(2);
    m_kalman->Q(5, 5) = G(5) * G(5);

    m_kalman->predict(false);
}

void GroundFilter::setObservationStdDev(float deviation)
{
    // measurement covariance matrix
    Kalman::MatrixMM R = Kalman::MatrixMM::Zero();
    R(0, 0) = deviation;
    R(1, 1) = deviation;
    m_kalman->R = R.cwiseProduct(R); // squares all entries
}

void GroundFilter::processVisionFrame(const VisionFrame& frame)
{
    predict(frame.time);

    // linearGroundFilter
    m_kalman->z(0) = frame.x;
    m_kalman->z(1) = frame.y;

    m_kalman->update();
    m_lastUpdate = frame.time;
}

float GroundFilter::distanceTo(Eigen::Vector2f objPos) const
{
    Eigen::Vector2f estimatedPos(m_kalman->state()(0), m_kalman->state()(1));
    return (objPos - estimatedPos).norm();
}


//float BallTracker::mahalanobisDistance(const SSL_DetectionBall &ball, qint64 time)
//{
//    // x: state without sample at time
//    // y: state with sample at time
//    // d = (x-y)^T * Q^-1 * (x-y)
//    return 0;
//}


void GroundFilter::writeBallState(world::Ball *ball, qint64 time, const QVector<RobotInfo> &, qint64)
{
    predict(time);

    ball->set_p_x(m_kalman->state()(0));
    ball->set_p_y(m_kalman->state()(1));
    ball->set_p_z(m_kalman->state()(2));
    ball->set_v_x(m_kalman->state()(3));
    ball->set_v_y(m_kalman->state()(4));
    ball->set_v_z(m_kalman->state()(5));
}


