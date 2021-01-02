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

#include "endinobstacleoptimizer.h"
#include "path/parameterization.h"
#include "path/endinobstaclesampler.h"
#include "core/rng.h"

#include <iostream>
#include <memory>
#include <QDebug>

const static float INVALID_COST = 10;

static float evaluateParameters(const std::vector<float> &optimalValues, const std::vector<std::pair<ParameterIdentifier, float>> &parameters,
                           const std::vector<Situation> &situations)
{
    DynamicSearchParameters::setParameters(parameters);

    // TODO: this will not work if we have robots of the same id in the two teams
    int maxRobotId = 0;
    for (const auto &sit : situations) {
        maxRobotId = std::max(maxRobotId, sit.world.robotId());
    }

    RNG rng(42);
    PathDebug debug;
    WorldInformation world;

    std::vector<std::unique_ptr<EndInObstacleSampler>> samplers; // on per robot, as during normal ra usages
    for (int i = 0;i<maxRobotId + 1;i++) {
        samplers.push_back(std::make_unique<EndInObstacleSampler>(&rng, world, debug));
    }

    float totalDistance = 0;
    for (int i = 0;i<(int)situations.size();i++) {
        const auto &situation = situations[i];
        world = situation.world;
        world.collectObstacles();
        world.collectMovingObstacles();

        EndInObstacleSampler &sampler = *samplers[world.robotId()].get();

        bool valid = sampler.compute(situation.input);
        float cost;
        if (!valid) {
            cost = INVALID_COST - optimalValues[i];
        } else {
            cost = sampler.getTargetDistance() - optimalValues[i];
        }
        totalDistance += cost; // squared error or other metrics are also possible here
    }
    return totalDistance;
}

void optimizeEndInObstacleParameters(std::vector<Situation> situations)
{
    std::cout <<"Computing optimal scenario solutions"<<std::endl;
    DynamicSearchParameters::beginRegistering(ParameterCategory::EndInObstacleSamplerParameter);
    std::vector<float> optimalDistances;
    for (auto &situation : situations) {

        situation.world.collectObstacles();
        situation.world.collectMovingObstacles();

        RNG rng(42);
        PathDebug debug;
        EndInObstacleSampler sampler(&rng, situation.world, debug);
        for (int i = 0;i<50;i++) {
            sampler.compute(situation.input);
        }
        bool valid = sampler.compute(situation.input);
        if (valid) {
            optimalDistances.push_back(sampler.getTargetDistance());
        } else {
            optimalDistances.push_back(INVALID_COST);
        }
    }

    auto parameterDefs = DynamicSearchParameters::stopRegistering();

    std::vector<std::pair<ParameterIdentifier, float>> bestParameters;
    for (const auto &def : parameterDefs) {
        bestParameters.push_back({def.identifier, def.defaultValue});
    }
    float bestExtraDistance = evaluateParameters(optimalDistances, bestParameters, situations);

    std::cout <<"The default parameters have a score of: "<<bestExtraDistance / situations.size()<<std::endl;
    std::cout <<"Searching for better parameters..."<<std::endl;

    RNG rng(42);
    // run until there was no improvement for x iterations
    for (int i = 0;i<200;i++) {
        auto testParameters = bestParameters;
        if (rng.uniformInt() % 5 == 0 && i > 10) {
            for (unsigned int i = 0;i<parameterDefs.size();i++) {
                testParameters[i].second = rng.uniformFloat(parameterDefs[i].rangeMin, parameterDefs[i].rangeMax);
            }
        } else {
            float radiusFactor = rng.uniformFloat(0.01f, 0.2f);
            for (unsigned int i = 0;i<parameterDefs.size();i++) {
                float radius = radiusFactor * (parameterDefs[i].rangeMax - parameterDefs[i].rangeMin);
                testParameters[i].second += rng.uniformFloat(-radius, radius);
                testParameters[i].second = std::min(std::max(testParameters[i].second, parameterDefs[i].rangeMin), parameterDefs[i].rangeMax);
            }
        }

        float totalDistance = evaluateParameters(optimalDistances, testParameters, situations);

        if (totalDistance < bestExtraDistance) {
            std::cout <<std::endl<<std::endl;
            std::cout <<"Found better parameters with average error: \t"<<totalDistance / situations.size()<<std::endl;
            for (unsigned int i = 0;i<parameterDefs.size();i++) {
                std::cout <<parameterDefs[i].identifier.first<<": "<<parameterDefs[i].identifier.second<<": "<<testParameters[i].second<<std::endl;
            }
            bestExtraDistance = totalDistance;
            bestParameters = testParameters;
            i = 0;
        }
    }
}
