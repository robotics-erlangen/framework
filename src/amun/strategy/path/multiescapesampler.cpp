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

#include "multiescapesampler.h"
#include "core/rng.h"

MultiEscapeSampler::MultiEscapeSampler(RNG *rng, const WorldInformation &world, PathDebug &debug) :
    TrajectorySampler(rng, world, debug),
    m_zeroV0Sampler(rng, world, debug),
    m_regularSampler(rng, world, debug)
{}

bool MultiEscapeSampler::compute(const TrajectoryInput &input)
{
    // It is problematic to use the EscapeObstacleSampler directly. Consider the following scenario:
    // The ball is in front of the robot and the robot is already slightly in the obstacle,
    // but still has velocity in the direction of the ball.
    // In that case, the fastest way out of the obstacle is directly through it,
    // but that would indirectly move the obstacle with the ball.
    // Therefore, this class first tests if it is possible to fully break and then escape the
    // obstacle in the best direction, eliminating the problem.
    TrajectoryInput zeroV0Input = input;
    zeroV0Input.start.speed = Vector(0, 0);
    // TODO: in principle, this sampler can be simplified since the result is always a straight line
    const bool zeroValid = m_zeroV0Sampler.compute(zeroV0Input);
    if (zeroValid) {
        const Vector initialAcc = m_zeroV0Sampler.getResult()[0].initialAcceleration();
        const float accInV0 = initialAcc.dot(input.start.speed);
        m_resultIsZeroV0 = accInV0 <= 0;
    } else {
        m_resultIsZeroV0 = false;
    }
    if (!m_resultIsZeroV0) {
          const bool valid = m_regularSampler.compute(input);
          return valid;
    } else {
        m_regularSampler.updateFrom(m_zeroV0Sampler);
    }
    return zeroValid;
}

int MultiEscapeSampler::getMaxIntersectingObstaclePrio() const
{
    if (m_resultIsZeroV0) {
        return m_zeroV0Sampler.getMaxIntersectingObstaclePrio();
    } else {
        return m_regularSampler.getMaxIntersectingObstaclePrio();
    }
}

void MultiEscapeSampler::resetMaxIntersectingObstaclePrio()
{
    m_zeroV0Sampler.resetMaxIntersectingObstaclePrio();
    m_regularSampler.resetMaxIntersectingObstaclePrio();
}

const std::vector<Trajectory> &MultiEscapeSampler::getResult() const
{
    if (m_resultIsZeroV0) {
        return m_zeroV0Sampler.getResult();
    }
    return m_regularSampler.getResult();
}
