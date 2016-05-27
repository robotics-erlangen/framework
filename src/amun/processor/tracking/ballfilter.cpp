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

#include "ballfilter.h"
#include "core/timer.h"
#include <cmath>
#include <random>

BallFilter::BallFilter(const SSL_DetectionBall &ball, qint64 last_time) :
    Filter(last_time),
    m_lastMoveDist(0),
    m_flyFitter(15),
    m_flyResetCounter(0),
    m_flyHeight(0),
    m_flyPushTime(0)
{
    // translate from sslvision coordinate system
    Kalman::Vector x;
    x(0) = -ball.y() / 1000.0;
    x(1) = ball.x() / 1000.0;
    x(2) = 0.0;
    x(3) = 0.0;
    x(4) = 0.0;
    x(5) = 0.0;
    m_kalman = new Kalman(x);

    // we can only observer the position, height is inferred
    m_kalman->H(0, 0) = 1.0;
    m_kalman->H(1, 1) = 1.0;
    m_kalman->H(2, 2) = 1.0;
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
    m_kalman->F(0, 3) = timeDiff;
    m_kalman->F(1, 4) = timeDiff;
    m_kalman->F(2, 5) = timeDiff;
    m_kalman->B = m_kalman->F;

    // simple ball rolling friction estimation
    const float deceleration = 0.4f * timeDiff;
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
    const bool probableShoot = m_lastNearRobotPos.time() + 35*1000*1000 < time
            && time <  m_lastNearRobotPos.time() + 80*1000*1000;
    const float sigma_a_x = (probableShoot) ? 10.f : 4.f;
    const float sigma_a_y = (probableShoot) ? 10.f : 4.f;
    const bool probableChip = m_lastNearRobotPos.time() + 50*1000*1000 < time
            && time <  m_lastNearRobotPos.time() + 100*1000*1000
            && m_flyFitter.pointCount() >= 4;
    const float sigma_a_z = (probableChip) ? 20.f : 4.f;

    if (probableChip && (m_flyPushTime == 0 || m_flyPushTime == m_lastTime) && m_flyHeight > 0) {
        double timePassed = (time - m_lastNearRobotPos.time()) * 1E-9;
        double startSpeed = std::sqrt(2 * 9.81 * m_flyHeight);
        m_kalman->u(5) = startSpeed - 9.81 * timePassed;
        m_kalman->u(2) = (startSpeed + m_kalman->u(5)) / 2 * timePassed;
        m_flyPushTime = m_lastTime;
    }

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

    if (cameraSwitched) {
        // handle small errors in camera alignment
        G(0) += 0.1;
        G(1) += 0.1;
        G(2) += 0.2;
    }
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

//#include <QDebug>

void BallFilter::restartFlyFitting(const world::BallPosition &p)
{
    m_lastNearRobotPos = p;
    m_flyFitter.clear();
    m_flyRawPoints.clear();
    m_flyResetCounter++;
    m_lastMoveDist = 0.f;
    m_flyPushTime = 0;
}

void BallFilter::stopFlyFitting()
{
    m_lastNearRobotPos.Clear();
}

void BallFilter::detectNearRobot(const world::Robot &nearestRobot, const world::BallPosition &p)
{
    const float pz = m_kalman->state()(2);
    // detect whether the ball is near a robot
    if (pz < 0.2f) {
        // not flying above the robots
        Eigen::Vector2f ballPos(p.p_x(), p.p_y());
        Eigen::Vector2f nearestRobotPos(nearestRobot.p_x(), nearestRobot.p_y());
        Eigen::Rotation2D<float> rot(-nearestRobot.phi());
        Eigen::Vector2f delta = rot * (ballPos - nearestRobotPos);

        const float robotRadius = 0.078f;
        const float ballRadius = 0.0215f;
        const float maxDist = 0.02f;

        if (delta(0) < robotRadius + ballRadius + maxDist && delta(0) > robotRadius) {
            m_lastNearRobot = nearestRobot;
            restartFlyFitting(p);
            m_flyResetCounter = 0;
        }
    }
}

auto BallFilter::unprojectBall(QuadraticLeastSquaresFitter &flyFitter,
                               const world::BallPosition &p, const Eigen::Vector3f &cameraPos, bool silent)
        -> std::tuple<Eigen::Vector3f, ProjectionStatus, QuadraticLeastSquaresFitter::QuadraticFitResult>
{
    const float minChipHeight = 0.1f;
    const float minChipDistance = 0.3f;
    const float maxChipHeight = 3.f;
    const float maxChipDistance = 7.f;

    Eigen::Vector3f ball(p.p_x(), p.p_y(), 0);
    QuadraticLeastSquaresFitter::QuadraticFitResult params;
    params.is_valid = false;

    // mapping must be done for every camera!
    if (cameraPos.isZero() || !m_lastNearRobotPos.IsInitialized()
            || m_lastNearRobotPos.time() >= p.time()) {
        return std::make_tuple(ball, ProjectionStatus::IGNORE, params);
    }

    // with a maximum height of 3 meters a chip kick can't fly for more than 2 seconds
    if (p.time() > m_lastNearRobotPos.time() + (qint64)2 * 1000 * 1000 * 1000
            || m_flyResetCounter > 4) {
        return std::make_tuple(ball, ProjectionStatus::STOP, params);
    }

    // unproject ball
    Eigen::Vector2f ballPos(p.p_x(), p.p_y());
    Eigen::Vector2f shotPos(m_lastNearRobotPos.p_x(), m_lastNearRobotPos.p_y());
    Eigen::Vector2f shotDir(std::cos(m_lastNearRobot.phi()), std::sin(m_lastNearRobot.phi()));
    Eigen::Vector2f cameraPosFloor(cameraPos(0), cameraPos(1));

    Eigen::ParametrizedLine<float, 2> shotLine(shotPos, shotDir);
    Eigen::ParametrizedLine<float, 2> projectionLine = Eigen::ParametrizedLine<float, 2>::Through(cameraPosFloor, ballPos);

    float moveDist = shotLine.intersectionParameter(Eigen::Hyperplane<float, 2>(projectionLine));
    float cameraDist = projectionLine.intersectionParameter(Eigen::Hyperplane<float, 2>(shotLine));
    float baseDist = (ballPos - cameraPosFloor).norm();
    float flyHeight = cameraPos(2) * (baseDist - cameraDist) / baseDist;

    //if (!silent) qDebug() << "r" << moveDist << flyHeight;
    flyFitter.addPoint(moveDist, flyHeight);
    // ball bounced
    if (flyHeight < 0 || m_lastMoveDist > moveDist) {
        return std::make_tuple(ball, ProjectionStatus::RESTART, params);
    }
    m_lastMoveDist = moveDist;
    // something strange/unexpected happened
    if (moveDist < 0 || flyHeight > maxChipHeight || moveDist > maxChipDistance) {
        return std::make_tuple(ball, ProjectionStatus::STOP, params);
    }

    // fit on parabola
    params = flyFitter.fit();
    if (!params.is_valid || !std::isfinite(params.a) || params.a == 0) {
        // fitting didn't succeed (yet)
        params.is_valid = false;
        return std::make_tuple(ball, ProjectionStatus::SUCCESS, params);
    }

    // convert from a*x^2+b*x+c to a*(x+d)^2+e
    // e is max flight height, -2d expected chip distance
    float distance = -params.b / params.a;
    float height = params.c - params.a*distance*distance/4;
    //float alpha = atan(params.b);
    //if (!silent) qDebug() << "  s" << distance << height;

    // only use chip with sensible values
    if (height < minChipHeight || height > maxChipHeight
            || distance < minChipDistance || distance > maxChipDistance
            || !std::isfinite(distance) || !std::isfinite(height)) {
        //if (!silent) qDebug() << "pc" << flyFitter.pointCount() << flyFitter.pointLimit();
        if (flyFitter.pointCount() < flyFitter.pointLimit() * 2 / 3) {
            // due to noise it may be neccessary to collect more samples before the fitting
            // yields usable results
            params.is_valid = false;
            return std::make_tuple(ball, ProjectionStatus::SUCCESS, params);
        }
        return std::make_tuple(ball, ProjectionStatus::STOP, params);
    } else {
        Eigen::Vector2f floorPos = shotLine.intersectionPoint(Eigen::Hyperplane<float, 2>(projectionLine));
        if (flyHeight > 0) {
            ball(0) = floorPos(0);
            ball(1) = floorPos(1);
            ball(2) = flyHeight;
        }
        m_flyHeight = height;
        return std::make_tuple(ball, ProjectionStatus::SUCCESS, params);
    }
}

Eigen::Vector3f BallFilter::optimizingUnprojectBall(const world::BallPosition &p, const Eigen::Vector3f &cameraPos)
{
    Eigen::Vector3f ball;
    ProjectionStatus status;
    QuadraticLeastSquaresFitter::QuadraticFitResult fit;
    std::tie(ball, status, fit) = unprojectBall(m_flyFitter, p, cameraPos, false);

    if (status == ProjectionStatus::IGNORE) {
        // ignore it
    } else if (status == ProjectionStatus::STOP) {
        stopFlyFitting();
        //qDebug() << "stop fitting";
    } else if (status == ProjectionStatus::RESTART) {
        restartFlyFitting(p);
        //qDebug() << "restart flight at" << p.p_x() << p.p_y();
    } else if (status == ProjectionStatus::SUCCESS) {
        // remember raw data
        m_flyRawPoints.append(qMakePair(p, cameraPos));
    } else {
        qFatal("must not be called");
    }

    if (status == ProjectionStatus::SUCCESS && m_flyRawPoints.size() >= 8 && fit.is_valid) {
        // keep original values
        const float flyHeight = m_flyHeight;
        float lastMoveDist = m_lastMoveDist;
        float nearRobotPhi = m_lastNearRobot.phi();

        // randomly modify the robots direction
        std::random_device random_source;
        std::mt19937 prng(random_source());
        std::normal_distribution<float> normal_distribution(0, 0.3f / 180.f * M_PI);
        m_lastNearRobot.set_phi(nearRobotPhi + normal_distribution(prng));
        m_lastMoveDist = 0;

        // replay all previous values
        const int pointCount = m_flyFitter.pointCount();
        QuadraticLeastSquaresFitter flyFitterMod(m_flyFitter.pointLimit());

        bool fail = true;
        Eigen::Vector3f mball; // used remember last projected ball and error
        QuadraticLeastSquaresFitter::QuadraticFitResult mfit;
        // only parse the last pointCount points
        for (int i = std::max(0, m_flyRawPoints.size() - pointCount); i < m_flyRawPoints.size(); ++i) {
            auto &p = m_flyRawPoints[i];
            ProjectionStatus mstatus;
            fail = false;
            std::tie(mball, mstatus, mfit) = unprojectBall(flyFitterMod, p.first, p.second, true);
            if (mstatus != ProjectionStatus::SUCCESS) {
                fail = true;
                break;
            }
        }

        // use new phi if the results are better
        if (!fail) {
            const float error = m_flyFitter.calculateError(fit);
            const float merror = flyFitterMod.calculateError(mfit);

            if (merror < error) {
                //qDebug() << "phi updated by" << (m_lastNearRobot.phi() - nearRobotPhi) << merror << error;
                nearRobotPhi = m_lastNearRobot.phi();
                lastMoveDist = m_lastMoveDist;
                m_flyFitter = flyFitterMod;
                ball = mball;
            }
        }

        // fixup the internal state
        m_lastNearRobot.set_phi(nearRobotPhi);
        m_flyHeight = flyHeight;
        m_lastMoveDist = lastMoveDist;
    }

    return ball;
}

void BallFilter::applyVisionFrame(const VisionFrame &frame)
{
    // keep for debugging
    world::BallPosition p;
    p.set_time(frame.time);
    p.set_p_x(-frame.detection.y() / 1000.0);
    p.set_p_y(frame.detection.x() / 1000.0);
    p.set_camera_id(frame.cameraId);

    detectNearRobot(frame.nearestRobot, p);
    Eigen::Vector3f ball = optimizingUnprojectBall(p, frame.cameraPos);

    m_kalman->z(0) = ball(0);
    m_kalman->z(1) = ball(1);
    m_kalman->z(2) = ball(2);

    p.set_derived_z(ball(2));
    m_measurements.append(p);

    // measurement covariance matrix
    Kalman::MatrixMM R = Kalman::MatrixMM::Zero();
    if (frame.cameraId == m_primaryCamera) {
        // a good calibration should also work with 0.002 0.002 or a bit less
        // if the ball isn't moving then 0.001 0.001 should be enough
        R(0, 0) = 0.003;
        R(1, 1) = 0.003;
    } else {
        // handle small errors in camera alignment
        R(0, 0) = 0.05;
        R(1, 1) = 0.05;
    }
    if (ball(2) != 0) {
        R(2, 2) = 0.05;
    } else {
        R(2, 2) = 0.001;
    }
    m_kalman->R = R.cwiseProduct(R);
    m_kalman->update();

    m_lastTime = frame.time;
}

void BallFilter::get(world::Ball *ball, bool flip, bool noRawData)
{
    float px = m_kalman->state()(0);
    float py = m_kalman->state()(1);
    float pz = m_kalman->state()(2);
    float vx = m_kalman->state()(3);
    float vy = m_kalman->state()(4);
    float vz = m_kalman->state()(5);

    if (flip) {
        px = -px;
        py = -py;
        vx = -vx;
        vy = -vy;
    }

    ball->set_p_x(px);
    ball->set_p_y(py);
    ball->set_p_z(pz);
    ball->set_v_x(vx);
    ball->set_v_y(vy);
    ball->set_v_z(vz);

    if (noRawData) {
        return;
    }

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
        np->set_derived_z(p.derived_z());
        np->set_camera_id(p.camera_id());

        const world::BallPosition &prevBall = m_lastRaw[np->camera_id()];

        if (prevBall.IsInitialized() && np->time() > prevBall.time()
                && prevBall.time() + 200*1000*1000 > np->time()) {
            np->set_v_x((np->p_x() - prevBall.p_x()) / ((np->time() - prevBall.time()) * 1E-9));
            np->set_v_y((np->p_y() - prevBall.p_y()) / ((np->time() - prevBall.time()) * 1E-9));
            np->set_time_diff_scaled((np->time() - prevBall.time()) * 1E-7);
            np->set_system_delay((Timer::systemTime() - np->time()) * 1E-9);
        }
        m_lastRaw[np->camera_id()] = *np;
    }

    m_measurements.clear();
}

float BallFilter::distanceTo(const SSL_DetectionBall &ball, const Eigen::Vector3f &cameraPos) const
{
    float pos_x, pos_y;
    if (!cameraPos.isZero()) {
        float height = m_kalman->state()(2);
        pos_x = (m_kalman->state()(0) - cameraPos(0)) * (cameraPos(2) / (cameraPos(2) - height)) + cameraPos(0);
        pos_y = (m_kalman->state()(1) - cameraPos(1)) * (cameraPos(2) / (cameraPos(2) - height)) + cameraPos(1);
    } else {
        pos_x = m_kalman->state()(0);
        pos_y = m_kalman->state()(1);
    }

    Eigen::Vector2f b;
    b(0) = -ball.y() / 1000.0;
    b(1) = ball.x() / 1000.0;

    Eigen::Vector2f p;
    p(0) = pos_x;
    p(1) = pos_y;

    //qDebug() << "distance to" << b(0) << b(1) << p(0) << p(1);
    //qDebug() << "internal state" << m_kalman->state()(0) << m_kalman->state()(1) << m_kalman->state()(2);

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

void BallFilter::addVisionFrame(qint32 cameraId, const Eigen::Vector3f &cameraPos,
                                const SSL_DetectionBall &ball, qint64 time, const world::Robot &nearestRobot)
{
    m_visionFrames.append(VisionFrame(cameraId, cameraPos, ball, time, nearestRobot));
    // only count frames for the primary camera
    if (m_primaryCamera == -1 || m_primaryCamera == cameraId) {
        m_frameCounter++;
    }
}
