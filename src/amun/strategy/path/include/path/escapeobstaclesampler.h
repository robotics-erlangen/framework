/***************************************************************************
 *   Copyright 2019 Andreas Wendler                                        *
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

#ifndef ESCAPEOBSTACLESAMPLER_H
#define ESCAPEOBSTACLESAMPLER_H

#include "trajectorysampler.h"
#include <tuple>
#include <vector>

class EscapeObstacleSampler : public TrajectorySampler
{
public:
    EscapeObstacleSampler(RNG *rng, const WorldInformation &world, PathDebug &debug) : TrajectorySampler(rng, world, debug) {}
    bool compute(const TrajectoryInput &input) override;
    const std::vector<TrajectoryGenerationInfo> &getResult() const override { return m_generationInfo; }

    int m_maxIntersectingObstaclePrio = -1;

private:
    std::tuple<int, float, float> trajectoryObstacleScore(const TrajectoryInput &input, const SpeedProfile &speedProfile);

private:
    float m_bestEscapingTime = 2;
    float m_bestEscapingAngle = 0.5f;

    float m_bestStoppingTime = 2;
    float m_bestStoppingAngle = 0.5f;

    std::vector<TrajectoryGenerationInfo> m_generationInfo;
};

#endif // ESCAPEOBSTACLESAMPLER_H
