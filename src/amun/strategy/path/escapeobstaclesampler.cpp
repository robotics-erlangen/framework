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

#include "escapeobstaclesampler.h"
#include "core/rng.h"

bool EscapeObstacleSampler::compute(const TrajectoryInput &input)
{
    // first stage: find a path that quickly exists all obstacles
    // the second stage is executed by the regular standard sampler
    {
        // try last frames trajectory
        SpeedProfile p = AlphaTimeTrajectory::calculateTrajectory(input.v0, Vector(0, 0), m_bestEscapingTime, m_bestEscapingAngle,
                                                                  input.acceleration, input.maxSpeed, 0, false);
        SpeedProfile bestProfile = p;
        int bestPrio;
        float bestObstacleTime;
        float endTime;
        std::tie(bestPrio, bestObstacleTime, endTime) = trajectoryObstacleScore(input, p);
        bool foundValid = endTime > 0;

        if (!foundValid) {
            bestPrio = 10000;
            bestObstacleTime = 10000;
        }
        float bestEndTime = endTime;
        for (int i = 0;i<25;i++) {
            float time, angle;
            if (m_rng->uniformInt() % 2 == 0) {
                // random sampling
                if (!foundValid) {
                    time = m_rng->uniformFloat(0.001f, 6.0f);
                } else {
                    time = m_rng->uniformFloat(0.001f, 2.0f);
                }
                angle = m_rng->uniformFloat(0, float(2 * M_PI));
            } else {
                // sample around current best point
                time = std::max(0.001f, m_bestEscapingTime + m_rng->uniformFloat(-0.1f, 0.1f));
                angle = m_bestEscapingAngle + m_rng->uniformFloat(-0.1f, 0.1f);
            }

            p = AlphaTimeTrajectory::calculateTrajectory(input.v0, Vector(0, 0), time, angle, input.acceleration, input.maxSpeed, 0, false);
            if (p.isValid()) {
                int prio;
                float obstacleTime;
                std::tie(prio, obstacleTime, endTime) = trajectoryObstacleScore(input, p);
                if ((prio < bestPrio || (prio == bestPrio && obstacleTime < bestObstacleTime)) && endTime >= 0) {
                    bestPrio = prio;
                    bestProfile = p;
                    bestObstacleTime = obstacleTime;
                    m_bestEscapingTime = time;
                    m_bestEscapingAngle = angle;
                    bestEndTime = endTime;
                    foundValid = true;
                }
            }
        }
        m_maxIntersectingObstaclePrio = bestPrio;

        m_generationInfo.clear();
        if (!foundValid) {
            return false;
        }
        TrajectoryGenerationInfo info;
        bestProfile.limitToTime(bestEndTime);
        info.profile = bestProfile;
        info.desiredDistance = bestProfile.endPos();
        m_generationInfo.push_back(info);
    }
    return true;
}

std::tuple<int, float, float> EscapeObstacleSampler::trajectoryObstacleScore(const TrajectoryInput &input, const SpeedProfile &speedProfile)
{
    const float OUT_OF_OBSTACLE_TIME = 0.1f;
    const float LONG_OUF_OF_OBSTACLE_TIME = 1.5f; // used when the trajectory has not yet intersected any obstacle
    float totalTime = speedProfile.time();
    const float SAMPLING_INTERVAL = 0.03f;
    int samples = int(totalTime / SAMPLING_INTERVAL) + 1;

    int currentBestObstaclePrio = -1;
    float currentBestObstacleTime = 0;
    float minStaticObstacleDistance = std::numeric_limits<float>::max();

    int goodSamples = 0;
    float fineTime = 0;
    int lastObstaclePrio = -1;
    bool foundPointInObstacle = false;
    for (int i = 0;i<samples;i++) {
        float time;
        if (i < samples-1) {
            time = i * SAMPLING_INTERVAL;
        } else {
            time = totalTime;
        }

        Vector pos = speedProfile.positionAndSpeedForTime(time).first + input.s0;
        int obstaclePriority = -1;
        if (!m_world.pointInPlayfield(pos, m_world.radius())) {
            obstaclePriority = m_world.outOfFieldPriority();
        }
        for (const auto obstacle : m_world.obstacles()) {
            if (obstacle->prio > obstaclePriority) {
                float distance = obstacle->distance(pos);
                minStaticObstacleDistance = std::min(minStaticObstacleDistance, distance);
                if (distance < 0) {
                    obstaclePriority = obstacle->prio;
                }
            }
        }
        for (const auto o : m_world.movingObstacles()) {
            if (o->prio > obstaclePriority && o->intersects(pos, time + input.t0)) {
                obstaclePriority = o->prio;
            }
        }
        if (obstaclePriority == -1) {
            goodSamples++;
            float boundaryTime = foundPointInObstacle ? OUT_OF_OBSTACLE_TIME : LONG_OUF_OF_OBSTACLE_TIME;
            if (goodSamples > boundaryTime * (1.0f / SAMPLING_INTERVAL) && fineTime == 0) {
                fineTime = time;
            }
            if (goodSamples > LONG_OUF_OF_OBSTACLE_TIME * (1.0f / SAMPLING_INTERVAL)) {
                break;
            }
        } else {
            foundPointInObstacle = true;
            goodSamples = 0;
        }
        if (obstaclePriority > currentBestObstaclePrio) {
            currentBestObstaclePrio = obstaclePriority;
            currentBestObstacleTime = 0;
        }
        if (obstaclePriority == currentBestObstaclePrio) {
            if (i == samples-1) {
                // strong penalization for stopping in an obstacle
                currentBestObstacleTime += 10;
            } else {
                currentBestObstacleTime += SAMPLING_INTERVAL;
            }
        }
        lastObstaclePrio = obstaclePriority;
    }
    if (fineTime == 0) {
        fineTime = totalTime;
    }
    if (currentBestObstaclePrio == -1) {
        return std::make_tuple(-1, minStaticObstacleDistance, fineTime);
    } else {
        return std::make_tuple(currentBestObstaclePrio, currentBestObstacleTime, lastObstaclePrio == -1 ? fineTime : -1);
    }
}
