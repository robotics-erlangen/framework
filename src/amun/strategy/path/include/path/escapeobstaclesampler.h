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
#include <vector>

class EscapeObstacleSampler : public TrajectorySampler
{
public:
    EscapeObstacleSampler(RNG *rng, const WorldInformation &world, PathDebug &debug) : TrajectorySampler(rng, world, debug) {}
    bool compute(const TrajectoryInput &input) final override;
    const std::vector<Trajectory> &getResult() const final override { return m_result; }
    int getMaxIntersectingObstaclePrio() const { return m_maxIntersectingObstaclePrio; }
    void resetMaxIntersectingObstaclePrio() { m_maxIntersectingObstaclePrio = -1; }
    void updateFrom(const EscapeObstacleSampler &other);

private:
    struct TrajectoryRating {
        int maxPrio = -1;
        float maxPrioTime = std::numeric_limits<float>::infinity();
        bool endsSafely = false; // if the trajectory ends in a safe point
        float escapeTime = 0; // the point in time where the trajectory is safe to leave
        float minObstacleDistance = std::numeric_limits<float>::infinity();

        bool isBetterThan(const TrajectoryRating &other) const;
    };
    TrajectoryRating rateEscapingTrajectory(const TrajectoryInput &input, const Trajectory &speedProfile) const;

private:
    float m_bestEscapingTime = 2;
    float m_bestEscapingAngle = 0.5f;

    int m_maxIntersectingObstaclePrio = -1;

    std::vector<Trajectory> m_result;
};

#endif // ESCAPEOBSTACLESAMPLER_H
