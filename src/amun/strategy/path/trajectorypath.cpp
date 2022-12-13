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

static std::vector<Trajectory> concat(const std::vector<Trajectory> &a, const std::vector<Trajectory> &b)
{
    std::vector<Trajectory> result;
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

int TrajectoryPath::maxIntersectingObstaclePrio() const
{
    return m_escapeObstacleSampler.getMaxIntersectingObstaclePrio();
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

std::vector<Trajectory> TrajectoryPath::findPath(TrajectoryInput input)
{
    m_escapeObstacleSampler.resetMaxIntersectingObstaclePrio();

    m_world.collectObstacles();

    if (m_captureType == pathfinding::AllSamplers && m_inputSaver != nullptr) {
        savePathfindingInput(input);
    }

    // check if start point is in obstacle
    std::vector<Trajectory> escapeObstacle;
    const TrajectoryPoint startState{input.start, 0};
    if (m_world.minObstacleDistancePoint(startState) <= 0.0f) {
        if (!testSampler(input, pathfinding::EscapeObstacleSampler)) {
            // no fallback for now
            return {};
        }

        // the endpoint of the computed trajectory is now a safe start point
        // so just continue with the regular computation
        escapeObstacle = m_escapeObstacleSampler.getResult();

        // assume no slowDownTime
        const Vector startPos = escapeObstacle[0].endPosition();
        const Vector startSpeed = escapeObstacle[0].endSpeed();

        input.start = RobotState(startPos, startSpeed);
        input.t0 = escapeObstacle[0].time();
    }

    // check if end point is in obstacle
    if (m_world.isInStaticObstacle(input.target.pos) || m_world.isInFriendlyStopPos(input.target.pos)) {
        const float PROJECT_DISTANCE = 0.03f;
        for (const Obstacles::StaticObstacle *o : m_world.staticObstacles()) {
            float dist = o->distance(input.target.pos);
            if (dist > -0.2 && dist < 0) {
                input.target.pos = o->projectOut(input.target.pos, PROJECT_DISTANCE);
            }
        }
        for (const Obstacles::Obstacle *o : m_world.movingObstacles()) {
            input.target.pos = o->projectOut(input.target.pos, PROJECT_DISTANCE);
        }
        // test again, might have been moved into another obstacle
        if (m_world.isInStaticObstacle(input.target.pos) || m_world.isInFriendlyStopPos(input.target.pos)) {
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
    const float directSlowDownTime = input.exponentialSlowDown ? SlowdownAcceleration::SLOW_DOWN_TIME : 0.0f;
    const auto direct = AlphaTimeTrajectory::findTrajectory(input.start, input.target, input.acceleration, input.maxSpeed,
                                                            directSlowDownTime, EndSpeed::FAST);

    float directTrajectoryScore = std::numeric_limits<float>::max();
    if (direct) {
        auto obstacleDistances = m_world.minObstacleDistance(direct.value(), 0, StandardSampler::OBSTACLE_AVOIDANCE_RADIUS);

        if (obstacleDistances.first > StandardSampler::OBSTACLE_AVOIDANCE_RADIUS ||
                (obstacleDistances.first > 0 && obstacleDistances.second < StandardSampler::OBSTACLE_AVOIDANCE_RADIUS)) {

            return concat(escapeObstacle, {direct.value()});
        }
        if (obstacleDistances.first > 0) {
            directTrajectoryScore = StandardSampler::trajectoryScore(direct->time(), obstacleDistances.first);
        }
    }

    m_standardSampler.setDirectTrajectoryScore(directTrajectoryScore);
    if (testSampler(input, pathfinding::StandardSampler)) {
        return concat(escapeObstacle, m_standardSampler.getResult());
    }
    // the standard sampler might fail since it regards the direct trajectory as the best result
    if (directTrajectoryScore < std::numeric_limits<float>::max()) {
        return concat(escapeObstacle, {direct.value()});
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

std::vector<TrajectoryPoint> TrajectoryPath::getResultPath(const std::vector<Trajectory> &profiles, const TrajectoryInput &input)
{
    if (profiles.size() == 0) {
        m_currentTrajectory = {{input.start, 0}, {RobotState{input.start.pos, Vector(0, 0)}, 0.01f}};

        const TrajectoryPoint p1{input.start, 0};
        const TrajectoryPoint p2{RobotState{input.start.pos, Vector(0, 0)}, 0};
        return {p1, p2};
    }

    float toEndTime = 0;
    for (const Trajectory& profile : profiles) {
        const float time = profile.time();

        const float maxTime = 20 / input.maxSpeed;
        if (time > maxTime || std::isinf(time) || std::isnan(time) || time < 0) {
            qDebug() <<"Error: trying to use invalid trajectory";
            return {};
        }

        toEndTime += profile.time();
    }


    m_currentTrajectory.clear();
    std::vector<TrajectoryPoint> result;

    float startOffset = 0;
    float totalTime = 0;
    const int SAMPLES_PER_TRAJECTORY = 40;
    const float samplingInterval = toEndTime / (SAMPLES_PER_TRAJECTORY * profiles.size());
    for (unsigned int i = 0; i < profiles.size(); i++) {
        const Trajectory &trajectory = profiles[i];
        const float partTime = trajectory.time();

        // sample the resulting trajectories in equal time intervals for friendly robot obstacles
        Trajectory::Iterator it{trajectory, totalTime};
        // make sure that all samples are in uniform time intervals even across trajectories
        it.next(startOffset);
        const int baseSamples = std::floor((partTime - startOffset) / samplingInterval);
        const int allSamples = baseSamples + (i == profiles.size() - 1 ? 1 : 0);
        std::generate_n(std::back_inserter(m_currentTrajectory), allSamples, [&]() { return it.next(samplingInterval); });
        startOffset += allSamples * samplingInterval - partTime;

        // use the smaller, more efficient trajectory points for transfer and usage to the strategy
        std::vector<TrajectoryPoint> newPoints;
        if (partTime > trajectory.getSlowDownTime() * 2.0f) {
            // when the trajectory is far longer than the exponential slow down part, omit it from the result (to minimize it)
            newPoints = trajectory.getTrajectoryPoints(totalTime);
        } else {
            // we are close to, or in the slow down phase
            const std::size_t SLOW_DOWN_SAMPLE_COUNT = 10;
            const float timeInterval = partTime / float(SLOW_DOWN_SAMPLE_COUNT - 1);
            newPoints = trajectory.trajectoryPositions(SLOW_DOWN_SAMPLE_COUNT, timeInterval, totalTime);
        }
        result.insert(result.end(), newPoints.begin(), newPoints.end());

        totalTime += partTime;
    }
    return result;
}
