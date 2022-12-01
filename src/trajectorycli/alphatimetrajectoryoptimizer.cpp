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
#include "path/trajectorypath.h"
#include "path/alphatimetrajectory.h"
#include "core/rng.h"

#include <memory>

static int evaluateSearch(const std::vector<Situation> &situations)
{
    int maxRobotId = 0;
    for (const auto &sit : situations) {
        maxRobotId = std::max(maxRobotId, sit.world.robotId());
    }
    std::vector<std::unique_ptr<TrajectoryPath>> pathfindings; // on per robot, as during normal ra usages
    for (int i = 0;i<maxRobotId + 1;i++) {
        pathfindings.push_back(std::make_unique<TrajectoryPath>(42, nullptr, pathfinding::None));
    }
    AlphaTimeTrajectory::searchIterationCounter = 0;
    for (auto &situation : situations) {
        auto &path = pathfindings[situation.world.robotId()];
        path->world() = situation.world;
        path->world().collectObstacles();

        const auto &input = situation.input;
        path->calculateTrajectory(input.start.pos, input.start.speed, input.target.pos, input.target.speed, input.maxSpeed, input.acceleration);
    }

    return AlphaTimeTrajectory::searchIterationCounter;
}

void optimizeAlphaTimeTrajectoryParameters(std::vector<Situation> situations)
{
    std::function<void(std::vector<Situation>&)> initial = [](const std::vector<Situation> &situations) {
        evaluateSearch(situations);
    };
    std::function<float(std::vector<Situation>&)> computeScore = [](const std::vector<Situation> &situations) {
        return evaluateSearch(situations);
    };
    optimizeParameters(situations, ParameterCategory::AlphaTimeTrajectoryParameter, initial, computeScore);
}
