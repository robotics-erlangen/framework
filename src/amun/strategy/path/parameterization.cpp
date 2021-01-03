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

#include "parameterization.h"

#include <algorithm>

#ifdef ACTIVE_PATHFINDING_PARAMETER_OPTIMIZATION
DynamicSearchParameters DynamicSearchParameters::instance;

float DynamicSearchParameters::getParameterRegistering(float rangeMin, float currentDefault, float rangeMax, const char* file, int line, int counter)
{
    ParameterIdentifier id(file, line);
    if (instance.m_currentlyRegistering) {
        for (const auto &def : instance.m_parameterDefinitions) {
            if (def.identifier == id) {
                if (def.counter != counter) {
                    std::cerr <<"ERROR: Two paramters must not be defined in the same line!!"<<std::endl;
                    exit(1);
                }
                return currentDefault;
            }
        }
        ParameterDefinition definition;
        definition.rangeMin = rangeMin;
        definition.rangeMax = rangeMax;
        definition.defaultValue = currentDefault;
        definition.identifier = id;
        definition.counter = counter;
        instance.m_parameterDefinitions.push_back(definition);
        return currentDefault;
    } else {
        for (const auto &parameter : instance.m_parameters) {
            if (parameter.first == id) {
                return parameter.second;
            }
        }
        // should not happen if the parameters are properly collected and registered
        return currentDefault;
    }
}

std::vector<ParameterDefinition> DynamicSearchParameters::stopRegistering()
{
    instance.m_currentlyRegistering = false;
    // sort parameters to be consistent across different executions
    std::sort(instance.m_parameterDefinitions.begin(), instance.m_parameterDefinitions.end());
    return instance.m_parameterDefinitions;
}

#endif
