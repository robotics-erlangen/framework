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

#ifndef SPEEDPROFILE_H
#define SPEEDPROFILE_H

#include "core/vector.h"
#include "boundingbox.h"
#include "trajectoryinput.h"
#include "accelerationprofile.h"

#include <vector>
#include <array>

class AlphaTimeTrajectory;
class SpeedProfile;

template<typename T, std::size_t n>
class StaticVector {
public:
    void push_back(const T &e) {
        elements[counter] = e;
        counter++;
    }

    const T& operator[](std::size_t index) const {
        return elements[index];
    }

    T& operator[](std::size_t index) {
        return elements[index];
    }

    const T& back() const {
        return elements[counter - 1];
    }

    std::size_t size() const {
        return counter;
    }

    void resize(std::size_t numElements) {
        counter = numElements;
    }

private:
    std::array<T, n> elements;
    int counter = 0;
};

class SpeedProfile1D {
public:
    struct VT {
        float v;
        float t;
    };

public:
    void integrateTime();

    struct TrajectoryPosInfo1D {
        float endPos;
        float increaseAtSpeed;
    };

    [[nodiscard]] static SpeedProfile1D createLinearSpeedSegment(float v0, float v1, float time);

    // helper functions
    // WARNING: assumes that the input is valid and solvable
    [[nodiscard]] static TrajectoryPosInfo1D calculateEndPos1DFastSpeed(float v0, float v1, float time, bool directionPositive, float acc, float vMax);
    [[nodiscard]] static SpeedProfile1D calculate1DTrajectoryFastEndSpeed(float v0, float v1, float time, bool directionPositive, float acc, float vMax);

    [[nodiscard]] static TrajectoryPosInfo1D calculateEndPos1D(float v0, float v1, float hintDist, float acc, float vMax);
    [[nodiscard]] static SpeedProfile1D calculate1DTrajectory(float v0, float v1, float extraTime, bool directionPositive, float acc, float vMax);

    // Creates a single acceleration and brake segment that takes exactly "time" seconds
    // and travels "distance" meters. The acceleration can become arbitrarily large.
    // Maximum speed is not considered and has to be checked by the caller.
    // Limitations: sign(v0) == sign(distance) && (sign(v1) == sign(distance) || v1 == 0)
    [[nodiscard]] static SpeedProfile1D create1DAccelerationByDistance(float v0, float v1, float time, float distance);

    float initialAcceleration() const {
        return (profile[1].v - profile[0].v) / (profile[1].t - profile[0].t);
    }

private:
    void createFreeExtraTimeSegment(float beforeSpeed, float v, float nextSpeed, float time, float acc, float desiredVMax);
    static std::pair<float, float> freeExtraTimeDistance(float v, float time, float acc, float vMax);

private:
    StaticVector<VT, 4> profile;

    friend class Trajectory;
};

class Trajectory {
public:

    Trajectory() = default;
    Trajectory(const SpeedProfile1D &xProfile, const SpeedProfile1D &yProfile,
               Vector startPos, float slowDownTime);

    float getSlowDownTime() const { return slowDownTime; }

    // only works properly for trajectories without slowdown
    void limitToTime(float time);

    void setCorrectionOffset(Vector offset) {
        correctionOffsetPerSecond = offset / time();
    }

    void setStartPos(Vector pos) {
        s0 = pos;
    }


    float time() const;
    Vector endPosition() const;
    RobotState stateAtTime(float time) const;
    std::vector<TrajectoryPoint> trajectoryPositions(std::size_t count, float timeInterval, float timeOffset) const;
    BoundingBox calculateBoundingBox() const;

    Vector endSpeed() const {
        return profile.back().v;
    }

    Vector continuationSpeed() const {
        return profile[profile.size() / 2].v;
    }

    Vector initialAcceleration() const {
        return (profile[1].v - profile[0].v) / (profile[1].t - profile[0].t);
    }

    void printDebug() const;

    // WARNING: this function does NOT create points for the slow down time. Use other functions if that is necessary
    std::vector<TrajectoryPoint> getTrajectoryPoints(float t0) const;

    class Iterator {
    public:
        Iterator(const Trajectory &trajectory, const float startTimeOffset);
        TrajectoryPoint next(const float timeOffset);

    private:
        const Trajectory &trajectory;
        float startTimeOffset;
        // offset at the start of current segment
        Vector segmentStartOffset;
        // time at the start and end of the current segment
        float segmentStartTime{0};
        float segmentEndTime{0};
        // index of the first VT slice of the current segment
        std::size_t currentIndex{0};
        float currentTime{0};
        SlowdownAcceleration acceleration;
        SlowdownAcceleration::SegmentPrecomputation precomputation;
    };

private:
    StaticVector<VT, 6> profile{};
    Vector s0{0, 0};
    Vector correctionOffsetPerSecond{0, 0};
    float slowDownTime{0};
};

#endif // SPEEDPROFILE_H
