/***************************************************************************
 *   Copyright 2020 Andreas Wendler                                        *
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

#include "common.h"
#include "path/standardsampler.h"
#include "core/protobuffilesaver.h"
#include "core/rng.h"

const static float GENERAL_MAX_SPEED = 3.5f;

static StandardTrajectorySample randomSample(RNG &rng, float maxSpeed, float maxDistance)
{
    Vector currentMidSpeed = Vector(rng.uniformFloat(-maxSpeed, maxSpeed),
                         rng.uniformFloat(-maxSpeed, maxSpeed));
    while (currentMidSpeed.length() > maxSpeed) {
        currentMidSpeed *= 0.9f;
    }
    float currentTime = rng.uniformFloat(0.001f, std::min(6.0f, 2.0f * maxDistance));
    float currentAngle = rng.uniformFloat(0, 7);

    return StandardTrajectorySample(currentTime, currentAngle, currentMidSpeed);
}

static StandardTrajectorySample modifySample(const StandardTrajectorySample &input, RNG &rng, const float radius, const float maxSpeed)
{
    StandardTrajectorySample point = input;
    point.setMidSpeed(point.getMidSpeed() + Vector(rng.uniformFloat(-radius, radius), rng.uniformFloat(-radius, radius)));
    while (point.getMidSpeed().length() > maxSpeed) {
        point.setMidSpeed(point.getMidSpeed() * 0.95f);
    }
    point.setTime(std::max(0.001f, point.getTime() + rng.uniformFloat(-0.1f, 0.1f)));
    point.setAngle(point.getAngle() + rng.uniformFloat(-0.1f, 0.1f));
    return point;
}

// optimization
static std::vector<float> evaluateSample(RNG &rng, const std::vector<Situation> &scenarios, const StandardTrajectorySample &sample)
{
    std::vector<float> result;
    for (const auto &s : scenarios) {
        StandardTrajectorySample denormalized = sample.denormalize(s.input);

        if (denormalized.getMidSpeed().lengthSquared() >= s.input.maxSpeedSquared) {
            denormalized.setMidSpeed(denormalized.getMidSpeed().normalized() * s.input.maxSpeed);
        }
        PathDebug debug;
        // do not load the precomputation file every time for this
        StandardSampler sampler(&rng, s.world, debug, false);

        float sampleResult = sampler.checkSample(s.input, denormalized, std::numeric_limits<float>::max());
        if (sampleResult >= 0) {
            result.push_back(sampleResult);
        } else {
            result.push_back(std::numeric_limits<float>::max());
        }
    }
    return result;
}

static std::vector<StandardTrajectorySample> optimize(RNG &rng, std::vector<Situation> &scenarios, float maxDistance)
{
    const std::size_t TARGET_POINT_COUNT = 30;
    const std::size_t SAMPLE_TEST_COUNT = 20000;
    const int TOTAL_RANDOM_PERCENTAGE = 30;

    const float INF = std::numeric_limits<float>::max();

    std::vector<StandardTrajectorySample> result;

    std::vector<std::vector<float>> currentValues(TARGET_POINT_COUNT);

    // initialize with random samples
    for (std::size_t i = 0;i<TARGET_POINT_COUNT;i++) {
        result.push_back(randomSample(rng, GENERAL_MAX_SPEED, maxDistance));

        currentValues[i] = evaluateSample(rng, scenarios, result.back());
    }

    for (std::size_t i = 0;i<SAMPLE_TEST_COUNT;i++) {
        // generate sample to test
        const std::size_t modifyId = rand() % TARGET_POINT_COUNT;
        StandardTrajectorySample modified;
        if (rand() % 100 < TOTAL_RANDOM_PERCENTAGE) {
            modified = randomSample(rng, GENERAL_MAX_SPEED, maxDistance);
        } else {
            const float RADIUS = 0.15f;
            modified = modifySample(result[modifyId], rng, RADIUS, GENERAL_MAX_SPEED);
        }

        // evaluate
        std::vector<float> times = evaluateSample(rng, scenarios, modified);

        // check if it is an improvement
        float totalGain = 0;
        int foundCount = 0;
        float foundTotalTime = 0;
        for (std::size_t j = 0;j<scenarios.size();j++) {
            float minTimeWithout = INF;
            float totalMinTime = INF;

            for (std::size_t i = 0;i<TARGET_POINT_COUNT;i++) {
                if (i != modifyId) {
                    minTimeWithout = std::min(minTimeWithout, currentValues[i][j]);
                }
                totalMinTime = std::min(totalMinTime, currentValues[i][j]);
            }

            if (totalMinTime < INF) {
                foundCount++;
                foundTotalTime += totalMinTime;
            }

            float before = totalMinTime;
            float after = std::min(minTimeWithout, times[j]);
            if (before < INF && after == INF) {
                totalGain -= std::max(0.4f, 8 * maxDistance - before);
            } else if (before == INF && after < INF) {
                totalGain += std::max(0.4f, 4 * maxDistance - after);
            } else if (before < INF && after < INF) {
                totalGain += before - after;
            }
        }

        // change values if the current sample is better
        //std::cout <<totalGain<<std::endl;
        if (totalGain > 0) {
            result[modifyId] = modified;
            currentValues[modifyId] = times;

            if (rand() % 50 == 0) {
                std::cout <<"Found better: "<<foundCount<<" and "<<foundTotalTime / foundCount<<std::endl;
            }
        }
    }

    return result;
}

constexpr std::size_t SCENARIO_SEGMENTS = 20;
constexpr float MAX_DISTANCE = 8.0f;

static std::vector<std::vector<Situation>> segmentSituations(const std::vector<Situation> &situations)
{
    std::vector<std::vector<Situation>> segmentedSituations;
    for (std::size_t i = 0;i<SCENARIO_SEGMENTS;i++) {
        segmentedSituations.push_back({});
    }
    for (const auto &s : situations) {
        float distance = s.input.s0.distance(s.input.s1);
        std::size_t segment = static_cast<std::size_t>(SCENARIO_SEGMENTS * distance / MAX_DISTANCE);
        segment = std::min(SCENARIO_SEGMENTS-1, segment);
        segmentedSituations[segment].push_back(s);
    }
    return segmentedSituations;
}

//  sorts the input into two categories: <situations which have a solution, those without one>
static std::pair<std::vector<Situation>, std::vector<Situation>> checkPossible(const std::vector<Situation> &situations)
{
    const std::size_t ITERATIONS = 5000;

    std::vector<Situation> possible;
    std::vector<Situation> impossible = situations;

    RNG rng;
    for (std::size_t i = 0;i<ITERATIONS;i++) {
        for (auto & a : impossible) {
            a.world.collectObstacles();
            a.world.collectMovingObstacles();
        }
        auto result = evaluateSample(rng, impossible, randomSample(rng, GENERAL_MAX_SPEED, 10));
        std::vector<Situation> nextImpossible;
        for (std::size_t j = 0;j<result.size();j++) {
            if (result[j] < std::numeric_limits<float>::max()) {
                possible.push_back(impossible[j]);
            } else {
                nextImpossible.push_back(impossible[j]);
            }
        }
        impossible = nextImpossible;
    }

    return {possible, impossible};
}

static void saveResult(const std::vector<PrecomputationSegmentInfo> &segments, const QString &outFilename)
{
    pathfinding::StandardSamplerPrecomputation data;
    for (const auto &point : segments) {
        point.serialize(data.add_segments());
    }

    ProtobufFileSaver fileSaver(outFilename, "KHONSU PRECOMPUTATION");
    fileSaver.saveMessage(data);
}

void optimizeStandardSamplerPoints(const std::vector<Situation> &situations, const QString &outFilename)
{
    auto seperated = checkPossible(situations);
    auto segmentedSituations = segmentSituations(seperated.first);

    RNG rng;

    std::size_t i = 0;
    std::vector<PrecomputationSegmentInfo> result;
    for (auto &sc : segmentedSituations) {

        // collect obstacles, do this as late as possible to avoid changes to the memory where obstacles are stored (due to copying situations)
        for (auto &s : sc) {
            s.world.collectObstacles();
            s.world.collectMovingObstacles();
        }

        float minDist = float(i) * MAX_DISTANCE / SCENARIO_SEGMENTS;
        float maxDist = float(i+1) * MAX_DISTANCE / SCENARIO_SEGMENTS;
        std::cout <<"Compute segment "<<minDist<<" -> "<<maxDist<<", size "<<sc.size()<<std::endl;
        auto points = optimize(rng, sc, maxDist);

        PrecomputationSegmentInfo segmentResult;
        segmentResult.minDistance = minDist;
        segmentResult.maxDistance = i == SCENARIO_SEGMENTS-1 ? std::numeric_limits<float>::max() : maxDist;
        segmentResult.precomputedPoints = points;
        result.push_back(segmentResult);

        i++;
    }

    saveResult(result, outFilename);
}
