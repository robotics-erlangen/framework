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
#include "path/parameterization.h"
#include "path/endinobstaclesampler.h"
#include "core/rng.h"

#include <iostream>
#include <memory>
#include <QDebug>

const static float INVALID_COST = 10;

static float evaluateParameters(const std::vector<float> &optimalValues, const std::vector<Situation> &situations)
{
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
    std::vector<float> optimalDistances;

    std::function<void(std::vector<Situation>&)> initial = [&optimalDistances](const std::vector<Situation> &situations) {
        for (const Situation &situation : situations) {
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
    };

    std::function<float(std::vector<Situation>&)> computeScore = [&optimalDistances](const std::vector<Situation> &situations) {
        return evaluateParameters(optimalDistances, situations);
    };

    optimizeParameters(situations, ParameterCategory::EndInObstacleSamplerParameter, initial, computeScore);
}
