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

#ifndef ENDINOBSTACLESAMPLER_H
#define ENDINOBSTACLESAMPLER_H

#include "trajectorysampler.h"

class EndInObstacleSampler : public TrajectorySampler
{
public:
    EndInObstacleSampler(RNG *rng, const WorldInformation &world) : TrajectorySampler(rng, world) {}
    bool compute(const TrajectoryInput &input) override;
    const std::vector<TrajectoryGenerationInfo> &getResult() const override { return result; }

private:
    bool testEndPoint(const TrajectoryInput &input, Vector endPoint);
    Vector randomPointInField();

private:
    Vector m_bestEndPoint = Vector(0, 0);
    float m_bestEndPointDistance;

    bool isValid;
    std::vector<TrajectoryGenerationInfo> result;
};

#endif // ENDINOBSTACLESAMPLER_H
