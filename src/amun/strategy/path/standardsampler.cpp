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

StandardSampler::StandardSampler(RNG *rng, const WorldInformation &world, PathDebug &debug) :
    TrajectorySampler(rng, world, debug)
{ }

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

    computeLive(input, lastTrajectoryInfo);

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
            if (rand() % 2 == 0) {
                speed = defaultSpeed;
            } else {
                speed = randomSpeed(input.maxSpeed);
            }
            angle = m_rng->uniformFloat(0, float(2 * M_PI));
            // TODO: adjust max time
            float maxTime = m_bestResultInfo.valid ? std::max(0.01f, m_bestResultInfo.time - 0.1f) : 5.0f;
            // TODO: dont sample invalid times
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
        checkSample(input, StandardTrajectorySample(time, angle, speed), m_bestResultInfo.time);
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

float StandardSampler::checkSample(const TrajectoryInput &input, const StandardTrajectorySample &sample, const float currentBestTime)
{
    // construct second part from mid point data
    if (!AlphaTimeTrajectory::isInputValidFastEndSpeed(sample.getMidSpeed(), input.v1, sample.getTime(), input.acceleration)) {
        return -1;
    }
    SpeedProfile secondPart = AlphaTimeTrajectory::calculateTrajectoryFastEndSpeed(sample.getMidSpeed(), input.v1, sample.getTime(),
                                                                                   sample.getAngle(), input.acceleration, input.maxSpeed);
    float secondPartTime;
    Vector secondPartOffset;
    // TODO: this code duplication is not good
    const float slowDownTime = input.exponentialSlowDown ? AlphaTimeTrajectory::SLOW_DOWN_TIME : 0;
    if (input.exponentialSlowDown) {
        secondPartTime = secondPart.timeWithSlowDown(AlphaTimeTrajectory::SLOW_DOWN_TIME);
        // TODO: specialized method for this
        secondPartOffset = secondPart.positionForTimeSlowDown(secondPartTime, AlphaTimeTrajectory::SLOW_DOWN_TIME);
    } else {
        secondPartTime = secondPart.time();
        secondPartOffset = secondPart.positionForTime(secondPartTime);
    }
    if (secondPartTime > currentBestTime) {
        return -1;
    }

    // calculate first part trajectory
    Vector firstPartPosition = input.distance - secondPartOffset;
    float firstPartSlowDownTime = input.exponentialSlowDown ? std::max(0.0f, AlphaTimeTrajectory::SLOW_DOWN_TIME - secondPartTime) : 0.0f;
    SpeedProfile firstPart = AlphaTimeTrajectory::findTrajectoryExactEndSpeed(input.v0, sample.getMidSpeed(), firstPartPosition, input.acceleration,
                                                                              input.maxSpeed, firstPartSlowDownTime);
    if (!firstPart.isValid()) {
        return -1;
    }
    float firstPartTime;
    if (input.exponentialSlowDown && firstPartSlowDownTime > 0) {
        firstPartTime = firstPart.timeWithSlowDown(firstPartSlowDownTime);
    } else {
        firstPartTime = firstPart.time();
    }
    if (firstPartTime + secondPartTime > currentBestTime) {
        return -1;
    }
    float firstPartObstacleDist = m_world.minObstacleDistance(firstPart, 0, firstPartSlowDownTime, input.s0).first;
    if (firstPartObstacleDist <= 0) {
        return -1;
    }
    // TODO: calculate the offset while calculating the trajectory
    auto secondPartObstacleDistances = m_world.minObstacleDistance(secondPart, firstPartTime, slowDownTime, input.s1 - secondPartOffset);
    if (secondPartObstacleDistances.first <= 0) {
        return -1;
    }
    float minObstacleDist = std::min(firstPartObstacleDist, secondPartObstacleDistances.first);
    float obstacleDistExtraTime = 1;
    if (minObstacleDist < OBSTACLE_AVOIDANCE_RADIUS && secondPartObstacleDistances.second > OBSTACLE_AVOIDANCE_RADIUS) {
        obstacleDistExtraTime = OBSTACLE_AVOIDANCE_BONUS;
    }
    float biasedTrajectoryTime = (firstPartTime + secondPartTime) * obstacleDistExtraTime;
    if (biasedTrajectoryTime > currentBestTime) {
        return -1;
    }

    // trajectory is possible, better than previous trajectory
    m_bestResultInfo.time = biasedTrajectoryTime;
    m_bestResultInfo.valid = true;
    m_bestResultInfo.sample = sample;

    m_generationInfo.clear();
    TrajectoryGenerationInfo infoFirstPart;
    infoFirstPart.profile = firstPart;
    infoFirstPart.slowDownTime = firstPartSlowDownTime;
    infoFirstPart.fastEndSpeed = false;
    infoFirstPart.desiredDistance = firstPartPosition;
    m_generationInfo.push_back(infoFirstPart);

    TrajectoryGenerationInfo infoSecondPart;
    infoSecondPart.profile = secondPart;
    infoSecondPart.slowDownTime = slowDownTime;
    infoSecondPart.fastEndSpeed = true;
    // TODO: this could go wrong if we want to stay at the current robot position
    infoSecondPart.desiredDistance = Vector(0, 0); // do not use desired distance calculation
    m_generationInfo.push_back(infoSecondPart);
    return biasedTrajectoryTime;
}
