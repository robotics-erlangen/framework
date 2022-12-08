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

bool EscapeObstacleSampler::TrajectoryRating::isBetterThan(const TrajectoryRating &other) const
{
    if (endsSafely && !other.endsSafely) {
        return true;
    } else if (!endsSafely && other.endsSafely) {
        return false;
    }
    if (maxPrio < other.maxPrio) {
        return true;
    } else if (maxPrio > other.maxPrio) {
        return false;
    }
    if (maxPrioTime < other.maxPrioTime) {
        return true;
    }
    if (minObstacleDistance > 0 && minObstacleDistance > other.minObstacleDistance) {
        return true;
    }
    return false;
}

bool EscapeObstacleSampler::compute(const TrajectoryInput &input)
{
    // objective: find a path that quickly exists all obstacles
    // driving to the goal is then executed by the regular standard sampler

    // try last frames trajectory
    Trajectory bestProfile = AlphaTimeTrajectory::calculateTrajectory(input.start, Vector(0, 0), m_bestEscapingTime, m_bestEscapingAngle,
                                                                      input.acceleration, input.maxSpeed, 0, EndSpeed::EXACT);
    auto bestRating = rateEscapingTrajectory(input, bestProfile);

    // the last trajectory (bestProfile) could stop directly in front of a new obstacle (optimized to minimize the
    // travel time in the current obstacle).
    // But since the robot moved in the 10 ms since the last frame, the last trajectory might have been pushed into the
    // new obstacle, invaldiating it.
    // Therefore, just check with a few time offsets (more than just 0.01 in case of varying pathfinding call frequency)
    for (float timeOffset : {0.01f, 0.02f, 0.05f}) {
        const float testTime = m_bestEscapingTime - timeOffset;
        if (testTime < 0) {
            continue;
        }
        const Trajectory profile = AlphaTimeTrajectory::calculateTrajectory(input.start, Vector(0, 0), testTime, m_bestEscapingAngle,
                                                                            input.acceleration, input.maxSpeed, 0, EndSpeed::EXACT);
        const auto rating = rateEscapingTrajectory(input, profile);
        if (rating.isBetterThan(bestRating)) {
            bestRating = rating;
            bestProfile = profile;
            m_bestEscapingTime = testTime;
        }
    }

    for (int i = 0;i<25;i++) {
        float time, angle;
        if (m_rng->uniformInt() % 2 == 0) {
            // random sampling
            if (!bestRating.endsSafely) {
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

        const Trajectory profile = AlphaTimeTrajectory::calculateTrajectory(input.start, Vector(0, 0), time, angle, input.acceleration, input.maxSpeed, 0, EndSpeed::EXACT);
        const auto rating = rateEscapingTrajectory(input, profile);
        if (rating.isBetterThan(bestRating)) {
            bestRating = rating;
            bestProfile = profile;
            m_bestEscapingTime = time;
            m_bestEscapingAngle = angle;
        }
    }
    m_maxIntersectingObstaclePrio = bestRating.maxPrio;

    m_result.clear();
    if (!bestRating.endsSafely) {
        return false;
    }
    bestProfile.limitToTime(bestRating.escapeTime);
    m_result.push_back(bestProfile);
    return true;
}

void EscapeObstacleSampler::updateFrom(const EscapeObstacleSampler &other)
{
    m_bestEscapingTime = other.m_bestEscapingTime;
    m_bestEscapingAngle = other.m_bestEscapingAngle;
}

auto EscapeObstacleSampler::rateEscapingTrajectory(const TrajectoryInput &input, const Trajectory &speedProfile) const -> TrajectoryRating
{
    const float OUT_OF_OBSTACLE_TIME = 0.1f;
    const float LONG_OUF_OF_OBSTACLE_TIME = 1.5f; // used when the trajectory has not yet intersected any obstacle
    const float SAMPLING_INTERVAL = 0.03f;
    const float ZONE_RADIUS = 0.2f;

    const float totalTime = speedProfile.time();
    const int samples = int(totalTime / SAMPLING_INTERVAL) + 1;

    const auto obstacles = m_world.intersectingObstacles(speedProfile);

    TrajectoryRating result;

    Trajectory::Iterator it{speedProfile, input.t0};

    int goodSamples = 0;
    float fineTime = totalTime;
    for (int i = 0;i<samples;i++) {
        const float time = i * SAMPLING_INTERVAL;

        const auto point = it.next(SAMPLING_INTERVAL);
        int obstaclePriority = -1;
        if (!m_world.pointInPlayfield(point.state.pos, m_world.radius())) {
            obstaclePriority = m_world.outOfFieldPriority();
        }
        for (const auto obstacle : obstacles) {
            if (obstacle->prio > obstaclePriority) {
                const float distance = obstacle->zonedDistance(point, ZONE_RADIUS);
                if (distance < 0) {
                    obstaclePriority = obstacle->prio;
                }
                // when the trajectory does not intersect any obstacles, we want to stay as far away as possible from them
                result.minObstacleDistance = std::min(result.minObstacleDistance, distance);
            }
        }
        if (obstaclePriority == -1) {
            goodSamples++;
            const float boundaryTime = result.maxPrio >= 0 ? OUT_OF_OBSTACLE_TIME : LONG_OUF_OF_OBSTACLE_TIME;
            if (goodSamples > boundaryTime * (1.0f / SAMPLING_INTERVAL) && fineTime == totalTime) {
                fineTime = time;
            }
            if (goodSamples > LONG_OUF_OF_OBSTACLE_TIME * (1.0f / SAMPLING_INTERVAL)) {
                result.endsSafely = true;
                break;
            }
        } else {
            goodSamples = 0;
        }
        if (obstaclePriority > result.maxPrio) {
            result.maxPrio = obstaclePriority;
            result.maxPrioTime = 0;
        }
        if (obstaclePriority == result.maxPrio) {
            if (i == samples-1) {
                // strong penalization for stopping in an obstacle
                result.maxPrioTime += 10;
            } else {
                result.maxPrioTime += SAMPLING_INTERVAL;
            }
        }
    }
    if (result.maxPrio == -1) {
        result.escapeTime = OUT_OF_OBSTACLE_TIME;
    } else {
        result.escapeTime = fineTime;
    }
    if (goodSamples > 0 && speedProfile.endSpeed() == Vector(0, 0)) {
        result.endsSafely = true;
    }
    return result;
}
