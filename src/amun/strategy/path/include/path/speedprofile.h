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

#include <vector>

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

    void limitToTime(float time);

    template<typename AccelerationProfile>
    std::pair<float, float> calculateRange(float slowDownTime) const;

    template<typename AccelerationProfile>
    float endPosition(float slowDownTime) const;

    // returns {offset, speed}
    template<typename AccelerationProfile>
    std::pair<float, float> offsetAndSpeedForTime(float time, float slowDownTime) const;

    float timeWithSlowdown(float slowDownTime) const;

    // outIndex can be 0 or 1, writing the result to the x or y coordinate of the vectors
    template<typename AccelerationProfile>
    void trajectoryPositions(std::vector<TrajectoryPoint> &outPoints, std::size_t outIndex, float timeInterval, float slowDownTime) const;

    void integrateTime();

    struct TrajectoryPosInfo1D {
        float endPos;
        float increaseAtSpeed;
    };

    // helper functions
    // WARNING: assumes that the input is valid and solvable
    static TrajectoryPosInfo1D calculateEndPos1DFastSpeed(float v0, float v1, float time, bool directionPositive, float acc, float vMax);
    void calculate1DTrajectoryFastEndSpeed(float v0, float v1, float time, bool directionPositive, float acc, float vMax);

    static TrajectoryPosInfo1D calculateEndPos1D(float v0, float v1, float hintDist, float acc, float vMax);
    void calculate1DTrajectory(float v0, float v1, float extraTime, bool directionPositive, float acc, float vMax);

    // Creates a single acceleration and brake segment that takes exactly "time" seconds
    // and travels "distance" meters. The acceleration can become arbitrarily large.
    // Maximum speed is not considered and has to be checked by the caller.
    // Limitations: sign(v0) == sign(distance) && (sign(v1) == sign(distance) || v1 == 0)
    void create1DAccelerationByDistance(float v0, float v1, float time, float distance);

    void printDebug();

private:
    void createFreeExtraTimeSegment(float beforeSpeed, float v, float nextSpeed, float time, float acc, float desiredVMax);
    static std::pair<float, float> freeExtraTimeDistance(float v, float time, float acc, float vMax);

private:
    StaticVector<VT, 4> profile;
    float s0 = 0;
    float correctionOffsetPerSecond = 0;

    friend class AlphaTimeTrajectory;
    friend class SpeedProfile;
    friend class Trajectory;
};

class SpeedProfile
{
public:
    static constexpr float SLOW_DOWN_TIME = 0.2f;

    SpeedProfile(Vector startPos, float slowDownTime) : slowDownTime(slowDownTime) {
        setStartPos(startPos);
    }

    void setStartPos(Vector pos) {
        xProfile.s0 = pos.x;
        yProfile.s0 = pos.y;
    }

    void setCorrectionOffset(Vector offset) {
        xProfile.correctionOffsetPerSecond = offset.x / xProfile.timeWithSlowdown(slowDownTime);
        yProfile.correctionOffsetPerSecond = offset.y / yProfile.timeWithSlowdown(slowDownTime);
    }

private:
    float time() const;
    Vector endPosition() const;
    RobotState stateAtTime(float time) const;
    std::vector<TrajectoryPoint> trajectoryPositions(std::size_t count, float timeInterval, float timeOffset) const;
    BoundingBox calculateBoundingBox() const;

    void printDebug();

    // only works properly for trajectories without slowdown
    void limitToTime(float time) {
        xProfile.limitToTime(time);
        yProfile.limitToTime(time);
    }

    // WARNING: this function does NOT create points for the slow down time. Use other functions if that is necessary
    std::vector<TrajectoryPoint> getTrajectoryPoints() const;

private:
    SpeedProfile1D xProfile;
    SpeedProfile1D yProfile;

    float slowDownTime;

    friend class AlphaTimeTrajectory;
    friend class Trajectory;
};

class Trajectory {
public:

    struct VT {
        Vector v;
        float t;
    };

    Trajectory(Vector startPos, float slowDownTime) : oldTrajectory(startPos, slowDownTime) {}
    explicit Trajectory(const SpeedProfile &trajectory);

    float getSlowDownTime() const { return slowDownTime; }

    // only works properly for trajectories without slowdown
    void limitToTime(float time);

    void setCorrectionOffset(Vector offset) {
        oldTrajectory.setCorrectionOffset(offset);
        correctionOffsetPerSecond = {oldTrajectory.xProfile.correctionOffsetPerSecond, oldTrajectory.yProfile.correctionOffsetPerSecond};
    }

    void setStartPos(Vector pos) {
        oldTrajectory.setStartPos(pos);
        s0 = pos;
    }


    float time() const { return oldTrajectory.time(); }
    Vector endPosition() const { return oldTrajectory.endPosition(); }
    RobotState stateAtTime(float time) const { return oldTrajectory.stateAtTime(time); }
    std::vector<TrajectoryPoint> trajectoryPositions(std::size_t count, float timeInterval, float timeOffset) const {
        return oldTrajectory.trajectoryPositions(count, timeInterval, timeOffset);
    }
    BoundingBox calculateBoundingBox() const { return oldTrajectory.calculateBoundingBox(); }

    Vector endSpeed() const {
        return profile.back().v;
    }

    Vector continuationSpeed() const {
        return profile[profile.size() / 2].v;
    }

    Vector initialAcceleration() const {
        return (profile[1].v - profile[0].v) / (profile[1].t - profile[0].t);
    }

    void printDebug() { oldTrajectory.printDebug(); }

    // WARNING: this function does NOT create points for the slow down time. Use other functions if that is necessary
    std::vector<TrajectoryPoint> getTrajectoryPoints() const { return oldTrajectory.getTrajectoryPoints(); }

private:
    StaticVector<VT, 6> profile;
    Vector s0;
    Vector correctionOffsetPerSecond;
    float slowDownTime;

    // only during refactoring
    SpeedProfile oldTrajectory;
};

#endif // SPEEDPROFILE_H
