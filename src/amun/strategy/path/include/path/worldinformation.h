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

#ifndef WORLDINFORMATION_H
#define WORLDINFORMATION_H

#include "core/vector.h"
#include "obstacles.h"
#include "alphatimetrajectory.h"
#include "protobuf/pathfinding.pb.h"
#include <QVector>

class WorldInformation
{
public:
    // basic world parameters
    void setRadius(float r);
    bool isRadiusValid() { return m_radius >= 0.f; }
    void setBoundary(float x1, float y1, float x2, float y2);
    float radius() const { return m_radius; }
    const StaticObstacles::Rect &boundary() const { return m_boundary; }
    void setOutOfFieldObstaclePriority(int prio) { m_outOfFieldPriority = prio; }
    int outOfFieldPriority() const { return m_outOfFieldPriority; }
    void setRobotId(int id) { m_robotId = id; }
    int robotId() const { return m_robotId; }

    // world obstacles
    void clearObstacles();
    // only valid after a call to collectObstacles, may become invalid after the calling function returns!
    QVector<const StaticObstacles::Obstacle*> &obstacles() const { return m_obstacles; }
    void addToAllStaticObstacleRadius(float additionalRadius);
    const std::vector<MovingObstacles::MovingObstacle*> &movingObstacles() const { return m_movingObstacles; }

    // static obstacles
    void addCircle(float x, float y, float radius, const char *name, int prio);
    void addLine(float x1, float y1, float x2, float y2, float width, const char *name, int prio);
    void addRect(float x1, float y1, float x2, float y2, const char *name, int prio);
    void addTriangle(float x1, float y1, float x2, float y2, float x3, float y3, float lineWidth, const char *name, int prio);

    void collectObstacles() const;
    bool pointInPlayfield(const Vector &point, float radius) const;

    // moving obstacles
    void addMovingCircle(Vector startPos, Vector speed, Vector acc, float startTime, float endTime, float radius, int prio);
    void addMovingLine(Vector startPos1, Vector speed1, Vector acc1, Vector startPos2, Vector speed2, Vector acc2, float startTime, float endTime, float width, int prio);
    void addFriendlyRobotTrajectoryObstacle(std::vector<TrajectoryPoint> *obstacle, int prio, float radius);
    void addAvoidanceLine(Vector s0, Vector s1, float radius, float avoidanceFactor);

    void collectMovingObstacles();

    // obstacle checking for points and trajectories
    template<typename container>
    bool isInStaticObstacle(const container &obstacles, Vector point) const {
        if (!pointInPlayfield(point, m_radius)) {
            return true;
        }
        for (const auto obstacle : obstacles) {
            if (obstacle->distance(point) < 0) {
                return true;
            }
        }
        return false;
    }

    bool isInMovingObstacle(const std::vector<MovingObstacles::MovingObstacle *> &obstacles, Vector point, float time) const;
    bool isTrajectoryInObstacle(const SpeedProfile &profile, float timeOffset, float slowDownTime, Vector startPos) const;
    // return {min distance of trajectory to obstacles, min distance of last point to obstacles}
    std::pair<float, float> minObstacleDistance(const SpeedProfile &profile, float timeOffset, float slowDownTime, Vector startPos) const;
    float minObstacleDistance(Vector pos, float time, bool checkStatic, bool checkDynamic) const;

    // collectobstacles must have been called before calling this function
    void serialize(pathfinding::WorldState *state) const;
    // collect obstacles must be called after calling this and before using it
    void deserialize(const pathfinding::WorldState &state);

private:
    mutable QVector<const StaticObstacles::Obstacle*> m_obstacles;

    std::vector<StaticObstacles::Circle> m_circleObstacles;
    std::vector<StaticObstacles::Rect> m_rectObstacles;
    std::vector<StaticObstacles::Triangle> m_triangleObstacles;
    std::vector<StaticObstacles::Line> m_lineObstacles;

    std::vector<MovingObstacles::MovingCircle> m_movingCircles;
    std::vector<MovingObstacles::MovingLine> m_movingLines;
    std::vector<MovingObstacles::FriendlyRobotObstacle> m_friendlyRobotObstacles;
    std::vector<MovingObstacles::MovingObstacle*> m_movingObstacles;
    std::vector<StaticObstacles::AvoidanceLine> m_avoidanceLines;

    int m_outOfFieldPriority = 1;

    StaticObstacles::Rect m_boundary;
    float m_radius = -1.0f;
    int m_robotId = 0;

    // ignore all moving obstacles more than this number of seconds in the future
    // disabled for now
    static constexpr float IGNORE_MOVING_OBSTACLE_THRESHOLD = std::numeric_limits<float>::max();
};

#endif // WORLDINFORMATION_H
