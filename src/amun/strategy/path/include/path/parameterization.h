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

#include <vector>
#include <map>
#include <string>
#include <iostream>


#ifndef ACTIVE_PATHFINDING_PARAMETER_OPTIMIZATION

// every parameter MUST be defined in a separate line
#define PARAMETER(category, rangeMin, currentValue, rangeMax) currentValue

#else

enum ParameterCategory {
    AlphaTimeTrajectoryParameter,
    EndInObstacleSamplerParameter,
    None
};

#define PARAMETER(category, rangeMin, currentValue, rangeMax) DynamicSearchParameters::getParameter(category ## Parameter, rangeMin, currentValue, rangeMax, __FILE__, __LINE__, __COUNTER__)

// file in which the paramter is defined and the corresponding line in that file
using ParameterIdentifier = std::pair<const char*, int>;

struct ParameterDefinition {
    float rangeMin, rangeMax;
    float defaultValue;
    ParameterIdentifier identifier;
    int counter;

    bool operator<(const ParameterDefinition &other) const {
        return identifier < other.identifier;
    }
};


// a singleton class providing the search parameters while they are being optimized
// must only be used in single-threaded execution, not during normal usage of ra
class DynamicSearchParameters {
public:
    DynamicSearchParameters(const DynamicSearchParameters &other) = delete;
    DynamicSearchParameters(DynamicSearchParameters &&other) = delete;
    void operator=(const DynamicSearchParameters &other) = delete;
    void operator=(DynamicSearchParameters &&other) = delete;

    inline static float getParameter(ParameterCategory category, float rangeMin, float currentDefault, float rangeMax, const char* file, int line, int counter) {
        if (category != instance.m_currentlyOptimizing) {
            return currentDefault;
        }
        return getParameterRegistering(rangeMin, currentDefault, rangeMax, file, line, counter);
    }

    static float getParameterRegistering(float rangeMin, float currentDefault, float rangeMax, const char* file, int line, int counter);

    static void setParameters(const std::vector<std::pair<ParameterIdentifier, float>> &parameters) {
        instance.m_parameters = parameters;
    }

    static void beginRegistering(ParameterCategory toOptimize) {
        instance.m_currentlyRegistering = true;
        instance.m_currentlyOptimizing = toOptimize;
    }

    static std::vector<ParameterDefinition> stopRegistering();

private:
    DynamicSearchParameters() = default;

    static DynamicSearchParameters instance;

    std::vector<std::pair<ParameterIdentifier, float>> m_parameters;

    bool m_currentlyRegistering = false;
    ParameterCategory m_currentlyOptimizing = ParameterCategory::None;
    std::vector<ParameterDefinition> m_parameterDefinitions;
};

#endif
