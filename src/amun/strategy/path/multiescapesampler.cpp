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
    m_firstBrakeSampler(rng, world, debug),
    m_regularSampler(rng, world, debug)
{}

bool MultiEscapeSampler::isFirstBrake() const {
    return m_firstBrakeResult.size() > 0;
}

bool MultiEscapeSampler::computeFirstBrake(const TrajectoryInput &input) {
    // It is problematic to use the EscapeObstacleSampler directly. Consider the following scenario:
    // The ball is in front of the robot and the robot is already slightly in the obstacle,
    // but still has velocity in the direction of the ball.
    // In that case, the fastest way out of the obstacle is directly through it,
    // but that would indirectly move the obstacle with the ball.
    // Therefore, this class first tests if it is possible to fully break and then escape the
    // obstacle in the best direction, eliminating the problem.
    AlphaTimeTrajectory brakeTraj{
        input.start,
        Vector(0, 0),
        0,  // extra time, here 0 as we want to Brake as fast a possible
        0,  // angle, doesnt matter here as time is 0
        input.acceleration,
        input.maxSpeed,
        0,
        EndSpeed::EXACT,
    };

    TrajectoryInput inputAfterBrake = input;
    inputAfterBrake.start = brakeTraj.endState();
    inputAfterBrake.t0 = brakeTraj.endTime();

    // TODO: in principle, this sampler can be simplified since the result is always a straight line
    const bool afterBrakeValid = m_firstBrakeSampler.compute(inputAfterBrake);
    if (!afterBrakeValid) {
        return false;
    }

    std::vector<AlphaTimeTrajectory> afterBrakeTraj = m_firstBrakeSampler.getResult();
    AlphaTimeTrajectory &firstAfterBrake = afterBrakeTraj[0];
    const Vector initialAcc = firstAfterBrake.getTrajectory().initialAcceleration();
    const float accInV0 = initialAcc.dot(input.start.speed);
    if (accInV0 > 0) {
        // we still drive through the obstacle
        return false;
    }

    m_firstBrakeResult.clear();
    m_firstBrakeResult.push_back(brakeTraj);
    m_firstBrakeResult.insert(m_firstBrakeResult.end(), afterBrakeTraj.begin(), afterBrakeTraj.end());
    return true;
}

bool MultiEscapeSampler::compute(const TrajectoryInput &input)
{
    if (computeFirstBrake(input)) {
        m_regularSampler.updateFrom(m_firstBrakeSampler);
        return true;
    } else {
        m_firstBrakeResult.clear();
        return m_regularSampler.compute(input);
    }
}

int MultiEscapeSampler::getMaxIntersectingObstaclePrio() const
{
    if (isFirstBrake()) {
        return m_firstBrakeSampler.getMaxIntersectingObstaclePrio();
    } else {
        return m_regularSampler.getMaxIntersectingObstaclePrio();
    }
}

void MultiEscapeSampler::resetMaxIntersectingObstaclePrio()
{
    m_firstBrakeSampler.resetMaxIntersectingObstaclePrio();
    m_regularSampler.resetMaxIntersectingObstaclePrio();
}

const std::vector<AlphaTimeTrajectory> &MultiEscapeSampler::getResult() const
{
    if (isFirstBrake()) {
        return m_firstBrakeResult;
    } else {
        return m_regularSampler.getResult();
    }
}
