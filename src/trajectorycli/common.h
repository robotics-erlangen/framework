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

#pragma once

#include "path/trajectorysampler.h"
#include "path/parameterization.h"
#include "protobuf/pathfinding.pb.h"

#include <vector>
#include <functional>

struct Situation {
    WorldInformation world;
    TrajectoryInput input;
    pathfinding::InputSourceType sourceType;
};

// generic paramter optimization
void optimizeParameters(std::vector<Situation> situations, ParameterCategory category,
                        std::function<void(std::vector<Situation>&)> initialRun,
                        std::function<float(std::vector<Situation>&)> computeScore);

void optimizeStandardSamplerPoints(const std::vector<Situation> &situations, const QString &outFilename);

void optimizeEndInObstacleParameters(std::vector<Situation> situations);

void optimizeAlphaTimeTrajectoryParameters(std::vector<Situation> situations);
