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
#include "core/protobuffilesaver.h"
#include "config/config.h"
#include <QDebug>

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

    computeSamples(input, lastTrajectoryInfo);

    return m_bestResultInfo.valid;
}

LiveStandardSampler::LiveStandardSampler(RNG *rng, const WorldInformation &world, PathDebug &debug) :
    StandardSampler(rng, world, debug)
{ }

void LiveStandardSampler::computeSamples(const TrajectoryInput &input, const StandardSamplerBestTrajectoryInfo &lastFrameInfo)
{
    const Vector targetDistance = input.target.pos - input.start.pos;
    Vector defaultSpeed = targetDistance * (std::max(2.5f, targetDistance.length() / 2) / targetDistance.length());
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
            const float maxTime = m_bestResultInfo.valid ? std::max(0.01f, m_bestResultInfo.time - 0.1f) : 5.0f;

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

PrecomputedStandardSampler::PrecomputedStandardSampler(RNG *rng, const WorldInformation &world, PathDebug &debug) :
    StandardSampler(rng, world, debug)
{
    // load precomputed points
    ProtobufFileReader reader;
    reader.open(QString(ERFORCE_DATADIR) + "precomputation/standardsampler.prec", "KHONSU PRECOMPUTATION");
    pathfinding::StandardSamplerPrecomputation precomp;
    reader.readNext(precomp);
    for (const auto &a : precomp.segments()) {
        PrecomputationSegment segment;
        segment.deserialize(a);
        m_precomputation.push_back(segment);
    }

    // check validity
    assert (m_precomputation.size() > 0);
    for (const auto &segment : m_precomputation) {
        (void)segment;
        assert(segment.samples.size() == m_precomputation[0].samples.size());
    }
}

int PrecomputedStandardSampler::numSamples() const
{
    return m_precomputation.size() * m_precomputation[0].samples.size();
}

static constexpr float MAX_SPEED = 3.5f;
void PrecomputedStandardSampler::randomizeSample(int index)
{
    const int segment = index / m_precomputation[0].samples.size();
    const float maxDistance = m_precomputation[segment].maxDistance;

    StandardTrajectorySample &sample = getSample(index);
    sample.midSpeed = randomSpeed(MAX_SPEED);
    sample.time = m_rng->uniformFloat(0.001f, std::min(6.0f, 2.0f * maxDistance));
    sample.angle = m_rng->uniformFloat(0, 7);
}

void PrecomputedStandardSampler::modifySample(int index)
{
    StandardTrajectorySample &sample = getSample(index);

    const float radius = 0.1f;
    sample.midSpeed += m_rng->uniformVectorIn(Vector(-radius, -radius), Vector(radius, radius));
    if (sample.midSpeed.length() > MAX_SPEED) {
        sample.midSpeed = sample.midSpeed.normalized() * MAX_SPEED;
    }
    sample.time = std::max(0.001f, sample.time + m_rng->uniformFloat(-0.1f, 0.1f));
    sample.angle += m_rng->uniformFloat(-0.1f, 0.1f);
}

StandardTrajectorySample& PrecomputedStandardSampler::getSample(int i)
{
    assert(i >= 0 && i < numSamples());
    const int pointsPerSegment = m_precomputation[0].samples.size();
    return m_precomputation[i / pointsPerSegment].samples[i % pointsPerSegment];
}

void PrecomputedStandardSampler::save(QString filename) const
{
    pathfinding::StandardSamplerPrecomputation data;
    for (const auto &point : m_precomputation) {
        point.serialize(data.add_segments());
    }

    ProtobufFileSaver fileSaver(filename, "KHONSU PRECOMPUTATION");
    fileSaver.saveMessage(data);
}

void PrecomputedStandardSampler::resetSamples()
{
    PrecomputationSegment segment;
    segment.minDistance = 0;
    segment.maxDistance = std::numeric_limits<float>::infinity();
    segment.samples.push_back({});
    m_precomputation = {segment};
    randomizeSample(0);
}

bool PrecomputedStandardSampler::trySplit(const std::vector<TrajectoryInput> &inputs)
{
    const int MAX_SAMPLES = 32;
    const int MAX_SEGMENTS = 16;
    if (m_precomputation.size() == 1 && m_precomputation[0].samples.size() < MAX_SAMPLES) {
        auto &samples = m_precomputation[0].samples;
        samples.insert(samples.end(), samples.begin(), samples.end());
        return true;
    } else if (m_precomputation.size() < MAX_SEGMENTS) {
        std::vector<PrecomputationSegment> segments;
        for (const auto &segment : m_precomputation) {
            std::vector<float> distances;
            for (const auto &input : inputs) {
                const float dist = input.target.pos.distance(input.start.pos);
                if (dist >= segment.minDistance && dist <= segment.maxDistance) {
                    distances.push_back(dist);
                }
            }
            std::sort(distances.begin(), distances.end());

            const float midDistance = distances[distances.size() / 2];
            segments.push_back(segment);
            segments.back().maxDistance = midDistance;
            segments.push_back(segment);
            segments.back().minDistance = midDistance;
        }
        m_precomputation = segments;
        return true;
    }
    return false;
}

void PrecomputedStandardSampler::computeSamples(const TrajectoryInput &input, const StandardSamplerBestTrajectoryInfo&)
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
    const float targetDistance = (input.target.pos - input.start.pos).length();
    for (const auto &segment : m_precomputation) {
        if (segment.minDistance <= targetDistance && segment.maxDistance >= targetDistance) {
            for (const auto &sample : segment.samples) {
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

float StandardSampler::trajectoryScore(float time, float obstacleDistance)
{
    float obstacleDistExtraTime = 1;
    if (obstacleDistance < OBSTACLE_AVOIDANCE_RADIUS) {
        obstacleDistExtraTime = 1.0f + ((OBSTACLE_AVOIDANCE_RADIUS - obstacleDistance) / OBSTACLE_AVOIDANCE_RADIUS) * OBSTACLE_AVOIDANCE_BONUS;
    }
    const float biasedTrajectoryTime = time * obstacleDistExtraTime;
    return biasedTrajectoryTime;
}

StandardSampler::SampleScore StandardSampler::checkSample(const TrajectoryInput &input, const StandardTrajectorySample &sample, const float currentBestTime)
{
    const float bestTime = std::min(m_directTrajectoryScore, currentBestTime);

    // do not use this minimum time improvement for very low distances
    const float MINIMUM_TIME_IMPROVEMENT = (input.target.pos - input.start.pos).lengthSquared() > 1 ? 0.05f : 0.0f;

    // construct second part from mid point data
    if (sample.getTime() < 0) {
        return {ScoreType::EXACT, std::numeric_limits<float>::max()};
    }

    const float slowDownTime = input.exponentialSlowDown ? SlowdownAcceleration::SLOW_DOWN_TIME : 0;
    const RobotState secondStartState(Vector(0, 0), sample.getMidSpeed());
    Trajectory secondPart = AlphaTimeTrajectory::calculateTrajectory(secondStartState, input.target.speed, sample.getTime(),
                                                                     sample.getAngle(), input.acceleration, input.maxSpeed, slowDownTime, EndSpeed::FAST);

    const float secondPartTime = secondPart.time();
    const Vector secondPartOffset = secondPart.endPosition(); // startpos is (0, 0), computes offset of trajectory
    secondPart.setStartPos(input.target.pos - secondPartOffset);
    if (secondPartTime > bestTime - MINIMUM_TIME_IMPROVEMENT) {
        return {ScoreType::WORSE_THAN, secondPartTime};
    }

    // calculate first part trajectory
    const Vector firstPartTarget = input.target.pos - secondPartOffset;
    const float firstPartSlowDownTime = input.exponentialSlowDown ? std::max(0.0f, SlowdownAcceleration::SLOW_DOWN_TIME - secondPartTime) : 0.0f;
    const RobotState firstTargetState(firstPartTarget, sample.getMidSpeed());
    const auto firstPartOpt = AlphaTimeTrajectory::findTrajectory(input.start, firstTargetState, input.acceleration,
                                                                  input.maxSpeed, firstPartSlowDownTime, EndSpeed::EXACT);
    if (!firstPartOpt) {
        return {ScoreType::EXACT, std::numeric_limits<float>::max()};
    }
    const Trajectory &firstPart = firstPartOpt.value();

    const float firstPartTime = firstPart.time();
    if (firstPartTime + secondPartTime > bestTime - MINIMUM_TIME_IMPROVEMENT) {
        return {ScoreType::WORSE_THAN, firstPartTime + secondPartTime};
    }
    // TODO: end point might also be close to the target?
    const float firstPartDistance = m_world.minObstacleDistance(firstPart, input.t0, OBSTACLE_AVOIDANCE_RADIUS).first;
    if (firstPartDistance < 0) {
        return {ScoreType::EXACT, std::numeric_limits<float>::max()};
    }
    // TODO: calculate the offset while calculating the trajectory
    const float secondPartDistance = m_world.minObstacleDistance(secondPart, input.t0 + firstPartTime, OBSTACLE_AVOIDANCE_RADIUS).first;
    if (secondPartDistance < 0) {
        return {ScoreType::EXACT, std::numeric_limits<float>::max()};
    }
    const float obstacleDist = std::min(firstPartDistance, secondPartDistance);
    const float biasedTrajectoryTime = trajectoryScore(firstPartTime + secondPartTime, obstacleDist);
    if (biasedTrajectoryTime > bestTime - MINIMUM_TIME_IMPROVEMENT) {
        return {ScoreType::EXACT, biasedTrajectoryTime};
    }

    // trajectory is possible, better than previous trajectory
    m_bestResultInfo.time = biasedTrajectoryTime;
    m_bestResultInfo.valid = true;
    m_bestResultInfo.sample = sample;

    m_result.clear();
    m_result.push_back(firstPart);
    m_result.push_back(secondPart);
    return {ScoreType::EXACT, biasedTrajectoryTime};
}

void PrecomputedStandardSampler::PrecomputationSegment::serialize(pathfinding::StandardSamplerPrecomputationSegment *segment) const
{
    segment->set_min_distance(minDistance);
    segment->set_max_distance(maxDistance);
    for (const auto &sample : samples) {
        sample.serialize(segment->add_precomputed_points());
    }
}

void PrecomputedStandardSampler::PrecomputationSegment::deserialize(const pathfinding::StandardSamplerPrecomputationSegment &segment)
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
        samples.push_back(s);
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
    const Vector toTarget = (input.target.pos - input.start.pos).normalized();
    const Vector sideWays = toTarget.perpendicular();
    normalized.setMidSpeed(toTarget * getMidSpeed().x - sideWays * getMidSpeed().y);
    normalized.setAngle(normalized.getAngle() + toTarget.angle());
    while (normalized.getAngle() > 2.0 * M_PI) normalized.setAngle(normalized.getAngle() - 2.0 * M_PI);
    while (normalized.getAngle() < 0) normalized.setAngle(normalized.getAngle() + 2 * M_PI);

    return normalized;
}
