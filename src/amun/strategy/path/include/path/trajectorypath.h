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

#ifndef TRAJECTORYPATH_H
#define TRAJECTORYPATH_H

#include "abstractpath.h"
#include "alphatimetrajectory.h"
#include "vector.h"
#include <vector>

class TrajectoryPath : public AbstractPath
{
public:
    struct Point
    {
        Vector pos;
        Vector speed;
        float time;
    };

private:
    struct MovingObstacle {
        virtual ~MovingObstacle() {}
        virtual bool intersects(Vector pos, float time) const = 0;
        virtual float distance(Vector pos, float time) const = 0;
        virtual BoundingBox boundingBox() const {
            float max = std::numeric_limits<float>::max();
            return BoundingBox(Vector(-max, -max), Vector(max, max));
        }

        int prio;
    };

    struct MovingCircle : public MovingObstacle {
        bool intersects(Vector pos, float time) const override;
        float distance(Vector pos, float time) const override;

        Vector startPos;
        Vector speed;
        Vector acc;
        float startTime;
        float endTime;
        float radius;
    };

    struct MovingLine : public MovingObstacle {
        bool intersects(Vector pos, float time) const override;
        float distance(Vector pos, float time) const override;

        Vector startPos1;
        Vector speed1;
        Vector acc1;
        Vector startPos2;
        Vector speed2;
        Vector acc2;
        float startTime;
        float endTime;
        float width;
    };

    struct FriendlyRobotObstacle : public MovingObstacle {
        FriendlyRobotObstacle();
        FriendlyRobotObstacle(std::vector<Point> *trajectory, float radius, int prio);
        bool intersects(Vector pos, float time) const override;
        float distance(Vector pos, float time) const override;
        BoundingBox boundingBox() const override { return  bound; }

        std::vector<Point> *trajectory;
        float radius;
        float timeInterval;
        BoundingBox bound;
    };

public:
    TrajectoryPath(uint32_t rng_seed);
    void reset() override;
    std::vector<Point> calculateTrajectory(Vector s0, Vector v0, Vector s1, Vector v1, float maxSpeed, float acceleration);
    // is guaranteed to be equally spaced in time
    std::vector<Point> *getCurrentTrajectory() { return &m_currentTrajectory; }
    void addMovingCircle(Vector startPos, Vector speed, Vector acc, float startTime, float endTime, float radius, int prio);
    void addMovingLine(Vector startPos1, Vector speed1, Vector acc1, Vector startPos2, Vector speed2, Vector acc2, float startTime, float endTime, float width, int prio);
    void addFriendlyRobotTrajectoryObstacle(std::vector<Point> *obstacle, int prio, float radius);
    void setOutOfFieldObstaclePriority(int prio) { m_outOfFieldPriority = prio; }
    int maxIntersectingObstaclePrio() const { return m_maxIntersectingObstaclePrio; }

private:
    template<typename container>
    bool isInStaticObstacle(const container &obstacles, Vector point) const;
    bool isInMovingObstacle(const std::vector<MovingObstacle *> &obstacles, Vector point, float time) const;
    bool isTrajectoryInObstacle(const SpeedProfile &profile, float timeOffset, float slowDownTime, Vector startPos);
    // return {min distance of trajectory to obstacles, min distance of last point to obstacles}
    std::pair<float, float> minObstacleDistance(const SpeedProfile &profile, float timeOffset, float slowDownTime, Vector startPos);
    float minObstacleDistance(Vector pos, float time, bool checkStatic);
    void findPathAlphaT();
    void findPathEndInObstacle();
    bool testEndPoint(Vector endPoint);
    bool checkMidPoint(Vector midSpeed, const float time, const float angle);
    Vector randomSpeed();
    Vector randomPointInField();
    std::vector<Point> getResultPath();
    void escapeObstacles();
    std::tuple<int, float, float> trajectoryObstacleScore(const SpeedProfile &speedProfile);

    void clearObstaclesCustom() override;

private:
    // constant input data
    // TODO: use variable convention
    float minX, maxX, minY, maxY;
    Vector minPoint, maxPoint, fieldSize;
    int m_outOfFieldPriority = 1;

    // frame input data
    Vector v0, v1, distance, s0, s1;
    bool exponentialSlowDown;
    QVector<MovingCircle> m_movingCircles;
    QVector<MovingLine> m_movingLines;
    QVector<FriendlyRobotObstacle> m_friendlyRobotObstacles;
    std::vector<MovingObstacle*> m_movingObstacles;

    // result trajectory (used by other robots as obstacle)
    std::vector<Point> m_currentTrajectory;

    // current best trajectory data
    struct BestTrajectoryInfo {
        float time = 0;
        float centerTime = 0;
        float angle = 0;
        Vector midSpeed = Vector(0, 0);
        bool valid = false;
    };
    BestTrajectoryInfo m_bestResultInfo;

    struct TrajectoryGenerationInfo {
        SpeedProfile profile;
        float slowDownTime;
        Vector desiredDistance;
        bool fastEndSpeed;
    };
    std::vector<TrajectoryGenerationInfo> m_generationInfo;
    // for end point in obstacle
    Vector m_bestEndPoint = Vector(0, 0);
    float m_bestEndPointDistance;
    // for escaping obstacles (or no path is possible)
    float m_bestEscapingTime = 2;
    float m_bestEscapingAngle = 0.5f;

    float m_bestStoppingTime = 2;
    float m_bestStoppingAngle = 0.5f;

    int m_maxIntersectingObstaclePrio = -1;

    // quasi constants
    float MAX_SPEED = 3.5f;
    float MAX_SPEED_SQUARED = 9.0f;
    float ACCELERATION = 3.0f;
    // constants
    const float TOTAL_SLOW_DOWN_TIME = 0.3f; // must be the same as in alphatimetrajectory
    const float OBSTACLE_AVOIDANCE_RADIUS = 0.1f;
    const float OBSTACLE_AVOIDANCE_BONUS = 1.2f;
};

#endif // TRAJECTORYPATH_H
