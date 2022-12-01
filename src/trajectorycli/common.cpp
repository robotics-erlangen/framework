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
#include "core/rng.h"

void optimizeParameters(std::vector<Situation> situations, ParameterCategory category,
                        std::function<void(std::vector<Situation>&)> initialRun,
                        std::function<float(std::vector<Situation>&)> computeScore)
{
    for (Situation &situation : situations) {
        situation.world.collectObstacles();
    }

    std::cout <<"Finding optimizable parameters"<<std::endl;
    DynamicSearchParameters::beginRegistering(category);

    initialRun(situations);

    auto parameterDefs = DynamicSearchParameters::stopRegistering();

    std::vector<std::pair<ParameterIdentifier, float>> bestParameters;
    for (const auto &def : parameterDefs) {
        bestParameters.push_back({def.identifier, def.defaultValue});
    }

    DynamicSearchParameters::setParameters(bestParameters);
    float bestScore = computeScore(situations);

    std::cout <<"The default parameters have a score of: "<<bestScore / situations.size()<<std::endl;

    if (parameterDefs.size() == 0) {
        std::cout <<"No parameters found for this optimization target, terminating!"<<std::endl;
        return;
    }

    std::cout <<"Searching for better parameters..."<<std::endl;

    RNG rng(42);
    // run until there was no improvement for x iterations
    for (int i = 0;i<300;i++) {
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

        DynamicSearchParameters::setParameters(testParameters);
        float score = computeScore(situations);

        if (score < bestScore) {
            std::cout <<std::endl<<std::endl;
            std::cout <<"Found better parameters with score: \t"<<score / situations.size()<<std::endl;
            for (unsigned int i = 0;i<parameterDefs.size();i++) {
                std::cout <<parameterDefs[i].identifier.first<<": "<<parameterDefs[i].identifier.second<<": "<<testParameters[i].second<<std::endl;
            }
            bestScore = score;
            bestParameters = testParameters;
            i = 0;
        }
    }
}
