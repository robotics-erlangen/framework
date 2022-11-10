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
#include "core/protobuffilesaver.h"
#include <QDebug>


TrajectoryPath::TrajectoryPath(uint32_t rng_seed, ProtobufFileSaver *inputSaver, pathfinding::InputSourceType captureType) :
    AbstractPath(rng_seed),
    m_standardSampler(m_rng, m_world, m_debug),
    m_endInObstacleSampler(m_rng, m_world, m_debug),
    m_escapeObstacleSampler(m_rng, m_world, m_debug),
    m_inputSaver(inputSaver),
    m_captureType(captureType)
{ }

void TrajectoryPath::reset()
{
    // TODO: reset internal state
}

std::vector<TrajectoryPoint> TrajectoryPath::calculateTrajectory(Vector s0, Vector v0, Vector s1, Vector v1, float maxSpeed, float acceleration)
{
    // sanity checks
    if (maxSpeed < 0.01f || acceleration < 0.01f) {
        qDebug() <<"Invalid trajectory input!";
        return {};
    }

    TrajectoryInput input;
    input.start = RobotState(s0, v0);
    input.target = RobotState(s1, v1);
    input.t0 = 0;
    input.exponentialSlowDown = v1 == Vector(0, 0);
    input.maxSpeed = maxSpeed;
    input.maxSpeedSquared = maxSpeed * maxSpeed;
    input.acceleration = acceleration;

    return getResultPath(findPath(input), input);
}

static void setVector(Vector v, pathfinding::Vector *out)
{
    out->set_x(v.x);
    out->set_y(v.y);
}

static void serializeTrajectoryInput(const TrajectoryInput &input, pathfinding::TrajectoryInput *result)
{
    // t0 is not serialized, since it is only added during the computation
    setVector(input.start.speed, result->mutable_v0());
    setVector(input.target.speed, result->mutable_v1());
    setVector(input.start.pos, result->mutable_s0());
    setVector(input.target.pos, result->mutable_s1());
    result->set_max_speed(input.maxSpeed);
    result->set_acceleration(input.acceleration);
}

static std::vector<TrajectorySampler::TrajectoryGenerationInfo> concat(const std::vector<TrajectorySampler::TrajectoryGenerationInfo> &a,
                                                                        const std::vector<TrajectorySampler::TrajectoryGenerationInfo> &b) {

    std::vector<TrajectorySampler::TrajectoryGenerationInfo> result;
    result.insert(result.end(), a.begin(), a.end());
    result.insert(result.end(), b.begin(), b.end());
    return result;
}

void TrajectoryPath::savePathfindingInput(const TrajectoryInput &input)
{
    pathfinding::PathFindingTask task;
    serializeTrajectoryInput(input, task.mutable_input());
    m_world.serialize(task.mutable_state());
    task.set_type(m_captureType);
    m_inputSaver->saveMessage(task);
}

bool TrajectoryPath::testSampler(const TrajectoryInput &input, pathfinding::InputSourceType type)
{
    if (m_captureType == type && m_inputSaver != nullptr) {
        savePathfindingInput(input);
    }
    if (type == pathfinding::StandardSampler) {
        return m_standardSampler.compute(input);
    } else if (type == pathfinding::EndInObstacleSampler) {
        return m_endInObstacleSampler.compute(input);
    } else if (type == pathfinding::EscapeObstacleSampler) {
        return m_escapeObstacleSampler.compute(input);
    }
    return false;
}

std::vector<TrajectorySampler::TrajectoryGenerationInfo> TrajectoryPath::findPath(TrajectoryInput input)
{
    const auto &obstacles = m_world.obstacles();

    m_escapeObstacleSampler.resetMaxIntersectingObstaclePrio();

    m_world.addToAllStaticObstacleRadius(m_world.radius());
    m_world.collectObstacles();
    m_world.collectMovingObstacles();

    if (m_captureType == pathfinding::AllSamplers && m_inputSaver != nullptr) {
        savePathfindingInput(input);
    }

    // check if start point is in obstacle
    std::vector<TrajectorySampler::TrajectoryGenerationInfo> escapeObstacle;
    if (m_world.isInStaticObstacle(obstacles, input.start.pos) || m_world.isInMovingObstacle(m_world.movingObstacles(), input.start.pos, 0, input.start.speed)) {
        if (!testSampler(input, pathfinding::EscapeObstacleSampler)) {
            // no fallback for now
            return {};
        }

        // the endpoint of the computed trajectory is now a safe start point
        // so just continue with the regular computation
        escapeObstacle = m_escapeObstacleSampler.getResult();

        // assume no slowDownTime
        const Vector startPos = escapeObstacle[0].profile.endPosition();
        const Vector startSpeed = escapeObstacle[0].profile.endSpeed();

        input.start = RobotState(startPos, startSpeed);
        input.t0 = escapeObstacle[0].profile.time();
    }

    // check if end point is in obstacle
    if (m_world.isInStaticObstacle(obstacles, input.target.pos) || m_world.isInFriendlyStopPos(input.target.pos)) {
        const float PROJECT_DISTANCE = 0.03f;
        for (const StaticObstacles::Obstacle *o : obstacles) {
            float dist = o->distance(input.target.pos);
            if (dist > -0.2 && dist < 0) {
                input.target.pos = o->projectOut(input.target.pos, PROJECT_DISTANCE);
            }
        }
        for (const MovingObstacles::MovingObstacle *o : m_world.movingObstacles()) {
            input.target.pos = o->projectOut(input.target.pos, PROJECT_DISTANCE);
        }
        // test again, might have been moved into another obstacle
        if (m_world.isInStaticObstacle(obstacles, input.target.pos) || m_world.isInFriendlyStopPos(input.target.pos)) {
            if (testSampler(input, pathfinding::EndInObstacleSampler)) {
                return concat(escapeObstacle, m_endInObstacleSampler.getResult());
            }
            if (escapeObstacle.size() > 0) {
                // we have already run the escape obstacle sampler, no need to do it again
                return escapeObstacle;
            }
            if (testSampler(input, pathfinding::EscapeObstacleSampler)) {
                return m_escapeObstacleSampler.getResult();
            }
            return {};
        }
    }

    // check direct trajectory
    const float directSlowDownTime = input.exponentialSlowDown ? SpeedProfile::SLOW_DOWN_TIME : 0.0f;
    const float targetDistance = (input.target.pos - input.start.pos).length();
    const bool useHighPrecision = targetDistance < 0.1f && input.target.speed == Vector(0, 0) && input.start.speed.length() < 0.2f;
    const SpeedProfile direct = AlphaTimeTrajectory::findTrajectory(input.start, input.target, input.acceleration, input.maxSpeed,
                                                                    directSlowDownTime, useHighPrecision, true);

    float directTrajectoryScore = std::numeric_limits<float>::max();
    if (direct.isValid()) {
        auto obstacleDistances = m_world.minObstacleDistance(direct, 0, StandardSampler::OBSTACLE_AVOIDANCE_RADIUS);

        if (obstacleDistances.first > StandardSampler::OBSTACLE_AVOIDANCE_RADIUS ||
                (obstacleDistances.first > 0 && obstacleDistances.second < StandardSampler::OBSTACLE_AVOIDANCE_RADIUS)) {

            const TrajectorySampler::TrajectoryGenerationInfo info(direct, input.target.pos);
            return concat(escapeObstacle, {info});
        }
        if (obstacleDistances.first > 0) {
            directTrajectoryScore = StandardSampler::trajectoryScore(direct.time(), obstacleDistances.first);
        }
    }

    m_standardSampler.setDirectTrajectoryScore(directTrajectoryScore);
    if (testSampler(input, pathfinding::StandardSampler)) {
        return concat(escapeObstacle, m_standardSampler.getResult());
    }
    // the standard sampler might fail since it regards the direct trajectory as the best result
    if (directTrajectoryScore < std::numeric_limits<float>::max()) {
        const TrajectorySampler::TrajectoryGenerationInfo info(direct, input.target.pos);
        return concat(escapeObstacle, {info});
    }

    if (testSampler(input, pathfinding::EndInObstacleSampler)) {
        return concat(escapeObstacle, m_endInObstacleSampler.getResult());
    }

    if (escapeObstacle.size() > 0) {
        // we have already run the escape obstacle sampler, no need to do it again
        return escapeObstacle;
    }
    if (testSampler(input, pathfinding::EscapeObstacleSampler)) {
        return m_escapeObstacleSampler.getResult();
    }
    return {};
}

std::vector<TrajectoryPoint> TrajectoryPath::getResultPath(const std::vector<TrajectorySampler::TrajectoryGenerationInfo> &generationInfo, const TrajectoryInput &input)
{
    if (generationInfo.size() == 0) {
        TrajectoryPoint p1;
        p1.pos = input.start.pos;
        p1.time = 0;
        p1.speed = input.start.speed;
        TrajectoryPoint p2;
        p2.pos = input.start.pos;
        p2.time = 0;
        p2.speed = Vector(0, 0);
        return {p1, p2};
    }

    float toEndTime = 0;
    for (auto info : generationInfo) {
        toEndTime += info.profile.time();
    }

    // sample the resulting trajectories in equal time intervals for friendly robot obstacles
    m_currentTrajectory.clear();

    {
        float currentTime = 0; // time in a trajectory part
        float currentTotalTime = 0; // time from the beginning
        const int SAMPLES_PER_TRAJECTORY = 40;
        const float samplingInterval = toEndTime / (SAMPLES_PER_TRAJECTORY * generationInfo.size());
        for (unsigned int i = 0;i<generationInfo.size();i++) {
            const auto &info = generationInfo[i];
            const SpeedProfile &trajectory = info.profile;
            const float partTime = trajectory.time();

            const float maxTime = 20 / input.maxSpeed;
            if (partTime > maxTime || std::isinf(partTime) || std::isnan(partTime) || partTime < 0) {
                qDebug() <<"Error: trying to use invalid trajectory";
                return {};
            }

            // trajectory positions are not perfect, move them slightly to reach the desired position perfectly
            const Vector correctionOffset = info.desiredTargetPos - trajectory.endPosition();

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

                auto posSpeed = trajectory.positionAndSpeedForTime(currentTime);

                TrajectoryPoint p;
                p.time = currentTotalTime;
                p.speed = posSpeed.second;
                p.pos = posSpeed.first + correctionOffset * (currentTime / partTime);
                m_currentTrajectory.push_back(p);

                currentTime += samplingInterval;
                currentTotalTime += samplingInterval;
            }
        }
    }

    // use the smaller, more efficient trajectory points for transfer and usage to the strategy
    {
        std::vector<TrajectoryPoint> result;
        float totalTime = 0;
        for (unsigned int i = 0;i<generationInfo.size();i++) {
            const auto &info = generationInfo[i];
            const SpeedProfile &trajectory = info.profile;
            float partTime = trajectory.time();

            std::vector<TrajectoryPoint> newPoints;
            if (partTime > info.profile.slowDownTime * 1.5f) {
                // when the trajectory is far longer than the exponential slow down part, omit it from the result (to minimize it)
                newPoints = trajectory.getTrajectoryPoints();

            } else {
                // we are close to, or in the exponential slow down phase

                // a small sample count is fine since the absolute time to the target is very low
                const std::size_t EXPONENTIAL_SLOW_DOWN_SAMPLE_COUNT = 10;
                newPoints.reserve(EXPONENTIAL_SLOW_DOWN_SAMPLE_COUNT);
                for (std::size_t i = 0;i<EXPONENTIAL_SLOW_DOWN_SAMPLE_COUNT;i++) {
                    TrajectoryPoint p;
                    p.time = i * partTime / float(EXPONENTIAL_SLOW_DOWN_SAMPLE_COUNT - 1);
                    auto posSpeed = trajectory.positionAndSpeedForTime(p.time);
                    p.pos = posSpeed.first;
                    p.speed = posSpeed.second;
                    newPoints.push_back(p);
                }
            }

            // trajectory positions are not perfect, move them slightly to reach the desired position perfectly
            const Vector correctionOffset = info.desiredTargetPos - trajectory.endPosition();

            for (auto &point : newPoints) {
                point.pos += correctionOffset * point.time / partTime;
                point.time += totalTime;
            }
            result.insert(result.end(), newPoints.begin(), newPoints.end());

            totalTime += partTime;
        }

        return result;
   }
}
