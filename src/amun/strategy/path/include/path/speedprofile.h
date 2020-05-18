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
#include "obstacles.h" // for TrajectoryPoint

#include <vector>

class SpeedProfile1D {
public:
    struct VT {
        float v;
        float t;
    };

    VT profile[4];
    unsigned int counter = 0;
    float acc;

public:

    void limitToTime(float time);

    std::pair<float, float> calculateRange(float slowDownTime) const;

    float speedForTime(float time) const;
    float speedForTimeSlowDown(float time, float slowDownTime) const;

    float calculateSlowDownPos(float slowDownTime) const;

    float offsetForTime(float time) const;
    float offsetForTimeSlowDown(float time, float slowDownTime) const;

    // outIndex can be 0 or 1, writing the result to the x or y coordinate of the vectors
    void trajectoryPositions(std::vector<Vector> &outPoints, std::size_t outIndex, float timeInterval, float positionOffset, std::size_t desiredCount) const;
    void trajectoryPositionsSlowDown(std::vector<Vector> &outPoints, std::size_t outIndex, float timeInterval, float positionOffset, float slowDownTime) const;

    void integrateTime() {
        float totalTime = 0;
        for (unsigned int i = 0;i<counter;i++) {
            totalTime += profile[i].t;
            profile[i].t = totalTime;
        }
    }

    float timeWithSlowDown(float slowDownTime) const;

    struct TrajectoryPosInfo1D {
        float endPos;
        float increaseAtSpeed;
    };

    // helper functions
    // WARNING: assumes that the input is valid and solvable
    static TrajectoryPosInfo1D calculateEndPos1DFastSpeed(float v0, float v1, float time, bool directionPositive, float acc, float vMax);
    void calculate1DTrajectoryFastEndSpeed(float v0, float v1, float time, bool directionPositive, float acc, float vMax);

    static TrajectoryPosInfo1D calculateEndPos1D(float v0, float v1, float hintDist, float acc, float vMax);
    void calculate1DTrajectory(float v0, float v1, float hintDist, float acc, float vMax);
};

class SpeedProfile
{
public:
    static constexpr float SLOW_DOWN_TIME = 0.2f;

    SpeedProfile(float slowDownTime) : slowDownTime(slowDownTime) {}

    SpeedProfile1D xProfile;
    SpeedProfile1D yProfile;

    bool valid = true;

    float slowDownTime;

    bool isValid() const { return valid; }

    Vector calculateSlowDownPos() const {
        return Vector(xProfile.calculateSlowDownPos(slowDownTime), yProfile.calculateSlowDownPos(slowDownTime));
    }

    Vector positionForTime(float time) const {
        if (slowDownTime == 0.0f) {
            return Vector(xProfile.offsetForTime(time), yProfile.offsetForTime(time));
        } else {
            return Vector(xProfile.offsetForTimeSlowDown(time, slowDownTime), yProfile.offsetForTimeSlowDown(time, slowDownTime));
        }
    }

    std::vector<Vector> trajectoryPositions(Vector offset, std::size_t count, float timeInterval) const {
        std::vector<Vector> result(count);
        if (slowDownTime == 0.0f) {
            xProfile.trajectoryPositions(result, 0, timeInterval, offset.x, count);
            yProfile.trajectoryPositions(result, 1, timeInterval, offset.y, count);
        } else {
            xProfile.trajectoryPositionsSlowDown(result, 0, timeInterval, offset.x, slowDownTime);
            yProfile.trajectoryPositionsSlowDown(result, 1, timeInterval, offset.y, slowDownTime);
        }
        return result;
    }

    Vector speedForTime(float time) const {
        if (slowDownTime == 0.0f) {
            return Vector(xProfile.speedForTime(time), yProfile.speedForTime(time));
        } else {
            return Vector(xProfile.speedForTimeSlowDown(time, slowDownTime), yProfile.speedForTimeSlowDown(time, slowDownTime));
        }
    }

    Vector endSpeed() const {
        return Vector(xProfile.profile[xProfile.counter-1].v, yProfile.profile[yProfile.counter-1].v);
    }

    float time() const {
        if (slowDownTime == 0.0f) {
            return std::max(xProfile.profile[xProfile.counter-1].t, yProfile.profile[yProfile.counter-1].t);
        } else {
            return std::max(xProfile.timeWithSlowDown(slowDownTime), yProfile.timeWithSlowDown(slowDownTime));
        }
    }

    Vector continuationSpeed() const {
        return Vector(xProfile.profile[xProfile.counter / 2].v, yProfile.profile[yProfile.counter / 2].v);
    }

    // only works properly for trajectories without slowdown
    void limitToTime(float time) {
        xProfile.limitToTime(time);
        yProfile.limitToTime(time);
    }

    BoundingBox calculateBoundingBox(Vector offset) const {
        auto xRange = xProfile.calculateRange(slowDownTime);
        auto yRange = yProfile.calculateRange(slowDownTime);
        return BoundingBox(offset + Vector(xRange.first, yRange.first), offset + Vector(xRange.second, yRange.second));
    }

    // WARNING: this function does NOT create points for the slow down time. Use other functions if that is necessary
    std::vector<TrajectoryPoint> getTrajectoryPoints() const;
};

#endif // SPEEDPROFILE_H
