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
#include "ballfilter.h"
#include "protobuf/ssl_wrapper.pb.h"
#include "robotfilter.h"

Tracker::Tracker() :
    m_flip(false),
    m_systemDelay(30 * 1000 * 1000),
    m_resetTime(0),
    m_geometryUpdated(false),
    m_hasVisionData(false),
    m_lastUpdateTime(0),
    m_aoiEnabled(false),
    m_aoi_x1(0.0f),
    m_aoi_y1(0.0f),
    m_aoi_x2(0.0f),
    m_aoi_y2(0.0f)
{
}

Tracker::~Tracker()
{
    reset();
}

void Tracker::reset()
{
    foreach (const QList<RobotFilter*>& list, m_robotFilterYellow) {
        qDeleteAll(list);
    }
    m_robotFilterYellow.clear();

    foreach (const QList<RobotFilter*>& list, m_robotFilterBlue) {
        qDeleteAll(list);
    }
    m_robotFilterBlue.clear();

    qDeleteAll(m_ballFilter);
    m_ballFilter.clear();

    m_hasVisionData = false;
    m_resetTime = 0;
    m_lastUpdateTime = 0;
    m_visionPackets.clear();
    m_radioCommands.clear();
}

void Tracker::setFlip(bool flip)
{
    // used to change goals between blue and yellow
    m_flip = flip;
}

void Tracker::process(qint64 currentTime)
{
    // reset time is used to immediatelly show robots after reset
    if (m_resetTime == 0) {
        m_resetTime = currentTime;
    }

    // remove outdated ball and robot filters
    invalidateBall(currentTime);
    invalidateRobots(m_robotFilterYellow, currentTime);
    invalidateRobots(m_robotFilterBlue, currentTime);

    // distribute the radio responses before applying the vision frames
    foreach (const RadioCommand& c, m_radioCommands) {
        const robot::RadioCommand &radioCommand = c.first;
        // skip commands for which the team is unknown
        if (!radioCommand.has_is_blue()) {
            continue;
        }

        // add radio responses to every available filter
        const RobotMap &teamMap = radioCommand.is_blue() ? m_robotFilterBlue : m_robotFilterYellow;
        const QList<RobotFilter*>& list = teamMap.value(radioCommand.id());
        foreach (RobotFilter *filter, list) {
            filter->addRadioCommand(radioCommand.command(), c.second);
        }
    }
    m_radioCommands.clear();

    //track geometry changes
    m_geometryUpdated = false;

    foreach (const Packet &p, m_visionPackets) {
        SSL_WrapperPacket wrapper;
        if (!wrapper.ParseFromArray(p.first.data(), p.first.size())) {
            continue;
        }

        if (wrapper.has_geometry()) {
            updateGeometry(wrapper.geometry().field());
            for (int i = 0; i < wrapper.geometry().calib_size(); ++i) {
                updateCamera(wrapper.geometry().calib(i));
            }
            m_geometryUpdated = true;
        }

        if (!wrapper.has_detection()) {
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
            trackRobot(m_robotFilterYellow, detection.robots_yellow(i), sourceTime, detection.camera_id());
        }

        for (int i = 0; i < detection.robots_blue_size(); i++) {
            trackRobot(m_robotFilterBlue, detection.robots_blue(i), sourceTime, detection.camera_id());
        }

        QList<RobotFilter *> bestRobots = getBestRobots(sourceTime);
        for (int i = 0; i < detection.balls_size(); i++) {
            trackBall(detection.balls(i), sourceTime, detection.camera_id(), bestRobots);
        }

        m_lastUpdateTime = sourceTime;
    }
    m_visionPackets.clear();
}

template<class Filter>
Filter* Tracker::bestFilter(QList<Filter*> &filters, int minFrameCount)
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

Status Tracker::worldState(qint64 currentTime)
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

    // just return every ball that is available
    BallFilter *ball = bestFilter(m_ballFilter, 0);
    if (ball != NULL) {
        ball->update(currentTime);
        ball->get(worldState->mutable_ball(), m_flip, false);
    }

    for(RobotMap::iterator it = m_robotFilterYellow.begin(); it != m_robotFilterYellow.end(); ++it) {
        RobotFilter *robot = bestFilter(*it, minFrameCount);
        if (robot != NULL) {
            robot->update(currentTime);
            robot->get(worldState->add_yellow(), m_flip, false);
        }
    }

    for(RobotMap::iterator it = m_robotFilterBlue.begin(); it != m_robotFilterBlue.end(); ++it) {
        RobotFilter *robot = bestFilter(*it, minFrameCount);
        if (robot != NULL) {
            robot->update(currentTime);
            robot->get(worldState->add_blue(), m_flip, false);
        }
    }

    if (m_geometryUpdated) {
        status->mutable_geometry()->CopyFrom(m_geometry);
    }

    return status;
}

void Tracker::updateGeometry(const SSL_GeometryFieldSize &g)
{
    m_geometry.set_line_width(g.line_width() / 1000.0f);
    m_geometry.set_field_width(g.field_width() / 1000.0f);
    m_geometry.set_field_height(g.field_length() / 1000.0f);
    m_geometry.set_boundary_width(g.boundary_width() / 1000.0f);
    m_geometry.set_referee_width(g.referee_width() / 1000.0f);
    m_geometry.set_goal_width(g.goal_width() / 1000.0f);
    m_geometry.set_goal_depth(g.goal_depth() / 1000.0f);
    m_geometry.set_goal_wall_width(g.goal_wall_width() / 1000.0f);
    m_geometry.set_center_circle_radius(g.center_circle_radius() / 1000.0f);
    m_geometry.set_defense_radius(g.defense_radius() / 1000.0f);
    m_geometry.set_defense_stretch(g.defense_stretch() / 1000.0f);
    m_geometry.set_free_kick_from_defense_dist(g.free_kick_from_defense_dist() / 1000.0f);
    m_geometry.set_penalty_spot_from_field_line_dist(g.penalty_spot_from_field_line_dist() / 1000.0f);
    m_geometry.set_penalty_line_from_spot_dist(g.penalty_line_from_spot_dist() / 1000.0f);

    m_geometry.set_goal_height(0.16f);
}

void Tracker::updateCamera(const SSL_GeometryCameraCalibration &c)
{
    if (!c.has_derived_camera_world_tx() || !c.has_derived_camera_world_ty()
            || !c.has_derived_camera_world_tz()) {
        return;
    }
    Eigen::Vector3f cameraPos;
    cameraPos(0) = -c.derived_camera_world_ty() / 1000.f;
    cameraPos(1) = c.derived_camera_world_tx() / 1000.f;
    cameraPos(2) = c.derived_camera_world_tz() / 1000.f;

    m_cameraPosition[c.camera_id()] = cameraPos;
}

template<class Filter>
void Tracker::invalidate(QList<Filter*> &filters, const qint64 maxTime, const qint64 maxTimeLast, qint64 currentTime)
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

void Tracker::invalidateBall(qint64 currentTime)
{
    // Maximum tracking time if multiple balls are visible
    const qint64 maxTime = .2E9; // 0.2 s
    // Maximum tracking time for last ball
    const qint64 maxTimeLast = 1E9; // 1 s
    // remove outdated balls
    invalidate(m_ballFilter, maxTime, maxTimeLast, currentTime);
}

void Tracker::invalidateRobots(RobotMap &map, qint64 currentTime)
{
    // Maximum tracking time if multiple robots with same id are visible
    // Usually only one robot with a given id is visible, so this value
    // is hardly ever used
    const qint64 maxTime = .2E9; // 0.2 s
    // Maximum tracking time for last robot
    const qint64 maxTimeLast = 1E9; // 1 s

    // iterate over team
    for(RobotMap::iterator it = map.begin(); it != map.end(); ++it) {
        // remove outdated robots
        invalidate(*it, maxTime, maxTimeLast, currentTime);
    }
}

QList<RobotFilter *> Tracker::getBestRobots(qint64 currentTime)
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

world::Robot Tracker::findNearestRobot(const QList<RobotFilter *> &robots, const world::Ball &ball) const
{
    float minDist = 0;
    RobotFilter *best = nullptr;
    for (RobotFilter *filter : robots) {
        const float dist = filter->distanceTo(ball);
        if (dist < minDist || best == nullptr) {
            minDist = dist;
            best = filter;
        }
    }

    world::Robot robotPos;
    if (best != nullptr) {
        best->get(&robotPos, false, true);
    }
    return robotPos;
}

void Tracker::trackBall(const SSL_DetectionBall &ball, qint64 receiveTime, qint32 cameraId, const QList<RobotFilter *> &bestRobots)
{
    if (m_aoiEnabled && !BallFilter::isInAOI(ball, m_flip, m_aoi_x1, m_aoi_y1, m_aoi_x2, m_aoi_y2)) {
        return;
    }

    // Data association for ball
    // For each detected ball search for nearest predicted ball
    // If no ball is closer than .5 m create a new Kalman Filter

    float nearest = 0.5;
    BallFilter *nearestFilter = NULL;

    foreach (BallFilter *filter, m_ballFilter) {
        filter->update(receiveTime);
        const float dist = filter->distanceTo(ball, m_cameraPosition.value(cameraId, Eigen::Vector3f::Zero()));
        if (dist < nearest) {
            nearest = dist;
            nearestFilter = filter;
        }
    }

    if (!nearestFilter) {
        nearestFilter = new BallFilter(ball, receiveTime);
        m_ballFilter.append(nearestFilter);
    }

    world::Ball ballPos;
    nearestFilter->get(&ballPos, false, true);
    world::Robot nearestRobot = findNearestRobot(bestRobots, ballPos);
    nearestFilter->addVisionFrame(cameraId, m_cameraPosition.value(cameraId, Eigen::Vector3f::Zero()), ball, receiveTime, nearestRobot);
}

void Tracker::trackRobot(RobotMap &robotMap, const SSL_DetectionRobot &robot, qint64 receiveTime, qint32 cameraId)
{
    if (!robot.has_robot_id()) {
        return;
    }

    if (m_aoiEnabled && !RobotFilter::isInAOI(robot, m_flip, m_aoi_x1, m_aoi_y1, m_aoi_x2, m_aoi_y2)) {
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

    nearestFilter->addVisionFrame(cameraId, robot, receiveTime);
}

void Tracker::queuePacket(const QByteArray &packet, qint64 time)
{
    m_visionPackets.append(qMakePair(packet, time));
    m_hasVisionData = true;
}

void Tracker::queueRadioCommands(const QList<robot::RadioCommand> &radio_commands, qint64 time)
{
    foreach (const robot::RadioCommand &cmd, radio_commands) {
        m_radioCommands.append(QPair<robot::RadioCommand, qint64>(cmd, time));
    }
}

void Tracker::handleCommand(const amun::CommandTracking &command)
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
        reset();
    }
}
