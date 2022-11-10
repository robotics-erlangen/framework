/***************************************************************************
 *   Copyright 2022 Andreas Wendler                                        *
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
#include "path/trajectorypath.h"
#include "core/timer.h"

void checkTiming(std::vector<Situation> situations)
{
    qint64 timeDiff = 0;
    const int ITERATIONS = 1;

    for (int i = 0;i<ITERATIONS;i++) {
        int maxRobotId = 0;
        for (const auto &sit : situations) {
            maxRobotId = std::max(maxRobotId, sit.world.robotId());
        }
        std::vector<std::unique_ptr<TrajectoryPath>> pathfindings; // on per robot, as during normal ra usages
        for (int i = 0;i<maxRobotId + 1;i++) {
            pathfindings.push_back(std::make_unique<TrajectoryPath>(42, nullptr, pathfinding::None));
        }

        const qint64 startTime = Timer::systemTime();

        for (const auto &situation : situations) {
            auto &path = pathfindings[situation.world.robotId()];
            path->world() = situation.world;

            const auto &input = situation.input;
            path->calculateTrajectory(input.start.pos, input.start.speed, input.target.pos, input.target.speed, input.maxSpeed, input.acceleration);
        }

        const qint64 endTime = Timer::systemTime();
        timeDiff += endTime - startTime;
    }

    const float iterationTimeMs = (timeDiff / situations.size()) / 1000000.0f;
    std::cout <<"Time: "<<iterationTimeMs / ITERATIONS<<" ms per call"<<std::endl;
}
