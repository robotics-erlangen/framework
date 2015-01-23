/***************************************************************************
 *   Copyright 2014 Michael Eischer, Philipp Nordhus                       *
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

#include "ballfilter.h"
#include "core/timer.h"

BallFilter::BallFilter(const SSL_DetectionBall &ball, qint64 last_time) :
    Filter(last_time),
    m_time(0)
{
    // translate from sslvision coordinate system
    Kalman::Vector x;
    x(0) = -ball.y() / 1000.0;
    x(1) = ball.x() / 1000.0;
    x(2) = 0.0;
    x(3) = 0.0;
    m_kalman = new Kalman(x);

    // we can only observer the position
    m_kalman->H(0, 0) = 1.0;
    m_kalman->H(1, 1) = 1.0;
}

BallFilter::~BallFilter()
{
    delete m_kalman;
}

void BallFilter::update(qint64 time)
{
    // apply new vision frames
    while (!m_visionFrames.isEmpty()) {
        VisionFrame &frame = m_visionFrames.first();
        if (frame.time > time) {
            break;
        }

        // switch to the new camera if the primary camera data is too old
        bool cameraSwitched = checkCamera(frame.cameraId, frame.time);
        predict(frame.time, cameraSwitched);
        applyVisionFrame(frame);

        m_visionFrames.removeFirst();
    }

    // predict to requested timestep
    predict(time, false);
}

void BallFilter::predict(qint64 time, bool cameraSwitched)
{
    const double timeDiff = (time  - m_lastTime) / 1E9;
    Q_ASSERT(timeDiff >= 0);

    // used to update position with current speed
    m_kalman->F(0, 2) = timeDiff;
    m_kalman->F(1, 3) = timeDiff;
    m_kalman->B = m_kalman->F;

    // simple ball rolling friction estimation
    const float deceleration = 0.4f * timeDiff;
    const Kalman::Vector d = m_kalman->state(); // should actually use m_x not m_xm
    const double v = std::sqrt(d(2) * d(2) + d(3) * d(3));
    const double phi = std::atan2(d(3), d(2));
    if (v < deceleration) {
        m_kalman->u(0) = -v * std::cos(phi) * timeDiff;
        m_kalman->u(1) = -v * std::sin(phi) * timeDiff;
        m_kalman->u(2) = -d(2);
        m_kalman->u(3) = -d(3);
    } else {
        m_kalman->u(0) = -deceleration * std::cos(phi) * timeDiff;
        m_kalman->u(1) = -deceleration * std::sin(phi) * timeDiff;
        m_kalman->u(2) = -deceleration * std::cos(phi);
        m_kalman->u(3) = -deceleration * std::sin(phi);
    }

    // Process noise: stddev for acceleration
    // just a random guess
    const float sigma_a_x = 4.f;
    const float sigma_a_y = 4.f;

    // d = timediff
    // G = (d^2/2, d^2/2, d, d)
    // sigma = (x, y, x, y)  (using x = sigma_a_x, ...)
    // Q = GG^T*(diag(sigma)^2)
    Kalman::Vector G;
    G(0) = timeDiff * timeDiff / 2 * sigma_a_x;
    G(1) = timeDiff * timeDiff / 2 * sigma_a_y;
    G(2) = timeDiff * sigma_a_x;
    G(3) = timeDiff * sigma_a_y;

    if (cameraSwitched) {
        // handle small errors in camera alignment
        G(0) += 0.02;
        G(1) += 0.02;
    }

    m_kalman->Q(0, 0) = G(0) * G(0);
    m_kalman->Q(0, 2) = G(0) * G(2);
    m_kalman->Q(2, 0) = G(2) * G(0);
    m_kalman->Q(2, 2) = G(2) * G(2);

    m_kalman->Q(1, 1) = G(1) * G(1);
    m_kalman->Q(1, 3) = G(1) * G(3);
    m_kalman->Q(3, 1) = G(3) * G(1);
    m_kalman->Q(3, 3) = G(3) * G(3);

    m_kalman->predict(false);
}

void BallFilter::applyVisionFrame(const VisionFrame &frame)
{
    // keep for debugging
    world::BallPosition p;
    p.set_time(frame.time);
    p.set_p_x(-frame.detection.y() / 1000.0);
    p.set_p_y(frame.detection.x() / 1000.0);
    m_measurements.append(p);

    m_kalman->z(0) = p.p_x();
    m_kalman->z(1) = p.p_y();

    // measurement covariance matrix
    Kalman::MatrixMM R = Kalman::MatrixMM::Zero();
    if (frame.cameraId == m_primaryCamera) {
        // a good calibration should also work with 0.002 0.002 or a bit less
        // if the ball isn't moving then 0.001 0.001 should be enough
        R(0, 0) = 0.003;
        R(1, 1) = 0.003;
    } else {
        // handle small errors in camera alignment
        R(0, 0) = 0.02;
        R(1, 1) = 0.02;
    }
    m_kalman->R = R.cwiseProduct(R);
    m_kalman->update();

    m_lastTime = frame.time;
}

void BallFilter::get(world::Ball *ball, bool flip)
{
    float px = m_kalman->state()(0);
    float py = m_kalman->state()(1);
    float vx = m_kalman->state()(2);
    float vy = m_kalman->state()(3);

    if (flip) {
        px = -px;
        py = -py;
        vx = -vx;
        vy = -vy;
    }

    ball->set_p_x(px);
    ball->set_p_y(py);
    ball->set_v_x(vx);
    ball->set_v_y(vy);

    foreach (const world::BallPosition &p, m_measurements) {
        world::BallPosition *np = ball->add_raw();
        np->set_time(p.time());
        if (flip) {
            np->set_p_x(-p.p_x());
            np->set_p_y(-p.p_y());
        } else {
            np->set_p_x(p.p_x());
            np->set_p_y(p.p_y());
        }

        if (m_time != 0 && np->time() > m_time) {
            np->set_v_x((np->p_x() - m_x) / ((np->time() - m_time) * 1E-9));
            np->set_v_y((np->p_y() - m_y) / ((np->time() - m_time) * 1E-9));
            np->set_time_diff_scaled((np->time() - m_time) * 1E-7);
            np->set_system_delay((Timer::systemTime() - np->time()) * 1E-9);
        }
        m_time = np->time();
        m_x = np->p_x();
        m_y = np->p_y();
    }

    m_measurements.clear();
}

float BallFilter::distanceTo(const SSL_DetectionBall &ball) const
{
    Eigen::Vector2f b;
    b(0) = -ball.y() / 1000.0;
    b(1) = ball.x() / 1000.0;

    Eigen::Vector2f p;
    p(0) = m_kalman->state()(0);
    p(1) = m_kalman->state()(1);

    return (b - p).norm();
}

bool BallFilter::isInAOI(const SSL_DetectionBall &ball, bool flip, float x1, float y1, float x2, float y2)
{
    float x = -ball.y() / 1000.0f;
    float y = ball.x() / 1000.0f;

    if (flip) {
        x = -x;
        y = -y;
    }

    return (x > x1 && x < x2 && y > y1 && y < y2);
}

void BallFilter::addVisionFrame(quint32 cameraId, const SSL_DetectionBall &ball, qint64 time)
{
    m_visionFrames.append(VisionFrame(cameraId, ball, time));
    // only count frames for the primary camera
    if (m_primaryCamera == -1 || m_primaryCamera == cameraId) {
        m_frameCounter++;
    }
}
