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

#ifndef MULTIESCAPESAMPLER_H
#define MULTIESCAPESAMPLER_H

#include "trajectorysampler.h"
#include "escapeobstaclesampler.h"
#include "trajectory.h"

#include <vector>

class RNG;

class MultiEscapeSampler : public TrajectorySampler
{
public:
    MultiEscapeSampler(RNG *rng, const WorldInformation &world, PathDebug &debug);

    bool compute(const TrajectoryInput &input) final override;
    const std::vector<AlphaTimeTrajectory> &getResult() const final override;
    int getMaxIntersectingObstaclePrio() const;
    void resetMaxIntersectingObstaclePrio();

private:
    bool isFirstBrake() const;
    bool computeFirstBrake(const TrajectoryInput &input);

private:
    std::vector<AlphaTimeTrajectory> m_firstBrakeResult;
    EscapeObstacleSampler m_firstBrakeSampler;
    EscapeObstacleSampler m_regularSampler;
};

#endif // MULTIESCAPESAMPLER_H
