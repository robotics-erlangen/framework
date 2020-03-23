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
#include "core/rng.h"

bool EndInObstacleSampler::compute(const TrajectoryInput &input)
{
    // TODO: possibly dont use search trajectory generation but time and angle directly?
    // check last best end point
    float prevBestDistance = m_bestEndPointDistance;
    m_bestEndPointDistance = std::numeric_limits<float>::infinity();
    isValid = false;
    if (!testEndPoint(input, m_bestEndPoint)) {
        m_bestEndPointDistance = prevBestDistance * 1.3f;
    }

    // TODO: sample closer if we are already close
    const int ITERATIONS = 60;
    for (int i = 0;i<ITERATIONS;i++) {
        if (i == ITERATIONS / 3 && !isValid) {
            m_bestEndPointDistance = std::numeric_limits<float>::infinity();
        }
        int randVal = m_rng->uniformInt() % 1024;
        Vector testPoint;
        if (randVal < 300) {
            // sample random point around actual end point
            float testRadius = std::min(m_bestEndPointDistance, 0.3f);
            testPoint = input.s1 + Vector(m_rng->uniformFloat(-testRadius, testRadius), m_rng->uniformFloat(-testRadius, testRadius));
        } else if (randVal < 800 || m_bestEndPointDistance < 0.3f) {
            // sample random point around last best end point
            float testRadius = std::min(m_bestEndPointDistance, 0.3f);
            testPoint = m_bestEndPoint + Vector(m_rng->uniformFloat(-testRadius, testRadius), m_rng->uniformFloat(-testRadius, testRadius));
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
    float targetDistance = endPoint.distance(input.s1);
    if (targetDistance > m_bestEndPointDistance - 0.01f) {
        return false;
    }

    // try to keep at least 3 cm distance to static obstacles
    if (m_world.minObstacleDistance(endPoint, 0, true, false) < 0.03f) {
        return false;
    }

    // no slowdown here, we are not even were we want to be
    SpeedProfile direct = AlphaTimeTrajectory::findTrajectoryExactEndSpeed(input.v0, Vector(0, 0), endPoint - input.s0, input.acceleration, input.maxSpeed, 0);
    if (!direct.isValid()) {
        return false;
    }
    if (m_world.isTrajectoryInObstacle(direct, 0, 0, input.s0)) {
        return false;
    }

    m_bestEndPointDistance = targetDistance;
    isValid = true;
    m_bestEndPoint = endPoint;

    result.resize(1);
    result[0].profile = direct;
    result[0].slowDownTime = 0;
    result[0].fastEndSpeed = false;
    result[0].desiredDistance = endPoint - input.s0;

    return true;
}

Vector EndInObstacleSampler::randomPointInField()
{
    auto bound = m_world.boundary();
    return Vector(m_rng->uniformFloat(bound.bottom_left.x, bound.top_right.x),
                  m_rng->uniformFloat(bound.bottom_left.y, bound.top_right.y));
}
