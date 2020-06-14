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

#ifndef TRAJECTORYPATH_H
#define TRAJECTORYPATH_H

#include "abstractpath.h"
#include "alphatimetrajectory.h"
#include "trajectorysampler.h"
#include "endinobstaclesampler.h"
#include "multiescapesampler.h"
#include "standardsampler.h"
#include "core/vector.h"
#include <vector>

class ProtobufFileSaver;

class TrajectoryPath : public AbstractPath
{
public:
    TrajectoryPath(uint32_t rng_seed, ProtobufFileSaver *inputSaver);
    void reset() override;
    std::vector<TrajectoryPoint> calculateTrajectory(Vector s0, Vector v0, Vector s1, Vector v1, float maxSpeed, float acceleration);
    // is guaranteed to be equally spaced in time
    std::vector<TrajectoryPoint> *getCurrentTrajectory() { return &m_currentTrajectory; }
    int maxIntersectingObstaclePrio() const { return m_escapeObstacleSampler.getMaxIntersectingObstaclePrio(); }

private:
    // copy input so that the modification does not affect the getResultPath function
    std::vector<TrajectorySampler::TrajectoryGenerationInfo> findPath(TrajectoryInput input);
    std::vector<TrajectoryPoint> getResultPath(const std::vector<TrajectorySampler::TrajectoryGenerationInfo> &generationInfo,
                                               const TrajectoryInput &input);

private:
    StandardSampler m_standardSampler;
    EndInObstacleSampler m_endInObstacleSampler;
    MultiEscapeSampler m_escapeObstacleSampler;

    // result trajectory (used by other robots as obstacle)
    std::vector<TrajectoryPoint> m_currentTrajectory;

    ProtobufFileSaver *m_inputSaver;
};

#endif // TRAJECTORYPATH_H
