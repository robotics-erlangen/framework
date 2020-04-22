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
    float offsetForTime(float time) const {
        float offset = 0;
        for (unsigned int i = 0;i<counter-1;i++) {
            if (profile[i+1].t >= time) {
                float diff = profile[i+1].t == profile[i].t ? 1 : (time - profile[i].t) / (profile[i+1].t - profile[i].t);
                float speed = profile[i].v + diff * (profile[i+1].v - profile[i].v);
                float partDist = (profile[i].v + speed) * 0.5f * (time - profile[i].t);
                return offset + partDist;
            }
            offset += (profile[i].v + profile[i+1].v) * 0.5f * (profile[i+1].t - profile[i].t);
        }
        return offset;
    }

    float speedForTime(float time) const {
        for (unsigned int i = 0;i<counter-1;i++) {
            if (profile[i+1].t >= time) {
                float diff = profile[i+1].t == profile[i].t ? 1 : (time - profile[i].t) / (profile[i+1].t - profile[i].t);
                float speed = profile[i].v + diff * (profile[i+1].v - profile[i].v);
                return speed;
            }
        }
        return profile[counter-1].v;
    }

    void limitToTime(float time) {
        for (unsigned int i = 0;i<counter-1;i++) {
            if (profile[i+1].t >= time) {
                float diff = profile[i+1].t == profile[i].t ? 1 : (time - profile[i].t) / (profile[i+1].t - profile[i].t);
                float speed = profile[i].v + diff * (profile[i+1].v - profile[i].v);
                profile[i+1].v = speed;
                profile[i+1].t = time;
                counter = i+2;
                return;
            }
        }
    }

    std::pair<float, float> calculateRange(float slowDownTime) const;

    float speedForTimeSlowDown(float time, float slowDownTime) const;

    float calculateSlowDownPos(float slowDownTime) const;

    float offsetForTimeSlowDown(float time, float slowDownTime) const;

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

    SpeedProfile1D xProfile;
    SpeedProfile1D yProfile;

    bool valid = true;

    bool isValid() const { return valid; }

    Vector positionForTime(float time) const {
        return Vector(xProfile.offsetForTime(time), yProfile.offsetForTime(time));
    }

    Vector speedForTime(float time) const {
        return Vector(xProfile.speedForTime(time), yProfile.speedForTime(time));
    }

    Vector speedForTimeSlowDown(float time, float slowDownTime) const {
        return Vector(xProfile.speedForTimeSlowDown(time, slowDownTime), yProfile.speedForTimeSlowDown(time, slowDownTime));
    }

    Vector calculateSlowDownPos(float slowDownTime) const {
        return Vector(xProfile.calculateSlowDownPos(slowDownTime), yProfile.calculateSlowDownPos(slowDownTime));
    }

    Vector positionForTimeSlowDown(float time, float slowDownTime) const {
        return Vector(xProfile.offsetForTimeSlowDown(time, slowDownTime), yProfile.offsetForTimeSlowDown(time, slowDownTime));
    }

    float time() const {
        return std::max(xProfile.profile[xProfile.counter-1].t, yProfile.profile[yProfile.counter-1].t);
    }

    float timeWithSlowDown(float slowDownTime) const {
        return std::max(xProfile.timeWithSlowDown(slowDownTime), yProfile.timeWithSlowDown(slowDownTime));
    }

    Vector continuationSpeed() const {
        return Vector(xProfile.profile[xProfile.counter / 2].v, yProfile.profile[yProfile.counter / 2].v);
    }

    void limitToTime(float time) {
        xProfile.limitToTime(time);
        yProfile.limitToTime(time);
    }

    BoundingBox calculateBoundingBox(Vector offset, float slowDownTime) const {
        auto xRange = xProfile.calculateRange(slowDownTime);
        auto yRange = yProfile.calculateRange(slowDownTime);
        return BoundingBox(offset + Vector(xRange.first, yRange.first), offset + Vector(xRange.second, yRange.second));
    }

    // WARNING: this function does NOT create points for the slow down time. Use other functions if that is necessary
    std::vector<TrajectoryPoint> getTrajectoryPoints(float slowDownTime) const;
};

#endif // SPEEDPROFILE_H
