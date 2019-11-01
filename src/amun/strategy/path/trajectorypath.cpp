/***************************************************************************
 *   Copyright 2019 Andreas Wendler                                        *
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

#include "trajectorypath.h"
#include "core/rng.h"
#include <QDebug>


TrajectoryPath::TrajectoryPath(uint32_t rng_seed) :
    AbstractPath(rng_seed),
    m_standardSampler(m_rng, m_world),
    m_endInObstacleSampler(m_rng, m_world),
    m_escapeObstacleSampler(m_rng, m_world)
{ }

void TrajectoryPath::reset()
{
    // TODO: reset internal state
}

std::vector<TrajectoryPoint> TrajectoryPath::calculateTrajectory(Vector s0, Vector v0, Vector s1, Vector v1, float maxSpeed, float acceleration)
{
    m_input.v0 = v0;
    m_input.v1 = v1;
    m_input.distance = s1 - s0;
    m_input.s0 = s0;
    m_input.s1 = s1;
    m_input.exponentialSlowDown = v1 == Vector(0, 0);
    m_input.maxSpeed = maxSpeed;
    m_input.maxSpeedSquared = maxSpeed * maxSpeed;
    m_input.acceleration = acceleration;

    return getResultPath(findPath());
}

std::vector<TrajectorySampler::TrajectoryGenerationInfo> TrajectoryPath::findPath()
{
    const auto &obstacles = m_world.obstacles();

    m_escapeObstacleSampler.m_maxIntersectingObstaclePrio = -1;

    m_world.addToAllStaticObstacleRadius(-m_world.radius());
    m_world.collectObstacles();
    m_world.collectMovingObstacles();

    // check if start point is in obstacle
    if (m_world.isInStaticObstacle(obstacles, m_input.s0) || m_world.isInMovingObstacle(m_world.movingObstacles(), m_input.s0, 0)) {
        if (m_escapeObstacleSampler.compute(m_input)) {
            return m_escapeObstacleSampler.getResult();
        }
        // no fallback for now
        return {};
    }

    // check if end point is in obstacle
    if (m_world.isInStaticObstacle(obstacles, m_input.s1)) {
        for (const StaticObstacles::Obstacle *o : obstacles) {
            float dist = o->distance(m_input.s1);
            if (dist > 0.01f && dist < 0) {
                m_input.s1 = o->projectOut(m_input.s1, 0.03f);
            }
        }
        m_input.distance = m_input.s1 - m_input.s0;
        // test again, might have been moved into another obstacle
        if (m_world.isInStaticObstacle(obstacles, m_input.s1)) {
            if (m_endInObstacleSampler.compute(m_input)) {
                return m_endInObstacleSampler.getResult();
            }
            if (m_escapeObstacleSampler.compute(m_input)) {
                return m_escapeObstacleSampler.getResult();
            }
            return {};
        }
    }

    // check direct trajectory
    float directSlowDownTime = m_input.exponentialSlowDown ? AlphaTimeTrajectory::SLOW_DOWN_TIME : 0.0f;
    bool useHighPrecision = m_input.distance.length() < 0.1f && m_input.v1 == Vector(0, 0) && m_input.v0.length() < 0.2f;
    SpeedProfile direct = AlphaTimeTrajectory::findTrajectoryFastEndSpeed(m_input.v0, m_input.v1, m_input.distance, m_input.acceleration, m_input.maxSpeed, directSlowDownTime, useHighPrecision);
    if (direct.isValid()) {
        auto obstacleDistances = m_world.minObstacleDistance(direct, 0, directSlowDownTime, m_input.s0);
        if (obstacleDistances.first > StandardSampler::OBSTACLE_AVOIDANCE_RADIUS ||
                (obstacleDistances.second > 0 && obstacleDistances.second < StandardSampler::OBSTACLE_AVOIDANCE_RADIUS)) {
            TrajectorySampler::TrajectoryGenerationInfo info;
            info.profile = direct;
            info.slowDownTime = directSlowDownTime;
            info.fastEndSpeed = true;
            info.desiredDistance = m_input.distance;
            return {info};
        }
    }

    if (m_standardSampler.compute(m_input)) {
        return m_standardSampler.getResult();
    }
    if (m_endInObstacleSampler.compute(m_input)) {
        return m_endInObstacleSampler.getResult();
    }
    if (m_escapeObstacleSampler.compute(m_input)) {
        return m_escapeObstacleSampler.getResult();
    }
    return {};
}

std::vector<TrajectoryPoint> TrajectoryPath::getResultPath(const std::vector<TrajectorySampler::TrajectoryGenerationInfo> &generationInfo)
{
    std::vector<SpeedProfile> parts;
    if (generationInfo.size() == 0) {
        TrajectoryPoint p1;
        p1.pos = m_input.s0;
        p1.time = 0;
        p1.speed = m_input.v0;
        TrajectoryPoint p2;
        p2.pos = m_input.s0;
        p2.time = std::numeric_limits<float>::max();
        p2.speed = Vector(0, 0);
        return {p1, p2};
    }

    float toEndTime = 0;
    for (auto info : generationInfo) {
        float totalTime = info.slowDownTime == 0.0f ? info.profile.time() : info.profile.timeWithSlowDown(info.slowDownTime);
        toEndTime += totalTime;
    }

    std::vector<TrajectoryPoint> result;
    Vector startPos = m_input.s0;
    float currentTime = 0; // time in a trajectory part
    float currentTotalTime = 0; // time from the beginning
    const int SAMPLES_PER_TRAJECTORY = 40;
    const float samplingInterval = toEndTime / (SAMPLES_PER_TRAJECTORY * generationInfo.size());
    for (unsigned int i = 0;i<generationInfo.size();i++) {
        const auto &info = generationInfo[i];
        const SpeedProfile &trajectory = info.profile;
        float partTime = info.slowDownTime == 0.0f ? trajectory.time() : trajectory.timeWithSlowDown(info.slowDownTime);

        if (partTime > 20 || std::isinf(partTime) || std::isnan(partTime) || partTime < 0) {
            qDebug() <<"Error: trying to use invalid trajectory";
            return result;
        }

        // trajectory positions are not perfect, scale them slightly to reach the desired position perfectly
        float xScale = 1, yScale = 1;
        Vector endPos;
        if (info.slowDownTime == 0.0f) {
            endPos = trajectory.positionForTime(partTime);
        } else {
            endPos = trajectory.calculateSlowDownPos(info.slowDownTime);
        }
        if (info.desiredDistance != Vector(0, 0)) {
            xScale = info.desiredDistance.x / endPos.x;
            yScale = info.desiredDistance.y / endPos.y;
            xScale = std::min(1.1f, std::max(0.9f, xScale));
            yScale = std::min(1.1f, std::max(0.9f, yScale));
            endPos.x *= xScale;
            endPos.y *= yScale;
        }

        bool wasAtEndPoint = false;
        while (true) {
            if (currentTime > partTime) {
                if (i < generationInfo.size()-1) {
                    currentTime -= partTime;
                    break;
                } else {
                    if (wasAtEndPoint) {
                        break;
                    }
                    wasAtEndPoint = true;
                }
            }
            TrajectoryPoint p;
            p.time = currentTotalTime;
            Vector position;
            if (info.slowDownTime == 0.0f) {
                position = trajectory.positionForTime(currentTime);
                p.speed = trajectory.speedForTime(currentTime);
            } else {
                position = trajectory.positionForTimeSlowDown(currentTime, info.slowDownTime);
                p.speed = trajectory.speedForTimeSlowDown(currentTime, info.slowDownTime);
            }
            p.pos = startPos + Vector(position.x * xScale, position.y * yScale);
            result.push_back(p);

            currentTime += samplingInterval;
            currentTotalTime += samplingInterval;
        }
        startPos += endPos;
    }
    m_currentTrajectory = result;
    return result;
}
