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

#include "speedtracker.h"
#include "protobuf/ssl_wrapper.pb.h"
#include "robotfilter.h"
#include "core/fieldtransform.h"

SpeedTracker::SpeedTracker() :
    m_systemDelay(30 * 1000 * 1000),
    m_resetTime(0),
    m_hasVisionData(false),
    m_lastUpdateTime(0),
    m_fieldTransform(new FieldTransform)
{
}

SpeedTracker::~SpeedTracker()
{
    reset();
}

void SpeedTracker::reset()
{
    foreach (const QList<RobotFilter*>& list, m_robotFilterYellow) {
        qDeleteAll(list);
    }
    m_robotFilterYellow.clear();

    foreach (const QList<RobotFilter*>& list, m_robotFilterBlue) {
        qDeleteAll(list);
    }
    m_robotFilterBlue.clear();

    m_hasVisionData = false;
    m_resetTime = 0;
    m_lastUpdateTime = 0;
    m_visionPackets.clear();
}

void SpeedTracker::setFlip(bool flip)
{
    // used to change goals between blue and yellow
    m_fieldTransform->setFlip(flip);
}

void SpeedTracker::process(qint64 currentTime)
{
    // reset time is used to immediatelly show robots after reset
    if (m_resetTime == 0) {
        m_resetTime = currentTime;
    }

    // remove robot filters
    invalidateRobots(m_robotFilterYellow, currentTime);
    invalidateRobots(m_robotFilterBlue, currentTime);

    foreach (const Packet &p, m_visionPackets) {
        SSL_WrapperPacket wrapper;
        if (!wrapper.ParseFromArray(p.first.data(), p.first.size()) || !wrapper.has_detection()) {
            continue;
        }

        const SSL_DetectionFrame &detection = wrapper.detection();
        const qint64 visionProcessingTime = (detection.t_sent() - detection.t_capture()) * 1E9;
        // time on the field for which the frame was captured
        // with Timer::currentTime being now
        const qint64 sourceTime = p.second - visionProcessingTime - m_systemDelay;

        // drop frames older than the current state
        if (sourceTime <= m_lastUpdateTime) {
            continue;
        }

        for (int i = 0; i < detection.robots_yellow_size(); i++) {
            trackRobot(m_robotFilterYellow, detection.robots_yellow(i), sourceTime, detection.camera_id(), visionProcessingTime);
        }

        for (int i = 0; i < detection.robots_blue_size(); i++) {
            trackRobot(m_robotFilterBlue, detection.robots_blue(i), sourceTime, detection.camera_id(), visionProcessingTime);
        }

        m_lastUpdateTime = sourceTime;
    }
    m_visionPackets.clear();
}

template<class Filter>
Filter* SpeedTracker::bestFilter(QList<Filter*> &filters, int minFrameCount)
{
    // get first filter that has the minFrameCount and move it to the front
    // this is required to ensure a stable result
    foreach (Filter* item, filters) {
        if (item->frameCounter() >= minFrameCount) {
            if (filters.first() != item) {
                filters.removeOne(item);
                filters.prepend(item);
            }
            return item;
        }
    }
    return NULL;
}

Status SpeedTracker::worldState(qint64 currentTime)
{
    const qint64 resetTimeout = 100*1000*1000;
    // only return objects which have been tracked for more than minFrameCount frames
    // if the tracker was reset recently, allow for fast repopulation
    const int minFrameCount = (currentTime > m_resetTime + resetTimeout) ? 5: 0;

    // create world state for the given time
    Status status(new amun::Status);
    world::State *worldState = status->mutable_world_state();
    worldState->set_time(currentTime);
    worldState->set_has_vision_data(m_hasVisionData);

    for(RobotMap::iterator it = m_robotFilterYellow.begin(); it != m_robotFilterYellow.end(); ++it) {
        RobotFilter *robot = bestFilter(*it, minFrameCount);
        if (robot != NULL) {
            robot->update(currentTime);
            robot->get(worldState->add_yellow(), *m_fieldTransform, false);
        }
    }

    for(RobotMap::iterator it = m_robotFilterBlue.begin(); it != m_robotFilterBlue.end(); ++it) {
        RobotFilter *robot = bestFilter(*it, minFrameCount);
        if (robot != NULL) {
            robot->update(currentTime);
            robot->get(worldState->add_blue(), *m_fieldTransform, false);
        }
    }

    return status;
}

template<class Filter>
void SpeedTracker::invalidate(QList<Filter*> &filters, const qint64 maxTime, const qint64 maxTimeLast, qint64 currentTime)
{
    const int minFrameCount = 5;

    // remove outdated filters
    QMutableListIterator<Filter*> it(filters);
    while (it.hasNext()) {
        Filter *filter = it.next();
        // last robot has more time, but only if it's visible yet
        const qint64 timeLimit = (filters.size() > 1 || filter->frameCounter() < minFrameCount) ? maxTime : maxTimeLast;
        if (filter->lastUpdate() + timeLimit < currentTime) {
            delete filter;
            it.remove();
        }
    }
}

void SpeedTracker::invalidateRobots(RobotMap &map, qint64 currentTime)
{
    // Maximum tracking time if multiple robots with same id are visible
    // Usually only one robot with a given id is visible, so this value
    // is hardly ever used
    const qint64 maxTime = .2E9; // 0.2 s
    // Maximum tracking time for last robot
    const qint64 maxTimeLast = .2E9; // 0.2 s

    // iterate over team
    for(RobotMap::iterator it = map.begin(); it != map.end(); ++it) {
        // remove outdated robots
        invalidate(*it, maxTime, maxTimeLast, currentTime);
    }
}

QList<RobotFilter *> SpeedTracker::getBestRobots(qint64 currentTime)
{
    const qint64 resetTimeout = 100*1000*1000;
    // only return objects which have been tracked for more than minFrameCount frames
    // if the tracker was reset recently, allow for fast repopulation
    const int minFrameCount = (currentTime > m_resetTime + resetTimeout) ? 5: 0;

    QList<RobotFilter *> filters;

    for(RobotMap::iterator it = m_robotFilterYellow.begin(); it != m_robotFilterYellow.end(); ++it) {
        RobotFilter *robot = bestFilter(*it, minFrameCount);
        if (robot != NULL) {
            robot->update(currentTime);
            filters.append(robot);
        }
    }
    for(RobotMap::iterator it = m_robotFilterBlue.begin(); it != m_robotFilterBlue.end(); ++it) {
        RobotFilter *robot = bestFilter(*it, minFrameCount);
        if (robot != NULL) {
            robot->update(currentTime);
            filters.append(robot);
        }
    }
    return filters;
}

void SpeedTracker::trackRobot(RobotMap &robotMap, const SSL_DetectionRobot &robot, qint64 receiveTime, qint32 cameraId, qint64 visionProcessingTime)
{
    if (!robot.has_robot_id()) {
        return;
    }

    // Data association for robot
    // For each detected robot search for nearest predicted robot
    // with same id.
    // If no robot is closer than .5 m create a new Kalman Filter

    float nearest = 0.5;
    RobotFilter *nearestFilter = NULL;

    QList<RobotFilter*>& list = robotMap[robot.robot_id()];
    foreach (RobotFilter *filter, list) {
        filter->update(receiveTime);
        const float dist = filter->distanceTo(robot);
        if (dist < nearest) {
            nearest = dist;
            nearestFilter = filter;
        }
    }

    if (!nearestFilter) {
        nearestFilter = new RobotFilter(robot, receiveTime);
        list.append(nearestFilter);
    }

    nearestFilter->addVisionFrame(cameraId, robot, receiveTime, visionProcessingTime);
}

void SpeedTracker::queuePacket(const QByteArray &packet, qint64 time)
{
    m_visionPackets.append(qMakePair(packet, time));
    m_hasVisionData = true;
}

void SpeedTracker::handleCommand(const amun::CommandTracking &command)
{
    if (command.has_system_delay()) {
        m_systemDelay = command.system_delay();
    }
}
