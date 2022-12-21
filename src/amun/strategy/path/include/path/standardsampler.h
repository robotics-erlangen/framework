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

    bool operator==(const StandardTrajectorySample &other)
    {
        return time == other.time && angle == other.angle && midSpeed == other.midSpeed;
    }

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

class StandardSampler : public TrajectorySampler
{
public:
    StandardSampler(RNG *rng, const WorldInformation &world, PathDebug &debug);

    bool compute(const TrajectoryInput &input) final override;
    const std::vector<Trajectory> &getResult() const final override { return m_result; }
    void setDirectTrajectoryScore(float score) { m_directTrajectoryScore = score; }
    float getScore() const { return m_bestResultInfo.time; }

    static constexpr float OBSTACLE_AVOIDANCE_RADIUS = 0.1f;
    static constexpr float OBSTACLE_AVOIDANCE_BONUS = 0.2f;

    enum class ScoreType {
        EXACT,
        WORSE_THAN
    };
    struct SampleScore {
        ScoreType type;
        // interpretation depends on the score type
        // lower scores are better
        float score;
    };

    virtual SampleScore checkSample(const TrajectoryInput &input, const StandardTrajectorySample &sample, const float currentBestTime);
    static float trajectoryScore(float time, float obstacleDistance);

protected:
    struct StandardSamplerBestTrajectoryInfo {
        float time = 0;
        bool valid = false;
        StandardTrajectorySample sample;
    };
    Vector randomSpeed(float maxSpeed);

protected:
    // functions that need be implemented for an optimizable sampler
    virtual void computeSamples(const TrajectoryInput &input, const StandardSamplerBestTrajectoryInfo &lastFrameInfo) = 0;
    virtual int numSamples() const = 0;
    virtual void randomizeSample(int index) = 0;
    virtual void modifySample(int index) = 0;
    virtual void save(QString filename) const = 0;
    virtual void resetSamples() = 0;
    virtual bool trySplit(const std::vector<TrajectoryInput>&) { return false; }

protected:
    float m_directTrajectoryScore = std::numeric_limits<float>::max();
    StandardSamplerBestTrajectoryInfo m_bestResultInfo;

    std::vector<Trajectory> m_result;
};

class PrecomputedStandardSampler : public StandardSampler
{
public:
    PrecomputedStandardSampler(RNG *rng, const WorldInformation &world, PathDebug &debug);
    void copyPrecomputation(const PrecomputedStandardSampler &other) { m_precomputation = other.m_precomputation; }

    int numSamples() const override;
    void randomizeSample(int index) override;
    void modifySample(int index) override;
    void save(QString filename) const override;
    void resetSamples() override;
    bool trySplit(const std::vector<TrajectoryInput> &inputs) override;

protected:
    void computeSamples(const TrajectoryInput &input, const StandardSamplerBestTrajectoryInfo&) override;
    StandardTrajectorySample& getSample(int i);

private:
    struct PrecomputationSegment {
        float minDistance;
        float maxDistance;
        std::vector<StandardTrajectorySample> samples;

        void serialize(pathfinding::StandardSamplerPrecomputationSegment *segment) const;
        void deserialize(const pathfinding::StandardSamplerPrecomputationSegment &segment);
    };

    std::vector<PrecomputationSegment> m_precomputation;
};

class LiveStandardSampler : public StandardSampler
{
public:
    LiveStandardSampler(RNG *rng, const WorldInformation &world, PathDebug &debug);

    int numSamples() const override { return 0; }
    void randomizeSample(int) override {}
    void modifySample(int) override {}
    void save(QString) const override {}
    void resetSamples() override {}

private:
    void computeSamples(const TrajectoryInput &input, const StandardSamplerBestTrajectoryInfo&) override;
};

#endif // STANDARDSAMPLER_H
