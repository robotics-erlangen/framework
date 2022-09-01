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

#include "tracker.h"
#include "balltracker.h"
#include "protobuf/ssl_wrapper.pb.h"
#include "robotfilter.h"
#include "protobuf/debug.pb.h"
#include "protobuf/geometry.h"
#include "core/fieldtransform.h"
#include <QDebug>
#include <iostream>
#include <limits>

Tracker::Tracker(bool robotsOnly, bool isSpeedTracker) :
    m_cameraInfo(new CameraInfo),
    m_systemDelay(0),
    m_timeSinceLastReset(0),
    m_geometryUpdated(false),
    m_hasVisionData(false),
    m_virtualFieldEnabled(false),
    m_lastSlowVisionFrame(0),
    m_numSlowVisionFrames(0),
    m_currentBallFilter(nullptr),
    m_aoiEnabled(false),
    m_aoi_x1(0.0f),
    m_aoi_y1(0.0f),
    m_aoi_x2(0.0f),
    m_aoi_y2(0.0f),
    m_fieldTransform(new FieldTransform),
    m_robotsOnly(robotsOnly),
    m_resetTimeout(isSpeedTracker ? .1E9 : .5E9),
    m_maxTimeLast(isSpeedTracker ? .2E9 : 1E9)
{
    geometrySetDefault(&m_geometry, true);
    geometrySetDefault(&m_virtualFieldGeometry, true);
}

Tracker::~Tracker()
{
    reset();
    delete m_cameraInfo;
}

static bool isInAOI(float detectionX, float detectionY, const FieldTransform &transform, float x1, float y1, float x2, float y2)
{
    float x = -detectionY / 1000.0f;
    float y = detectionX / 1000.0f;
    float xn = transform.applyPosX(x, y);
    float yn = transform.applyPosY(x, y);
    return (xn > x1 && xn < x2 && yn > y1 && yn < y2);
}

void Tracker::reset()
{
    for (const QList<RobotFilter*>& list : m_robotFilterYellow) {
        qDeleteAll(list);
    }
    m_robotFilterYellow.clear();

    for (const QList<RobotFilter*>& list : m_robotFilterBlue) {
        qDeleteAll(list);
    }
    m_robotFilterBlue.clear();

    qDeleteAll(m_ballFilter);
    m_ballFilter.clear();

    m_hasVisionData = false;
    m_timeSinceLastReset = 0;
    m_lastUpdateTime.clear();
    m_visionPackets.clear();
    m_cameraInfo->cameraPosition.clear();
    m_cameraInfo->focalLength.clear();
    m_cameraInfo->cameraSender.clear();
}

void Tracker::setFlip(bool flip)
{
    // used to change goals between blue and yellow
    m_fieldTransform->setFlip(flip);
}

void Tracker::process(qint64 currentTime)
{
    // reset time is used to immediatelly show robots after reset
    if (m_timeSinceLastReset == 0) {
        m_timeSinceLastReset = currentTime;
    }

    // remove outdated ball and robot filters
    invalidateBall(currentTime);
    invalidateRobots(m_robotFilterYellow, currentTime);
    invalidateRobots(m_robotFilterBlue, currentTime);

    for (const Packet &p : m_visionPackets) {
        SSL_WrapperPacket wrapper;
        if (!wrapper.ParseFromArray(p.data.data(), p.data.size())) {
            continue;
        }

        if (wrapper.has_geometry() && !m_robotsOnly) {
            convertFromSSlGeometry(wrapper.geometry().field(), m_geometry);
            for (int i = 0; i < wrapper.geometry().calib_size(); ++i) {
                updateCamera(wrapper.geometry().calib(i), p.sender);
            }
            m_geometryUpdated = true;
        }

        if (!m_robotsOnly) {
            m_detectionWrappers.append({wrapper, p.time});
        }

        if (!wrapper.has_detection()) {
            continue;
        }

        const SSL_DetectionFrame &detection = wrapper.detection();
        const qint64 visionProcessingTime = (detection.t_sent() - detection.t_capture()) * 1E9;

        /* Misconfigured or slow vision computers may produce detection frames
         * with a large processing time. We discard these frames later since
         * they are considered too old to be relevant.
         */
        auto isVisionProcessingSlow = [this, currentTime, visionProcessingTime]() -> bool {
            constexpr qint64 VISION_WARN_TIME = 40 * 1E6; // 40ms to ns
            if (visionProcessingTime >= VISION_WARN_TIME) {
                m_numSlowVisionFrames++;
                m_lastSlowVisionFrame = currentTime;
            }

            /* There may be outliers on the vision computer. We only want to warn
             * if the delay is continously high
             */
            if (m_lastSlowVisionFrame + 10E9 < currentTime) {
                m_numSlowVisionFrames = 0;
            }

            /* There should be around 75 detections per second, warn if one third
             * is bad (25 per second) for around five seconds in a ten second
             * period
             */
            return m_numSlowVisionFrames > 125;
        };

        if (isVisionProcessingSlow()) {
            m_errorMessages.append(QString(
                "<font color=\"red\">WARNING:</font> Multiple vision detection frames with a high processing time. These may be discarded."
            ));

            // Reset to avoid log spam
            m_numSlowVisionFrames = 0;
        }

        // time on the field for which the frame was captured as seen by this computers clock
        const qint64 sourceTime = p.time - visionProcessingTime - m_systemDelay;

        // delayed reset to clear frames older than the reset command
        if (sourceTime > m_timeToReset) {
            m_timeToReset = std::numeric_limits<qint64>::max();
            reset();
            // reset clears out m_visionPackets, we can not continue in the loop
            break;
        }

        // drop frames older than the current state
        if (sourceTime <= m_lastUpdateTime[detection.camera_id()]) {
            continue;
        }

        for (int i = 0; i < detection.robots_yellow_size(); i++) {
            trackRobot(m_robotFilterYellow, detection.robots_yellow(i), sourceTime, detection.camera_id(), visionProcessingTime, true);
        }

        for (int i = 0; i < detection.robots_blue_size(); i++) {
            trackRobot(m_robotFilterBlue, detection.robots_blue(i), sourceTime, detection.camera_id(), visionProcessingTime, false);
        }

        if (!m_robotsOnly) {
            trackBallDetections(detection, sourceTime, visionProcessingTime);

            for (BallTracker * filter : m_ballFilter) {
                filter->updateConfidence();
            }
        }

        m_lastUpdateTime[detection.camera_id()] = sourceTime;
    }
    m_visionPackets.clear();
}

static RobotFilter* bestFilter(QList<RobotFilter*> &filters, int minFrameCount, int desiredCamera)
{
    // Get first filter of the correct camera that has the minFrameCount and move it to the front
    // This is required to ensure a stable result
    // If a filter for the desired camera is not present, use the first otherwise matching (and move it to the front)
    RobotFilter *result = nullptr;
    for (RobotFilter* item : filters) {
        if (item->frameCounter() >= minFrameCount) {
            const bool isCorrectCamera = static_cast<int>(item->primaryCamera()) == desiredCamera;
            if (result == nullptr || isCorrectCamera) {
                result = item;
            }
            if (isCorrectCamera || desiredCamera == -1) {
                break;
            }
        }
    }
    if (result && filters.first() != result) {
        filters.removeOne(result);
        filters.prepend(result);
    }
    return result;
}

void Tracker::prioritizeBallFilters()
{
    // TODO: this ist partially obsolete due to changes in bestBallFilter
    // assures that the one with its camera closest to its last detection is taken.
    bool flying = m_ballFilter.contains(m_currentBallFilter) && m_currentBallFilter->isFlying();

    // cache distance to camera for performance reasons and to avoid
    // that intermediate values have excess precision, which results
    // in unstable comparisons during sort. Either fstDist or sndDist
    // seems to be passed directly via register and thus has too much
    // precision on a x87 fpu which is only used on x32 platforms.

    // when the current filter is tracking a flight, prioritize flight reconstruction
    for (auto &filter: m_ballFilter) {
        filter->calcDistToCamera(flying);
    }

    auto cmp = [ ] ( BallTracker* fst, BallTracker* snd ) -> bool {
        float fstDist = fst->cachedDistToCamera();
        float sndDist = snd->cachedDistToCamera();
        return fstDist < sndDist;
    };
    std::sort(m_ballFilter.begin(), m_ballFilter.end(), cmp);
}

BallTracker* Tracker::bestBallFilter()
{
    const double CONFIDENCE_HYSTERESIS = 0.15;
    const int MIN_RAW_DETECTIONS = 3;
    // find oldest filter. if there are multiple with same initTime
    // (i.e. camera handover filters) this picks the first (prioritized) one.
    BallTracker* best = nullptr;
    qint64 oldestTime = 0;
    double bestConfidence = -1.0;
    for (BallTracker* f : m_ballFilter) {
        if (f->frameCounter() < MIN_RAW_DETECTIONS) {
            continue;
        }
        double confidence = f->confidence() + (m_currentBallFilter == f ? CONFIDENCE_HYSTERESIS : 0.0);
        if (best == nullptr || f->initTime() < oldestTime ||
                (f->initTime() == oldestTime && confidence > bestConfidence)) {
            best = f;
            oldestTime = f->initTime();
            bestConfidence = confidence;
        }
    }
    m_currentBallFilter = best;
    return m_currentBallFilter;
}

static amun::DebugValues* mutable_debug(amun::DebugValues** adv, Status s)
{
    if (nullptr == *adv) {
        *adv = s->add_debug();
        (*adv)->set_source(amun::Tracking);
    }
    return *adv;
}

Status Tracker::worldState(qint64 currentTime, bool resetRaw)
{
    // only return objects which have been tracked for more than minFrameCount frames
    // if the tracker was reset recently, allow for fast repopulation
    const int minFrameCount = (currentTime > m_timeSinceLastReset + m_resetTimeout) ? 5: 0;

    // create world state for the given time
    Status status(new amun::Status);
    world::State *worldState = status->mutable_world_state();
    worldState->set_time(currentTime);
    worldState->set_has_vision_data(m_hasVisionData);
    worldState->set_system_delay(m_systemDelay);

    if (!m_robotsOnly) {
        BallTracker *ball = bestBallFilter();
        if (ball != nullptr) {
            m_desiredRobotCamera = ball->primaryCamera();
        }
    }

    QVector<RobotInfo> robotInfos;
    robotInfos.reserve(m_robotFilterBlue.size() + m_robotFilterYellow.size());
    for(RobotMap::iterator it = m_robotFilterYellow.begin(); it != m_robotFilterYellow.end(); ++it) {
        RobotFilter *robot = bestFilter(*it, minFrameCount, m_desiredRobotCamera);
        if (robot != nullptr) {
            robot->update(currentTime);
            robot->get(worldState->add_yellow(), *m_fieldTransform, false);
            robotInfos.append(robot->getRobotInfo());
        }
    }

    for(RobotMap::iterator it = m_robotFilterBlue.begin(); it != m_robotFilterBlue.end(); ++it) {
        RobotFilter *robot = bestFilter(*it, minFrameCount, m_desiredRobotCamera);
        if (robot != nullptr) {
            robot->update(currentTime);
            robot->get(worldState->add_blue(), *m_fieldTransform, false);
            robotInfos.append(robot->getRobotInfo());
        }
    }

    if (!m_robotsOnly) {
        for (auto &data : m_detectionWrappers) {
            worldState->add_vision_frames()->CopyFrom(data.first);
            worldState->add_vision_frame_times(data.second);
        }
        m_detectionWrappers.clear();

        BallTracker *ball = bestBallFilter();

        if (ball != nullptr) {
            ball->update(currentTime);
            const qint64 lastCameraFrameTime = m_lastUpdateTime[ball->primaryCamera()];
            ball->get(worldState->mutable_ball(), *m_fieldTransform, resetRaw, robotInfos, lastCameraFrameTime);
        }
    }

    if (m_geometryUpdated && !m_robotsOnly) {
        if (m_virtualFieldEnabled) {
            status->mutable_geometry()->CopyFrom(m_virtualFieldGeometry);
        } else {
            status->mutable_geometry()->CopyFrom(m_geometry);
        }
    }

    if (m_aoiEnabled) {
        world::TrackingAOI *aoi = worldState->mutable_tracking_aoi();
        aoi->set_x1(m_aoi_x1);
        aoi->set_y1(m_aoi_y1);
        aoi->set_x2(m_aoi_x2);
        aoi->set_y2(m_aoi_y2);
    }

    amun::DebugValues *debug = nullptr;
#ifdef ENABLE_TRACKING_DEBUG
    for (auto& filter : m_ballFilter) {
        if (filter == m_currentBallFilter) {
            amun::DebugValue *debugValue = mutable_debug(&debug, status)->add_value();
            debugValue->set_key("active cam");
            debugValue->set_float_value(m_currentBallFilter->primaryCamera());
            debug->MergeFrom(filter->debugValues());
        } else {
            mutable_debug(&debug, status)->MergeFrom(filter->debugValues());
        }
        filter->clearDebugValues();
    }
#endif
    if (m_errorMessages.size() > 0 && !m_robotsOnly) {
        for (const QString &message : m_errorMessages) {
            amun::StatusLog *log = mutable_debug(&debug, status)->add_log();
            log->set_timestamp(currentTime);
            log->set_text(message.toStdString());
        }
        m_errorMessages.clear();
    }

    return status;
}

void Tracker::finishProcessing()
{
    m_geometryUpdated = false;
}

void Tracker::updateCamera(const SSL_GeometryCameraCalibration &c, QString sender)
{
    if (!c.has_derived_camera_world_tx() || !c.has_derived_camera_world_ty()
            || !c.has_derived_camera_world_tz()) {
        return;
    }

    auto lastSender = m_cameraInfo->cameraSender.find(c.camera_id());
    if (lastSender != m_cameraInfo->cameraSender.end() && *lastSender != sender) {
        m_errorMessages.append(QString("<font color=\"red\">WARNING: </font> camera %1 is being sent\
                                    from two different vision sources: %2 and %3!").arg(c.camera_id())
                                   .arg(m_cameraInfo->cameraSender[c.camera_id()]).arg(sender));
    }
    Eigen::Vector3f cameraPos;
    cameraPos(0) = -c.derived_camera_world_ty() / 1000.f;
    cameraPos(1) = c.derived_camera_world_tx() / 1000.f;
    cameraPos(2) = c.derived_camera_world_tz() / 1000.f;

    m_cameraInfo->cameraPosition[c.camera_id()] = cameraPos;
    m_cameraInfo->focalLength[c.camera_id()] = c.focal_length();
    m_cameraInfo->cameraSender[c.camera_id()] = sender;
}

void Tracker::invalidateRobotFilter(QList<RobotFilter*> &filters, const qint64 maxTime, const qint64 maxTimeLast, qint64 currentTime)
{
    const int minFrameCount = 5;

    // remove outdated filters
    QMutableListIterator<RobotFilter*> it(filters);
    while (it.hasNext()) {
        RobotFilter *filter = it.next();
        // last robot has more time, but only if it's visible yet
        const qint64 timeLimit = (filters.size() > 1 || filter->frameCounter() < minFrameCount) ? maxTime : maxTimeLast;
        if (filter->lastUpdate() + timeLimit < currentTime) {
            delete filter;
            it.remove();
        }
    }
}

void Tracker::invalidateBall(qint64 currentTime)
{
    // Maximum tracking time if multiple balls are visible
    const qint64 maxTimeBall = .1E9; // 0.1 s
    // Maximum tracking time for last ball
    const qint64 maxTimeLastBall = 1E9; // 1 s
    // Maximum tracking time for a ball that is invisible but could still be dribbling
    const qint64 maxTimeFeasibleBall = 10e9; // 10 s

    // remove outdated balls
    const int minFrameCount = 5;

    int longLivingFilters = std::count_if(m_ballFilter.begin(), m_ballFilter.end(), [](const BallTracker *t) {
        return t->frameCounter() >= 3;
    });

    // remove outdated filters
    QList<BallTracker*> possibleRemovals;
    QMutableListIterator<BallTracker*> it(m_ballFilter);
    while (it.hasNext()) {
        BallTracker *filter = it.next();
        // last robot has more time, but only if it's visible yet
        qint64 timeLimit;
        if (filter->frameCounter() < minFrameCount) {
            timeLimit = maxTimeBall;
        } else if (longLivingFilters == 1 && filter->isFeasiblyInvisible()) {
            timeLimit = maxTimeFeasibleBall;
        } else if (longLivingFilters > 1) {
            timeLimit = maxTimeBall;
        } else {
            timeLimit = maxTimeLastBall;
        }
        if (filter->lastUpdate() + timeLimit < currentTime) {
            if (filter->frameCounter() < 3) {
                delete filter;
            } else {
                possibleRemovals.append(filter);
            }
            it.remove();
        }
    }
    if (possibleRemovals.size() > 0) {
        std::sort(possibleRemovals.begin(), possibleRemovals.end(), [](BallTracker *f1, BallTracker *f2) {
            if (f1->isFeasiblyInvisible() != f2->isFeasiblyInvisible()) {
                return f1->isFeasiblyInvisible() > f2->isFeasiblyInvisible();
            }
            return f1->initTime() < f2->initTime();
        });
        // avoid collecting too many filters with a lot of balls/bad detections
        while (possibleRemovals.size() > 5) {
            BallTracker* toRemove = possibleRemovals.back();
            possibleRemovals.pop_back();
            delete toRemove;
        }
        // always remove at least one
        BallTracker* toRemove = possibleRemovals.back();
        possibleRemovals.pop_back();
        delete toRemove;
        m_ballFilter.append(possibleRemovals);
    }
}

void Tracker::invalidateRobots(RobotMap &map, qint64 currentTime)
{
    // Maximum tracking time if multiple robots with same id are visible
    // Usually only one robot with a given id is visible, so this value
    // is hardly ever used
    const qint64 maxTime = .2E9; // 0.2 s

    // iterate over team
    for(RobotMap::iterator it = map.begin(); it != map.end(); ++it) {
        // remove outdated robots
        invalidateRobotFilter(*it, maxTime, m_maxTimeLast, currentTime);
    }
}

QList<RobotFilter *> Tracker::getBestRobots(qint64 currentTime, int desiredCamera)
{
    const qint64 resetTimeout = 100*1000*1000;
    // only return objects which have been tracked for more than minFrameCount frames
    // if the tracker was reset recently, allow for fast repopulation
    const int minFrameCount = (currentTime > m_timeSinceLastReset + resetTimeout) ? 5: 0;

    QList<RobotFilter *> filters;

    for(RobotMap::iterator it = m_robotFilterYellow.begin(); it != m_robotFilterYellow.end(); ++it) {
        RobotFilter *robot = bestFilter(*it, minFrameCount, desiredCamera);
        if (robot != nullptr) {
            robot->update(currentTime);
            filters.append(robot);
        }
    }
    for(RobotMap::iterator it = m_robotFilterBlue.begin(); it != m_robotFilterBlue.end(); ++it) {
        RobotFilter *robot = bestFilter(*it, minFrameCount, desiredCamera);
        if (robot != nullptr) {
            robot->update(currentTime);
            filters.append(robot);
        }
    }
    return filters;
}

static RobotInfo nearestRobotInfo(const QList<RobotFilter *> &robots, const SSL_DetectionBall &b) {
    Eigen::Vector2f ball(-b.y()/1000, b.x()/1000); // convert from ssl vision coordinates

    RobotInfo nearestRobot;

    float minDist = std::numeric_limits<float>::max();

    for (RobotFilter *filter : robots) {
        RobotInfo info = filter->getRobotInfo();
        Eigen::Vector2f dribbler = info.dribblerPos;
        const float dist = (ball - dribbler).norm();
        if (dist < minDist) {
            minDist = dist;
            nearestRobot = info;
        }
    }
    return nearestRobot;
}

void Tracker::trackBallDetections(const SSL_DetectionFrame &frame, qint64 receiveTime, qint64 visionProcessingDelay)
{
    const qint64 captureTime = frame.t_capture() * 1E9;
    const quint32 cameraId = frame.camera_id();

    if (!m_cameraInfo->cameraPosition.contains(cameraId)) {
        return;
    }

    const QList<RobotFilter*> bestRobots = getBestRobots(receiveTime, frame.camera_id());

    std::vector<VisionFrame> ballFrames;
    ballFrames.reserve(frame.balls_size());
    for (int i = 0; i < frame.balls_size(); i++) {

        if (m_aoiEnabled && !isInAOI(frame.balls(i).x(), frame.balls(i).y() , *m_fieldTransform, m_aoi_x1, m_aoi_y1, m_aoi_x2, m_aoi_y2)) {
            continue;
        }

        // filter out all ball detections originating from people on the field
        // they can be identified by having many detections in a small area
        const float RADIUS = 500; // in millimiter
        const int MAX_NEAR_COUNT = 3;
        const auto nearCount = std::count_if(frame.balls().begin(), frame.balls().end(), [&](const SSL_DetectionBall &ball) {
            return (Eigen::Vector2f(frame.balls(i).x(), frame.balls(i).y()) - Eigen::Vector2f(ball.x(), ball.y())).norm() < RADIUS;
        });

        if (nearCount <= MAX_NEAR_COUNT) {
            const RobotInfo robotInfo = nearestRobotInfo(bestRobots, frame.balls(i));
            ballFrames.push_back(VisionFrame(frame.balls(i), receiveTime, cameraId, robotInfo, visionProcessingDelay, captureTime));
        }
    }

    if (ballFrames.empty()) {
        return;
    }

    bool detectionWasAccepted = false;
    std::vector<bool> acceptingFilterWithCamId(ballFrames.size(), false);
    std::vector<BallTracker*> acceptingFilterWithOtherCamId(ballFrames.size(), nullptr);
    for (BallTracker *filter : m_ballFilter) {
        filter->update(receiveTime);

        // from a given vision packet, each filter can only accept one detection,
        // since it is not possible to see the true ball multiple times
        const int choice = filter->chooseDetection(ballFrames);
        if (choice >= 0) {
            if (filter->primaryCamera() == cameraId) {
                filter->addVisionFrame(ballFrames.at(choice));
                acceptingFilterWithCamId[choice] = true;
                detectionWasAccepted = true;
            } else {
                // remember filter for copying its state in case that no filter
                // for the current camera does accept the frame
                // ideally, you would choose which filter to use for this
                acceptingFilterWithOtherCamId[choice] = filter;
            }
        }
    }

    for (std::size_t i = 0;i<ballFrames.size();i++) {
        if (!acceptingFilterWithCamId[i]) {
            BallTracker* bt;
            if (acceptingFilterWithOtherCamId[i] != nullptr) {
                // copy filter from old camera
                bt = new BallTracker(*acceptingFilterWithOtherCamId[i], cameraId);
            } else {
                // create new Ball Filter without initial movement
                bt = new BallTracker(ballFrames[i], m_cameraInfo, *m_fieldTransform, m_ballModel);
            }
            m_ballFilter.append(bt);
            bt->addVisionFrame(ballFrames[i]);
        }
    }

    if (detectionWasAccepted) {
        // only prioritize when at least one detection was accepted
        prioritizeBallFilters();
    }
}

void Tracker::trackRobot(RobotMap &robotMap, const SSL_DetectionRobot &robot, qint64 receiveTime, qint32 cameraId,
                         qint64 visionProcessingDelay, bool teamIsYellow)
{
    if (!robot.has_robot_id()) {
        return;
    }

    if (m_aoiEnabled && !isInAOI(robot.x(), robot.y() , *m_fieldTransform, m_aoi_x1, m_aoi_y1, m_aoi_x2, m_aoi_y2)) {
        return;
    }

    // Keep one robot filter per camera in which a robot is visible
    // Every filter gets the data from every camera (if the position matches),
    // but the primary camera for each filter is still important if the camera calibration is bad

    const float MAX_DISTANCE = 0.5;
    const qint64 PRIMARY_TIMEOUT = 42*1000*1000;

    std::map<qint32, std::pair<float, RobotFilter*>> nearestFilterByCamera;
    RobotFilter *totalClosest = nullptr;
    float totalClosestDist = MAX_DISTANCE;

    QList<RobotFilter*>& list = robotMap[robot.robot_id()];
    for (RobotFilter *filter : list) {
        filter->update(receiveTime);
        const float dist = filter->distanceTo(robot);
        if (dist > MAX_DISTANCE) {
            continue;
        }
        const bool isYoung = receiveTime - filter->lastPrimaryTime() > PRIMARY_TIMEOUT;
        if (static_cast<qint32>(filter->primaryCamera()) != cameraId && isYoung) {
            continue;
        }

        if (dist < totalClosestDist) {
            totalClosestDist = dist;
            totalClosest = filter;
        }

        const auto f = nearestFilterByCamera.find(filter->primaryCamera());
        if (f == nearestFilterByCamera.end() || dist < f->first) {
            nearestFilterByCamera[filter->primaryCamera()] = {dist, filter};
        }
    }

    if (!totalClosest) {
        totalClosest = new RobotFilter(robot, receiveTime, teamIsYellow);
        list.append(totalClosest);
        nearestFilterByCamera[cameraId] = {totalClosestDist, totalClosest};
    }

    const auto ownCamera = nearestFilterByCamera.find(cameraId);
    const bool createOwnCameraFilter = ownCamera == nearestFilterByCamera.end();
    if (createOwnCameraFilter) {
        RobotFilter *filter = new RobotFilter(*totalClosest);
        list.append(filter);
        nearestFilterByCamera[cameraId] = {totalClosestDist, filter};
    }

    for (const auto &[id, data] : nearestFilterByCamera) {
        RobotFilter *filter = data.second;
        filter->addVisionFrame(cameraId, robot, receiveTime, visionProcessingDelay, id == cameraId && createOwnCameraFilter);
    }
}

void Tracker::queuePacket(const QByteArray &packet, qint64 time, QString sender)
{
    m_visionPackets.append(Packet(packet, time, sender));
    m_hasVisionData = true;
}

void Tracker::queueRadioCommands(const QList<robot::RadioCommand> &radio_commands, qint64 time)
{
    for (const robot::RadioCommand &radioCommand : radio_commands) {
        // skip commands for which the team is unknown
        if (!radioCommand.has_is_blue()) {
            continue;
        }

        // add radio responses to every available filter
        const RobotMap &teamMap = radioCommand.is_blue() ? m_robotFilterBlue : m_robotFilterYellow;
        const QList<RobotFilter*>& list = teamMap.value(radioCommand.id());
        for (RobotFilter *filter : list) {
            filter->addRadioCommand(radioCommand.command(), time);
        }
    }
}

void Tracker::handleCommand(const amun::CommandTracking &command, qint64 time)
{
    if (command.has_aoi_enabled()) {
        m_aoiEnabled = command.aoi_enabled();
    }

    if (command.has_aoi()) {
        m_aoi_x1 = command.aoi().x1();
        m_aoi_y1 = command.aoi().y1();
        m_aoi_x2 = command.aoi().x2();
        m_aoi_y2 = command.aoi().y2();
    }

    if (command.has_system_delay()) {
        m_systemDelay = command.system_delay();
    }

    // allows resetting by the strategy
    if (command.reset()) {
        m_timeToReset = time;
    }

    if (command.has_field_transform()) {
        const auto &tr = command.field_transform();
        std::array<float, 6> transform({tr.a11(), tr.a12(), tr.a21(), tr.a22(), tr.offsetx(), tr.offsety()});
        m_fieldTransform->setTransform(transform);
    }

    if (command.has_enable_virtual_field()) {
        m_virtualFieldEnabled = command.enable_virtual_field();
        // reset transform
        if (!command.enable_virtual_field()) {
            m_fieldTransform->setTransform({1, 0, 0, 1, 0, 0});
        }
        m_geometryUpdated = true;
    }

    if (command.has_virtual_geometry()) {
        m_geometryUpdated = true;
        m_virtualFieldGeometry.CopyFrom(command.virtual_geometry());
    }
}
