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

#include "balltracker.h"
#include "ballflyfilter.h"
#include "ballgroundfilter.h"
#include <random>

BallTracker::BallTracker(const SSL_DetectionBall &ball, qint64 last_time, qint32 primaryCamera, CameraInfo *cameraInfo, Eigen::Vector2f dribblerPos, Eigen::Vector2f robotPos) :
    Filter(last_time),
    m_lastUpdateTime(last_time),
    m_cameraInfo(cameraInfo),
    m_initTime(last_time),
    m_lastFrameTime(0)
{
    m_primaryCamera = primaryCamera;
    VisionFrame frame(ball, last_time, primaryCamera, dribblerPos, robotPos);
    m_groundFilter = new GroundFilter(frame, cameraInfo);
    // TODO collision filter
    m_flyFilter = new FlyFilter(frame, cameraInfo);

    m_activeFilter = m_groundFilter;
}

BallTracker::BallTracker(const BallTracker& previousFilter, qint32 primaryCamera) :
    Filter(previousFilter.lastUpdate()),
    m_lastUpdateTime(previousFilter.m_lastUpdateTime),
    m_cameraInfo(previousFilter.m_cameraInfo),
    m_initTime(previousFilter.m_initTime),
    m_lastBallPos(previousFilter.m_lastBallPos),
    m_lastFrameTime(previousFilter.m_lastFrameTime)
{
    m_primaryCamera = primaryCamera;

    m_flyFilter = new FlyFilter(*previousFilter.m_flyFilter, primaryCamera);
    m_groundFilter = new GroundFilter(*previousFilter.m_groundFilter, primaryCamera);
    if (dynamic_cast<FlyFilter*>(previousFilter.m_activeFilter)) {
        m_activeFilter = m_flyFilter;
    } else {
        m_activeFilter = m_groundFilter;
    }
}

BallTracker::~BallTracker()
{
    delete m_flyFilter;
    delete m_groundFilter;
}

bool BallTracker::acceptDetection(const SSL_DetectionBall& ball, qint64 time, qint32 cameraId, Eigen::Vector2f dribblerPos)
{
    VisionFrame frame(ball, time, cameraId, dribblerPos, dribblerPos);
    bool accept = m_flyFilter->acceptDetection(frame) || m_groundFilter->acceptDetection(frame);
    debug("accept", accept);
    debug("acceptId", cameraId);
    return accept;
}

float BallTracker::distToCamera(bool flying)
{
    Eigen::Vector3f cam = m_cameraInfo->cameraPosition.value(m_primaryCamera);
    float dist = (m_lastBallPos - Eigen::Vector2f(cam(0), cam(1))).norm();
    if (flying && m_flyFilter->isActive()) {
        dist = m_flyFilter->distToStartPos();
    }
    debug("dist", dist);
    return dist;
}

bool BallTracker::isFlying() const
{
    return m_flyFilter->isActive();
}

bool BallTracker::isShot() const
{
    return m_flyFilter->isShot();
}

void BallTracker::update(qint64 time)
{
    // apply new vision frames
    while (!m_visionFrames.isEmpty()) {
        VisionFrame &frame = m_visionFrames.first();
        if (frame.time == m_lastFrameTime) {
            // TODO how does this happen?
            //qDebug() << m_lastFrameTime;
            m_visionFrames.removeFirst();
            continue;

        }
        if (frame.time > time) {
            return; // try again later
        }

        m_flyFilter->processVisionFrame(frame);
        m_groundFilter->processVisionFrame(frame);
        m_rawMeasurements.append(frame);

        m_visionFrames.removeFirst();
        m_lastFrameTime = frame.time;
        m_lastTime = time;
        m_lastBallPos = Eigen::Vector2f(frame.x, frame.y);
    }
    m_lastUpdateTime = time;
#ifdef ENABLE_TRACKING_DEBUG
    m_debug.MergeFrom(m_groundFilter->debugValues());
    m_groundFilter->clearDebugValues();
    m_debug.MergeFrom(m_flyFilter->debugValues());
    m_flyFilter->clearDebugValues();
#endif
}

void BallTracker::get(world::Ball *ball, bool flip)
{
    ball->set_is_bouncing(false); // fly filter overwrites if appropriate
    if (m_flyFilter->isActive()) {
        debug("active", "fly filter");
        m_activeFilter = m_flyFilter;
    } else {
        debug("active", "ground filter");
        m_activeFilter = m_groundFilter;
    }

    m_groundFilter->writeBallState(ball, m_lastUpdateTime);
    if (m_activeFilter == m_flyFilter) {
        m_activeFilter->writeBallState(ball, m_lastUpdateTime);
    }

    if (flip) {
        ball->set_p_x(-ball->p_x());
        ball->set_p_y(-ball->p_y());
        ball->set_v_x(-ball->v_x());
        ball->set_v_y(-ball->v_y());
    }
    for (auto& frame: m_rawMeasurements) {
        world::BallPosition* raw = ball->add_raw();
        raw->set_time(frame.time);
        if (flip) {
            raw->set_p_x(-frame.x);
            raw->set_p_y(-frame.y);
        } else {
            raw->set_p_x(frame.x);
            raw->set_p_y(frame.y);
        }

        raw->set_camera_id(frame.cameraId);
        raw->set_area(frame.ballArea);
    }
    m_rawMeasurements.clear();
}

void BallTracker::addVisionFrame(const SSL_DetectionBall &ball, qint64 time, qint32 cameraId, Eigen::Vector2f dribblerPos, Eigen::Vector2f robotPos)
{
    m_lastTime = time;
    m_visionFrames.append(VisionFrame(ball, time, cameraId, dribblerPos, robotPos));
    m_frameCounter++;
}
