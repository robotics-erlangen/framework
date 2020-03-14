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

#ifndef STANDARDSAMPLER_H
#define STANDARDSAMPLER_H

#include "trajectorysampler.h"

class StandardSampler : public TrajectorySampler
{
public:
    StandardSampler(RNG *rng, const WorldInformation &world, PathDebug &debug);
    bool compute(const TrajectoryInput &input) override;
    const std::vector<TrajectoryGenerationInfo> &getResult() const override { return m_generationInfo; }

    static constexpr float OBSTACLE_AVOIDANCE_RADIUS = 0.1f;
    static constexpr float OBSTACLE_AVOIDANCE_BONUS = 1.2f;

private:
    bool checkMidPoint(const TrajectoryInput &input, Vector midSpeed, const float time, const float angle);
    Vector randomSpeed(float maxSpeed);

private:
    struct BestTrajectoryInfo {
        float time = 0;
        float centerTime = 0;
        float angle = 0;
        Vector midSpeed = Vector(0, 0);
        bool valid = false;
    };
    BestTrajectoryInfo m_bestResultInfo;

    std::vector<TrajectoryGenerationInfo> m_generationInfo;
};

#endif // STANDARDSAMPLER_H
