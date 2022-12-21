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
#include "core/run_out_of_scope.h"

const float FAILURE_SCORE_FACTOR = 5;

static void showTotalScore(std::vector<Situation> allSituations)
{
    PathDebug debug;

    RNG rng{1};

    const int MAX_ROBOTS = 21;
    std::vector<WorldInformation> worlds{MAX_ROBOTS, WorldInformation{}};
    std::vector<PrecomputedStandardSampler> samplers;
    for (int i = 0;i<MAX_ROBOTS;i++) {
        samplers.emplace_back(&rng, worlds[i], debug);
    }

    int foundPath = 0;
    float partialScore = 0;
    float totalScore = 0;
    int counter = 0;
    for (auto &sit : allSituations) {
        rng.seed(++counter);

        PrecomputedStandardSampler &sampler = samplers.at(sit.world.robotId());
        WorldInformation &world = worlds.at(sit.world.robotId());
        world = sit.world;
        world.collectObstacles();
        if (sampler.compute(sit.input)) {
            foundPath++;

            // TODO: use a better metric here
            partialScore += sampler.getScore();
            totalScore += sampler.getScore();
        } else {
            const float failureScore = FAILURE_SCORE_FACTOR * sit.input.target.pos.distance(sit.input.start.pos);
            totalScore += failureScore;
        }
    }

    std::cout <<"Found soluation in "<<foundPath<<" / "<<allSituations.size()<<" situations"<<std::endl;
    std::cout <<"Average score: "<<(partialScore / foundPath)<<std::endl;
    std::cout <<"Score with failures: "<<(totalScore / allSituations.size())<<std::endl<<std::endl;
}

// new generalized optimization

using SamplerCache = std::vector<std::vector<std::pair<StandardTrajectorySample, StandardSampler::SampleScore>>>;
class CachingSampler : public PrecomputedStandardSampler
{
public:
    CachingSampler(RNG *rng, const WorldInformation &world, PathDebug &debug, SamplerCache &cache) :
        PrecomputedStandardSampler(rng, world, debug),
        cache(cache)
    { }

    void setSituationCounter(int counter) { situationCounter = counter; }

private:
    SampleScore checkSample(const TrajectoryInput &input, const StandardTrajectorySample &sample, const float currentBestTime) override
    {
        // TODO: dont duplicate
        const float MINIMUM_TIME_IMPROVEMENT = (input.target.pos - input.start.pos).lengthSquared() > 1 ? 0.05f : 0.0f;

        RUN_WHEN_OUT_OF_SCOPE({ sampleCounter++; });
        if (sampleCounter < cache[situationCounter].size() && cache[situationCounter][sampleCounter].first == sample) {
            const SampleScore cached = cache[situationCounter][sampleCounter].second;
            if (cached.type == ScoreType::EXACT || (cached.type == ScoreType::WORSE_THAN && cached.score > currentBestTime)) {

                if (cached.type == ScoreType::EXACT && cached.score < currentBestTime - MINIMUM_TIME_IMPROVEMENT && cached.score < std::numeric_limits<float>::max()) {
                    m_bestResultInfo.time = cached.score;
                    m_bestResultInfo.valid = true;
                    m_bestResultInfo.sample = sample;
                }

                return cached;
            }
        }
        const SampleScore result = StandardSampler::checkSample(input, sample, currentBestTime);
        if (sampleCounter < cache[situationCounter].size()) {
            cache[situationCounter][sampleCounter] = {sample, result};
        } else {
            cache[situationCounter].emplace_back(sample, result);
        }
        return result;
    }

    void computeSamples(const TrajectoryInput &input, const StandardSamplerBestTrajectoryInfo &lastBest) override
    {
        sampleCounter = 0;
        PrecomputedStandardSampler::computeSamples(input, lastBest);
    }

private:
    std::size_t sampleCounter = 0;
    std::size_t situationCounter = 0;
    SamplerCache &cache;
};

static float samplerScore(const std::vector<Situation> &situations, const PrecomputedStandardSampler &testSampler, SamplerCache &cache)
{
    PathDebug debug;
    RNG rng;

    const int MAX_ROBOTS = 21;
    std::vector<WorldInformation> worlds{MAX_ROBOTS, WorldInformation{}};
    std::vector<CachingSampler> samplers;
    for (int i = 0;i<MAX_ROBOTS;i++) {
        samplers.emplace_back(&rng, worlds[i], debug, cache);
        samplers.back().copyPrecomputation(testSampler);
    }

    float score = 0;
    int counter = 0;
    for (auto &sit : situations) {
        rng.seed(counter + 1);

        auto &sampler = samplers.at(sit.world.robotId());
        auto &world = worlds.at(sit.world.robotId());
        world = sit.world;
        world.collectObstacles();
        sampler.setSituationCounter(counter);
        if (sampler.compute(sit.input)) {
            // TODO: use a better metric here
            score += sampler.getScore();
        } else {
            const float failureScore = FAILURE_SCORE_FACTOR * sit.input.target.pos.distance(sit.input.start.pos);
            score += failureScore;
        }
        counter++;
    }
    return score / situations.size();
}

static void optimizeGeneric(const std::vector<Situation> &situations, const QString &outFilename)
{
    const int ITERATIONS_PER_SAMPLE = 200;
    const int TOTAL_RANDOM_PERCENTAGE = 10;

    std::vector<TrajectoryInput> allInputs{situations.size()};
    std::transform(situations.begin(), situations.end(), allInputs.begin(), [](auto &sit) { return sit.input; });

    WorldInformation world;
    PathDebug debug;
    RNG rng{1};
    PrecomputedStandardSampler sampler{&rng, world, debug};
    sampler.resetSamples();

    int numSamples = sampler.numSamples();
    for (int i = 0;i<numSamples;i++) {
        sampler.randomizeSample(i);
    }

    SamplerCache cache{situations.size()};
    float currentScore = samplerScore(situations, sampler, cache);
    int betterCounter = 0;
    for (std::size_t i = 0;;i++) {

        if ((i + 1) % (ITERATIONS_PER_SAMPLE * numSamples) == 0) {
            const bool hasSplit = sampler.trySplit(allInputs);
            numSamples = sampler.numSamples();
            if (hasSplit) {
                std::cout <<"Split into "<<numSamples<<" samples!"<<std::endl;
            }
        }

        PrecomputedStandardSampler testSampler{sampler};
        const int modifyId = i % numSamples;
        if (rng.uniformInt() % 100 < TOTAL_RANDOM_PERCENTAGE) {
            testSampler.randomizeSample(modifyId);
        } else {
            testSampler.modifySample(modifyId);
        }

        const float score = samplerScore(situations, testSampler, cache);
        if (score < currentScore) {
            currentScore = score;
            sampler.copyPrecomputation(testSampler);
            sampler.save(outFilename);
            if (betterCounter++ % 16 == 0) {
                std::cout <<"Found better: "<<score<<" at iteration: "<<i<<std::endl;
            }
        }
    }
}

void optimizeStandardSamplerPoints(const std::vector<Situation> &situations, const QString &outFilename)
{
    std::cout <<"Score of current precomputation:"<<std::endl;
    showTotalScore(situations);

    optimizeGeneric(situations, outFilename);
}
