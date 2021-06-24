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
#include "ballgroundcollisionfilter.h"
#include <random>

BallTracker::BallTracker(const SSL_DetectionBall &ball, qint64 last_time, qint32 primaryCamera, CameraInfo *cameraInfo,
                         RobotInfo robotInfo, qint64 visionProcessingTime, const FieldTransform &transform) :
    Filter(last_time),
    m_lastUpdateTime(last_time),
    m_cameraInfo(cameraInfo),
    m_initTime(last_time),
    m_lastFrameTime(0),
    m_confidence(0),
    m_updateFrameCounter(0),
    m_cachedDistToCamera(0)
{
    m_primaryCamera = primaryCamera;
    VisionFrame frame(ball, last_time, primaryCamera, robotInfo, visionProcessingTime);
    m_groundFilter = new BallGroundCollisionFilter(frame, cameraInfo, transform);
    m_flyFilter = new FlyFilter(frame, cameraInfo, transform);
}

BallTracker::BallTracker(const BallTracker& previousFilter, qint32 primaryCamera) :
    Filter(previousFilter.lastUpdate()),
    m_lastUpdateTime(previousFilter.m_lastUpdateTime),
    m_cameraInfo(previousFilter.m_cameraInfo),
    m_initTime(previousFilter.m_initTime),
    m_lastBallPos(previousFilter.m_lastBallPos),
    m_lastFrameTime(previousFilter.m_lastFrameTime),
    m_confidence(previousFilter.m_confidence),
    m_updateFrameCounter(previousFilter.m_updateFrameCounter),
    m_cachedDistToCamera(0)
{
    m_primaryCamera = primaryCamera;

    m_flyFilter = new FlyFilter(*previousFilter.m_flyFilter);
    m_flyFilter->moveToCamera(primaryCamera);
    m_groundFilter = new BallGroundCollisionFilter(*previousFilter.m_groundFilter, primaryCamera);
}

BallTracker::~BallTracker()
{
    delete m_flyFilter;
    delete m_groundFilter;
}

bool BallTracker::acceptDetection(const SSL_DetectionBall& ball, qint64 time, qint32 cameraId, RobotInfo robotInfo, qint64 visionProcessingTime)
{
    VisionFrame frame(ball, time, cameraId, robotInfo, visionProcessingTime);
    bool accept = m_flyFilter->acceptDetection(frame) || m_groundFilter->acceptDetection(frame);
    debug("accept", accept);
    debug("acceptId", cameraId);
    debug("age", std::to_string(initTime()).c_str());
    debug("confidence", m_confidence);
    return accept;
}

void BallTracker::calcDistToCamera(bool flying)
{
    Eigen::Vector3f cam = m_cameraInfo->cameraPosition.value(m_primaryCamera);
    float dist = (m_lastBallPos - Eigen::Vector2f(cam(0), cam(1))).norm();
    if (flying && m_flyFilter->isActive()) {
        dist = m_flyFilter->distToStartPos();
    }

    debug("dist", dist);
    m_cachedDistToCamera = dist;
}

float BallTracker::cachedDistToCamera()
{
    return m_cachedDistToCamera;
}

bool BallTracker::isFlying() const
{
    return m_flyFilter->isActive();
}

bool BallTracker::isShot() const
{
    return m_flyFilter->isShot();
}

void BallTracker::updateConfidence()
{
    m_confidence = 0.98 * m_confidence + 0.02 * double(m_updateFrameCounter);
    m_updateFrameCounter = 0;
}

void BallTracker::update(qint64 time)
{
    // apply new vision frames
    while (!m_visionFrames.isEmpty()) {

        if (m_visionFrames.first().time > time) {
            break; // try again later
        }

        // collect all frames with the same time, originating from the same camera image
        // only one of these can be the real ball, so let the filters choose which one to use
        std::vector<VisionFrame> sameTimeFrames;
        sameTimeFrames.push_back(m_visionFrames.first());
        m_visionFrames.removeFirst();
        m_rawMeasurements.append(sameTimeFrames.back());
        while (m_visionFrames.size() > 0 && m_visionFrames.first().time == sameTimeFrames.back().time) {
            sameTimeFrames.push_back(m_visionFrames.first());
            m_visionFrames.removeFirst();
            m_rawMeasurements.append(sameTimeFrames.back());
        }

        m_flyFilter->processVisionFrame(sameTimeFrames[m_flyFilter->chooseBall(sameTimeFrames)]);
        std::size_t chosenGroundFrame = m_groundFilter->chooseBall(sameTimeFrames);
        m_groundFilter->processVisionFrame(sameTimeFrames[chosenGroundFrame]);

        m_lastFrameTime = sameTimeFrames[0].time;
        m_lastTime = time;
        m_lastBallPos = Eigen::Vector2f(sameTimeFrames[chosenGroundFrame].x, sameTimeFrames[chosenGroundFrame].y);
    }
    m_lastUpdateTime = time;
#ifdef ENABLE_TRACKING_DEBUG
    m_debug.MergeFrom(m_groundFilter->debugValues());
    m_groundFilter->clearDebugValues();
    m_debug.MergeFrom(m_flyFilter->debugValues());
    m_flyFilter->clearDebugValues();
#endif
}

void BallTracker::get(world::Ball *ball, const FieldTransform &transform, bool resetRaw, const QVector<RobotInfo> &robots)
{
    ball->set_is_bouncing(false); // fly filter overwrites if appropriate

    // IMPORTANT: the ground filter must be written to ball before the fly filter is executed (it sometimes uses parts of the ground filter results)
    m_groundFilter->writeBallState(ball, m_lastUpdateTime, robots);
    if (m_flyFilter->isActive()) {
        debug("active", "fly filter");
        m_flyFilter->writeBallState(ball, m_lastUpdateTime, robots);
    } else {
        debug("active", "ground filter");
    }

    float transformedPX = transform.applyPosX(ball->p_x(), ball->p_y());
    float transformedPY = transform.applyPosY(ball->p_x(), ball->p_y());
    ball->set_p_x(transformedPX);
    ball->set_p_y(transformedPY);
    float transformedVX = transform.applySpeedX(ball->v_x(), ball->v_y());
    float transformedVY = transform.applySpeedY(ball->v_x(), ball->v_y());
    ball->set_v_x(transformedVX);
    ball->set_v_y(transformedVY);
    if (ball->has_touchdown_x() && ball->has_touchdown_y()) {
        float transformedTX = transform.applyPosX(ball->touchdown_x(), ball->touchdown_y());
        float transformedTY = transform.applyPosY(ball->touchdown_x(), ball->touchdown_y());
        ball->set_touchdown_x(transformedTX);
        ball->set_touchdown_y(transformedTY);
    }

    for (auto& frame: m_rawMeasurements) {
        world::BallPosition* raw = ball->add_raw();
        raw->set_time(frame.time);
        raw->set_p_x(transform.applyPosX(frame.x, frame.y));
        raw->set_p_y(transform.applyPosY(frame.x, frame.y));

        raw->set_camera_id(frame.cameraId);
        raw->set_area(frame.ballArea);
        raw->set_vision_processing_time(frame.visionProcessingTime);
    }
    if (resetRaw) {
        m_rawMeasurements.clear();
    }
}

void BallTracker::addVisionFrame(const SSL_DetectionBall &ball, qint64 time, qint32 cameraId, RobotInfo robotInfo, qint64 visionProcessingTime)
{
    m_lastTime = time;
    m_visionFrames.append(VisionFrame(ball, time, cameraId, robotInfo, visionProcessingTime));
    m_frameCounter++;
    m_updateFrameCounter++;
}

bool BallTracker::isFeasiblyInvisible() const
{
    if (m_flyFilter->isActive()) {
        return false;
    } else {
        return m_groundFilter->isFeasiblyInvisible();
    }
}
