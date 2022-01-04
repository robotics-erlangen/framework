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

#include "standardsampler.h"
#include "core/rng.h"
#include "core/protobuffilereader.h"
#include "config/config.h"
#include <QDebug>

StandardSampler::StandardSampler(RNG *rng, const WorldInformation &world, PathDebug &debug, bool usePrecomputation) :
    TrajectorySampler(rng, world, debug)
{
    if (usePrecomputation) {
        // load precomputed points
        ProtobufFileReader reader;
        reader.open(QString(ERFORCE_DATADIR) + "precomputation/standardsampler.prec", "KHONSU PRECOMPUTATION");
        pathfinding::StandardSamplerPrecomputation precomp;
        reader.readNext(precomp);
        for (const auto &a : precomp.segments()) {
            PrecomputationSegmentInfo segment;
            segment.deserialize(a);
            m_precomputedPoints.push_back(segment);
        }
    }
}

bool StandardSampler::compute(const TrajectoryInput &input)
{
    StandardSamplerBestTrajectoryInfo lastTrajectoryInfo = m_bestResultInfo;
    if (lastTrajectoryInfo.sample.getMidSpeed().lengthSquared() > input.maxSpeedSquared) {
        lastTrajectoryInfo.valid = false;
    }

    m_bestResultInfo.time = std::numeric_limits<float>::infinity();
    m_bestResultInfo.valid = false;

    // check trajectory from last iteration
    if (lastTrajectoryInfo.valid) {
        checkSample(input, lastTrajectoryInfo.sample, m_bestResultInfo.time);
    }

    // if no precomputation is found, fall back to live sampling
    if (m_precomputedPoints.size() == 0) {
        computeLive(input, lastTrajectoryInfo);
    } else {
        computePrecomputed(input);
    }


    return m_bestResultInfo.valid;
}

void StandardSampler::computeLive(const TrajectoryInput &input, const StandardSamplerBestTrajectoryInfo &lastFrameInfo)
{
    Vector defaultSpeed = input.distance * (std::max(2.5f, input.distance.length() / 2) / input.distance.length());
    // limit default speed to allowed speed
    if (defaultSpeed.lengthSquared() > input.maxSpeedSquared) {
        defaultSpeed = defaultSpeed / defaultSpeed.length();
    }

    // normal search
    for (int i = 0;i<100;i++) {
        // three sampling modes:
        // - totally random configuration
        // - around current best trajectory
        // - around last frames best trajectory

        enum SamplingMode { TOTAL_RANDOM, CURRENT_BEST, LAST_BEST };
        SamplingMode mode;
        // TODO: reuse random number
        if (!m_bestResultInfo.valid) {
            if (i < 20 || m_rng->uniformInt() % 2 == 0) {
                mode = LAST_BEST;
            } else {
                mode = TOTAL_RANDOM;
            }
        } else {
            if (m_rng->uniformInt() % 1024 < 150) {
                mode = TOTAL_RANDOM;
            } else if (m_bestResultInfo.time < lastFrameInfo.time + 0.05f) {
                mode = CURRENT_BEST;
            } else {
                mode = m_rng->uniformInt() % 2 == 0 ? CURRENT_BEST : LAST_BEST;
            }
        }

        Vector speed;
        float angle, time;
        if (mode == TOTAL_RANDOM) {
            if (m_rng->uniformInt() % 2 == 0) {
                speed = defaultSpeed;
            } else {
                speed = randomSpeed(input.maxSpeed);
            }
            angle = m_rng->uniformFloat(0, float(2 * M_PI));
            // TODO: adjust max time
            float maxTime = m_bestResultInfo.valid ? std::max(0.01f, m_bestResultInfo.time - 0.1f) : 5.0f;

            time = m_rng->uniformFloat(0, maxTime);
        } else {
            // TODO: gaussian sampling
            const StandardSamplerBestTrajectoryInfo &info = mode == CURRENT_BEST ? m_bestResultInfo : lastFrameInfo;
            const float RADIUS = 0.2f;
            Vector chosenMidSpeed = info.sample.getMidSpeed();
            while (chosenMidSpeed.lengthSquared() > input.maxSpeedSquared) {
                chosenMidSpeed *= 0.9f;
            }
            do {
                speed = chosenMidSpeed + Vector(m_rng->uniformFloat(-RADIUS, RADIUS), m_rng->uniformFloat(-RADIUS, RADIUS));
            } while (speed.lengthSquared() >= input.maxSpeedSquared);
            angle = info.sample.getAngle() + m_rng->uniformFloat(-0.1f, 0.1f);
            time = std::max(0.0001f, info.sample.getTime() + m_rng->uniformFloat(-0.1f, 0.1f));
        }
        time = std::max(0.0f, time);
        checkSample(input, StandardTrajectorySample(time, angle, speed), m_bestResultInfo.time);
    }
}

void StandardSampler::computePrecomputed(const TrajectoryInput &input)
{
    // check points randomly around the last frames result to improve it
    for (int i = 0;i<20;i++) {
        float angle, time;
        Vector speed;

        const StandardSamplerBestTrajectoryInfo &info = m_bestResultInfo;
        const float RADIUS = 0.2f;
        Vector chosenMidSpeed = info.sample.getMidSpeed();
        while (chosenMidSpeed.lengthSquared() > input.maxSpeedSquared) {
            chosenMidSpeed *= 0.9f;
        }
        do {
            speed = chosenMidSpeed + Vector(m_rng->uniformFloat(-RADIUS, RADIUS), m_rng->uniformFloat(-RADIUS, RADIUS));
        } while (speed.lengthSquared() >= input.maxSpeedSquared);
        angle = info.sample.getAngle() + m_rng->uniformFloat(-0.1f, 0.1f);
        time = std::max(0.0001f, info.sample.getTime() + m_rng->uniformFloat(-0.1f, 0.1f));


        checkSample(input, StandardTrajectorySample(time, angle, speed), m_bestResultInfo.time);
    }

    // check pre-computed points
    float distance = input.distance.length();
    for (const auto &segment : m_precomputedPoints) {
        if (segment.minDistance <= distance && segment.maxDistance >= distance) {
            for (const auto &sample : segment.precomputedPoints) {
                StandardTrajectorySample denormalized = sample.denormalize(input);
                if (denormalized.getMidSpeed().lengthSquared() >= input.maxSpeedSquared) {
                    denormalized.setMidSpeed(denormalized.getMidSpeed().normalized() * input.maxSpeed);
                }
                checkSample(input, denormalized, m_bestResultInfo.time);
            }
            break;
        }
    }
}

Vector StandardSampler::randomSpeed(float maxSpeed)
{
    Vector testSpeed;
    do {
        testSpeed.x = m_rng->uniformFloat(-maxSpeed, maxSpeed);
        testSpeed.y = m_rng->uniformFloat(-maxSpeed, maxSpeed);
    } while (testSpeed.lengthSquared() > maxSpeed * maxSpeed);
    return testSpeed;
}

float StandardSampler::trajectoryScore(float time, bool isNearObstacle, bool isEndFarFromObstacle)
{
    float obstacleDistExtraTime = 1;
    if (isNearObstacle && isEndFarFromObstacle) {
        obstacleDistExtraTime = OBSTACLE_AVOIDANCE_BONUS;
    }
    float biasedTrajectoryTime = time * obstacleDistExtraTime;
    return biasedTrajectoryTime;
}

float StandardSampler::checkSample(const TrajectoryInput &input, const StandardTrajectorySample &sample, const float currentBestTime)
{
    const float bestTime = std::min(m_directTrajectoryScore, currentBestTime);

    // do not use this minimum time improvement for very low distances
    const float MINIMUM_TIME_IMPROVEMENT = input.distance.lengthSquared() > 1 ? 0.05f : 0.0f;

    // construct second part from mid point data
    if (sample.getTime() < 0) {
        return -1;
    }

    const float slowDownTime = input.exponentialSlowDown ? SpeedProfile::SLOW_DOWN_TIME : 0;
    SpeedProfile secondPart = AlphaTimeTrajectory::calculateTrajectory(sample.getMidSpeed(), input.v1, sample.getTime(),
                                                                       sample.getAngle(), input.acceleration, input.maxSpeed, slowDownTime, true);

    float secondPartTime = secondPart.time();
    Vector secondPartOffset = secondPart.endPos();
    if (secondPartTime > bestTime - MINIMUM_TIME_IMPROVEMENT) {
        return -1;
    }

    // calculate first part trajectory
    Vector firstPartPosition = input.distance - secondPartOffset;
    float firstPartSlowDownTime = input.exponentialSlowDown ? std::max(0.0f, SpeedProfile::SLOW_DOWN_TIME - secondPartTime) : 0.0f;
    SpeedProfile firstPart = AlphaTimeTrajectory::findTrajectory(input.v0, sample.getMidSpeed(), firstPartPosition, input.acceleration,
                                                                 input.maxSpeed, firstPartSlowDownTime, false, false);
    if (!firstPart.isValid()) {
        return -1;
    }

    float firstPartTime = firstPart.time();
    if (firstPartTime + secondPartTime > bestTime - MINIMUM_TIME_IMPROVEMENT) {
        return -1;
    }
    // TODO: end point might also be close to the target?
    ZonedIntersection firstPartIntersection = m_world.minObstacleDistance(firstPart, input.t0, input.s0, OBSTACLE_AVOIDANCE_RADIUS).first;
    if (firstPartIntersection == ZonedIntersection::IN_OBSTACLE) {
        return -1;
    }
    // TODO: calculate the offset while calculating the trajectory
    auto secondPartIntersection = m_world.minObstacleDistance(secondPart, input.t0 + firstPartTime, input.s1 - secondPartOffset, OBSTACLE_AVOIDANCE_RADIUS);
    if (secondPartIntersection.first == ZonedIntersection::IN_OBSTACLE) {
        return -1;
    }
    bool anyNearObstacle = firstPartIntersection == ZonedIntersection::NEAR_OBSTACLE || secondPartIntersection.first == ZonedIntersection::NEAR_OBSTACLE;
    float biasedTrajectoryTime = trajectoryScore(firstPartTime + secondPartTime, anyNearObstacle, secondPartIntersection.second == ZonedIntersection::FAR_AWAY);
    if (biasedTrajectoryTime > bestTime - MINIMUM_TIME_IMPROVEMENT) {
        return -1;
    }

    // trajectory is possible, better than previous trajectory
    m_bestResultInfo.time = biasedTrajectoryTime;
    m_bestResultInfo.valid = true;
    m_bestResultInfo.sample = sample;

    m_generationInfo.clear();
    m_generationInfo.push_back(TrajectoryGenerationInfo(firstPart, firstPartPosition));
    m_generationInfo.push_back(TrajectoryGenerationInfo(secondPart, secondPartOffset));
    return biasedTrajectoryTime;
}

void PrecomputationSegmentInfo::serialize(pathfinding::StandardSamplerPrecomputationSegment *segment) const
{
    segment->set_min_distance(minDistance);
    segment->set_max_distance(maxDistance);
    for (const auto &sample : precomputedPoints) {
        sample.serialize(segment->add_precomputed_points());
    }
}

void PrecomputationSegmentInfo::deserialize(const pathfinding::StandardSamplerPrecomputationSegment &segment)
{
    if (segment.has_min_distance()) {
        minDistance = segment.min_distance();
    }
    if (segment.has_max_distance()) {
        maxDistance = segment.max_distance();
    }
    for (const auto &point : segment.precomputed_points()) {
        StandardTrajectorySample s;
        s.deserialize(point);
        precomputedPoints.push_back(s);
    }
}

void StandardTrajectorySample::serialize(pathfinding::StandardSamplerPoint *point) const {
    point->set_time(getTime());
    point->set_angle(getAngle());
    point->set_mid_speed_x(getMidSpeed().x);
    point->set_mid_speed_y(getMidSpeed().y);
}

void StandardTrajectorySample::deserialize(const pathfinding::StandardSamplerPoint &point)
{
    if (point.has_time()) {
        setTime(point.time());
    }
    if (point.has_angle()) {
        setAngle(point.angle());
    }
    if (point.has_mid_speed_x()) {
        midSpeed.x = point.mid_speed_x();
    }
    if (point.has_mid_speed_y()) {
        midSpeed.y = point.mid_speed_y();
    }
}

StandardTrajectorySample StandardTrajectorySample::denormalize(const TrajectoryInput &input) const
{
    StandardTrajectorySample normalized = *this;
    Vector toTarget = (input.s1 - input.s0).normalized();
    Vector sideWays = toTarget.perpendicular();
    normalized.setMidSpeed(toTarget * getMidSpeed().x - sideWays * getMidSpeed().y);
    normalized.setAngle(normalized.getAngle() + toTarget.angle());
    while (normalized.getAngle() > 2.0 * M_PI) normalized.setAngle(normalized.getAngle() - 2.0 * M_PI);
    while (normalized.getAngle() < 0) normalized.setAngle(normalized.getAngle() + 2 * M_PI);

    return normalized;
}
