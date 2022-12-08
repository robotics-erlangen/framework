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

#include "endinobstaclesampler.h"
#include "parameterization.h"
#include "core/rng.h"

#include <QDebug>

bool EndInObstacleSampler::compute(const TrajectoryInput &input)
{
    // TODO: possibly dont use search trajectory generation but time and angle directly?
    // check last best end point
    const float prevBestDistance = m_bestEndPointDistance;
    m_bestEndPointDistance = std::numeric_limits<float>::infinity();
    isValid = false;
    if (!testEndPoint(input, m_bestEndPoint)) {
        m_bestEndPointDistance = prevBestDistance * 1.3f;
    }

    // compute where the robot would stop when braking immediately
    // in case the acceleration model is not simple, compute the trajectory instead of directly computing the position
    const Trajectory stop = AlphaTimeTrajectory::calculateTrajectory(input.start, Vector(0, 0), 0, 0, input.acceleration, input.maxSpeed, 0, EndSpeed::EXACT);
    const Vector stopPoint = stop.endPosition();

    // TODO: sample closer if we are already close
    const int ITERATIONS = 60;
    for (int i = 0;i<ITERATIONS;i++) {
        if (i == int(ITERATIONS / PARAMETER(EndInObstacleSampler, 1, 3, 10)) && !isValid) {
            m_bestEndPointDistance = std::numeric_limits<float>::infinity();
            // test just stopping now
            testEndPoint(input, stopPoint);
        }
        int randVal = m_rng->uniformInt() % 1024;
        Vector testPoint;
        const int RANDOM_END_RANGE = PARAMETER(EndInObstacleSampler, 1, 300, 700);
        const int RANDOM_BEST_RANGE = PARAMETER(EndInObstacleSampler, 1, 400, 700);
        const int RANDOM_STOPPOINT_RANGE = PARAMETER(EndInObstacleSampler, 1, 200, 700);
        if (randVal < RANDOM_END_RANGE) {
            // sample random point around actual end point
            const float testRadius = std::min(m_bestEndPointDistance, PARAMETER(EndInObstacleSampler, 0, 0.3f, 3));
            testPoint = input.target.pos + Vector(m_rng->uniformFloat(-testRadius, testRadius), m_rng->uniformFloat(-testRadius, testRadius));
        } else if (randVal < RANDOM_END_RANGE + RANDOM_BEST_RANGE || m_bestEndPointDistance < PARAMETER(EndInObstacleSampler, 0, 0.3f, 3)) {
            // sample random point around last best end point
            const float testRadius = std::min(m_bestEndPointDistance, PARAMETER(EndInObstacleSampler, 0, 0.3f, 3));
            testPoint = m_bestEndPoint + Vector(m_rng->uniformFloat(-testRadius, testRadius), m_rng->uniformFloat(-testRadius, testRadius));
        } else if (randVal < RANDOM_END_RANGE + RANDOM_BEST_RANGE + RANDOM_STOPPOINT_RANGE) {
            // sample random point around the position the robot will stop
            const float testRadius = std::min(m_bestEndPointDistance, PARAMETER(EndInObstacleSampler, 0, 0.5f, 3));
            testPoint = stopPoint + Vector(m_rng->uniformFloat(-testRadius, testRadius), m_rng->uniformFloat(-testRadius, testRadius));
        } else {
            // sample random point in field
            testPoint = randomPointInField();
        }
        testEndPoint(input, testPoint);
    }
    return isValid;
}

bool EndInObstacleSampler::testEndPoint(const TrajectoryInput &input, Vector endPoint)
{
    const float targetDistance = endPoint.distance(input.target.pos);
    if (targetDistance > m_bestEndPointDistance - 0.01f) {
        return false;
    }

    // try to keep at least 3 cm distance to static obstacles
    if (m_world.minObstacleDistancePoint({{endPoint, Vector(0, 0)}, 10000}) < 0.03f) {
        return false;
    }

    // no slowdown here, we are not even were we want to be
    const RobotState targetState(endPoint, Vector(0, 0));
    const auto direct = AlphaTimeTrajectory::findTrajectory(input.start, targetState, input.acceleration,
                                                            input.maxSpeed, 0, EndSpeed::EXACT);

    if (!direct) {
        return false;
    }
    if (m_world.isTrajectoryInObstacle(direct.value(), input.t0)) {
        return false;
    }

    m_bestEndPointDistance = targetDistance;
    isValid = true;
    m_bestEndPoint = endPoint;

    result.clear();
    result.push_back(direct.value());
    return true;
}

Vector EndInObstacleSampler::randomPointInField()
{
    const auto bound = m_world.boundary();
    return Vector(m_rng->uniformFloat(bound.bottomLeft.x, bound.topRight.x),
                  m_rng->uniformFloat(bound.bottomLeft.y, bound.topRight.y));
}
