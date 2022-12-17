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

#ifndef STANDARDSAMPLER_H
#define STANDARDSAMPLER_H

#include "trajectorysampler.h"
#include "protobuf/pathfinding.pb.h"

class StandardTrajectorySample
{
public:
    StandardTrajectorySample() {}
    StandardTrajectorySample(float time, float angle, Vector midSpeed) : time(time), angle(angle), midSpeed(midSpeed) {}

    float getTime() const { return time; }
    float getAngle() const { return angle; }
    Vector getMidSpeed() const { return midSpeed; }

    void setTime(float t) { time = t; }
    void setAngle(float a) { angle = a; }
    void setMidSpeed(Vector speed) { midSpeed = speed; }

    void serialize(pathfinding::StandardSamplerPoint *point) const;
    void deserialize(const pathfinding::StandardSamplerPoint &point);

    StandardTrajectorySample denormalize(const TrajectoryInput &input) const;

    float time = 0;
    float angle = 0;
    Vector midSpeed = Vector(0, 0);
};

struct PrecomputationSegmentInfo {
    float minDistance;
    float maxDistance;
    std::vector<StandardTrajectorySample> precomputedPoints;

    void serialize(pathfinding::StandardSamplerPrecomputationSegment *segment) const;
    void deserialize(const pathfinding::StandardSamplerPrecomputationSegment &segment);
};

class StandardSampler : public TrajectorySampler
{
public:
    StandardSampler(RNG *rng, const WorldInformation &world, PathDebug &debug, bool usePrecomputation = true);
    bool compute(const TrajectoryInput &input) final override;
    const std::vector<Trajectory> &getResult() const final override { return m_result; }
    void setDirectTrajectoryScore(float score) { m_directTrajectoryScore = score; }
    float getScore() const { return m_bestResultInfo.time; }

    static constexpr float OBSTACLE_AVOIDANCE_RADIUS = 0.1f;
    static constexpr float OBSTACLE_AVOIDANCE_BONUS = 0.2f;

    // a negative return value indicates that the input was invalid or worse and a positive value is the score of the successfull check
    float checkSample(const TrajectoryInput &input, const StandardTrajectorySample &sample, const float currentBestTime);
    static float trajectoryScore(float time, float obstacleDistance);

private:
    struct StandardSamplerBestTrajectoryInfo {
        float time = 0;
        bool valid = false;
        StandardTrajectorySample sample;
    };

private:
    Vector randomSpeed(float maxSpeed);
    void computeLive(const TrajectoryInput &input, const StandardSamplerBestTrajectoryInfo &lastFrameInfo);
    void computePrecomputed(const TrajectoryInput &input);

private:
    float m_directTrajectoryScore = std::numeric_limits<float>::max();
    StandardSamplerBestTrajectoryInfo m_bestResultInfo;

    std::vector<Trajectory> m_result;

    // precomputation
    std::vector<PrecomputationSegmentInfo> m_precomputedPoints;
};

#endif // STANDARDSAMPLER_H
