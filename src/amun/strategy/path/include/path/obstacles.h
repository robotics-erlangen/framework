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

#ifndef OBSTACLES_H
#define OBSTACLES_H

#include "boundingbox.h"
#include "linesegment.h"
#include "protobuf/pathfinding.pb.h"
#include <QByteArray>
#include <vector>

enum class ZonedIntersection {
    IN_OBSTACLE,
    // the trajectory does not intersect an obstacle but is close to it
    // the definition of close is given by the safetyMargin provided by the caller
    NEAR_OBSTACLE,
    FAR_AWAY
};

namespace StaticObstacles {

    struct Obstacle
    {
        // check for compatibility with checkMovementRelativeToObstacles optimization
        // the obstacle is assumed to be convex and that distance inside an obstacle
        // is calculated as the distance to the closest point on the obstacle border
        virtual ~Obstacle() {}
        virtual float distance(const Vector &v) const = 0;
        virtual float distance(const LineSegment &segment) const = 0;
        virtual ZonedIntersection zonedDistance(const Vector &v, float nearRadius) const = 0;
        virtual Vector projectOut(Vector v, float extraDistance) const { return v; }
        virtual BoundingBox boundingBox() const = 0;

        void serialize(pathfinding::Obstacle *obstacle) const {
            obstacle->set_name(name.toStdString());
            obstacle->set_prio(prio);
            obstacle->set_radius(radius);
            serializeChild(obstacle);
        }
        virtual void serializeChild(pathfinding::Obstacle *obstacle) const = 0;
        // handles only the values of this upper class
        void deserializeCommon(const pathfinding::Obstacle &obstacle);

        QByteArray obstacleName() const { return name; }
        QByteArray name;
        int prio;
        float radius = 0;
    };

    struct Circle : Obstacle
    {
        float distance(const Vector &v) const override;
        float distance(const LineSegment &segment) const override;
        ZonedIntersection zonedDistance(const Vector &v, float nearRadius) const override;
        Vector projectOut(Vector v, float extraDistance) const override;
        BoundingBox boundingBox() const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;
        void deserialize(const pathfinding::CircleObstacle &obstacle);

        Vector center;
    };

    struct Rect : Obstacle
    {
        float distance(const Vector &v) const override;
        float distance(const LineSegment &segment) const override;
        ZonedIntersection zonedDistance(const Vector &v, float nearRadius) const override;
        BoundingBox boundingBox() const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;
        void deserialize(const pathfinding::RectObstacle &obstacle);

        Vector bottom_left;
        Vector top_right;
    };

    struct Triangle : Obstacle
    {
        float distance(const Vector &v) const override;
        float distance(const LineSegment &segment) const override;
        ZonedIntersection zonedDistance(const Vector &v, float nearRadius) const override;
        BoundingBox boundingBox() const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;
        void deserialize(const pathfinding::TriangleObstacle &obstacle);

        Vector p1, p2, p3;
    };

    struct Line : Obstacle
    {
        Line(const Vector &p1, const Vector &p2) : segment(p1, p2) {}
        float distance(const Vector &v) const override;
        float distance(const LineSegment &segment) const override;
        ZonedIntersection zonedDistance(const Vector &v, float nearRadius) const override;
        Vector projectOut(Vector v, float extraDistance) const override;
        BoundingBox boundingBox() const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;
        void deserialize(const pathfinding::LineObstacle &obstacle);

        LineSegment segment;
    };

    struct AvoidanceLine : public Line {
        AvoidanceLine(const Vector &p1, const Vector &p2, float avoidanceFactor) : Line(p1, p2), avoidanceFactor(avoidanceFactor) {}
        void serializeChild(pathfinding::Obstacle *obstacle) const override;
        void deserialize(const pathfinding::AvoidanceLineObstacle &obstacle);

        float avoidanceFactor;
    };

}

struct TrajectoryPoint
{
    Vector pos;
    Vector speed;
    float time;
};

namespace MovingObstacles {

    struct MovingObstacle {
        virtual ~MovingObstacle() {}
        virtual bool intersects(Vector pos, float time) const = 0;
        virtual float distance(Vector pos, float time) const = 0;
        virtual ZonedIntersection zonedDistance(const Vector &pos, float time, float nearRadius) const = 0;
        // TODO: it might be possible to also use the trajectory max. time to make the obstacles smaller
        virtual BoundingBox boundingBox() const = 0;

        void serialize(pathfinding::Obstacle *obstacle) const {
            obstacle->set_prio(prio);
            obstacle->set_radius(radius);
            serializeChild(obstacle);
        }
        virtual void serializeChild(pathfinding::Obstacle *obstacle) const = 0;
        // handles only the values of this upper class
        void deserializeCommon(const pathfinding::Obstacle &obstacle);

        int prio;
        float radius;
    };

    struct MovingCircle : public MovingObstacle {
        bool intersects(Vector pos, float time) const override;
        float distance(Vector pos, float time) const override;
        ZonedIntersection zonedDistance(const Vector &pos, float time, float nearRadius) const override;
        BoundingBox boundingBox() const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;
        void deserialize(const pathfinding::MovingCircleObstacle &obstacle);

        Vector startPos;
        Vector speed;
        Vector acc;
        float startTime;
        float endTime;
    };

    struct MovingLine : public MovingObstacle {
        bool intersects(Vector pos, float time) const override;
        float distance(Vector pos, float time) const override;
        ZonedIntersection zonedDistance(const Vector &pos, float time, float nearRadius) const override;
        BoundingBox boundingBox() const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;
        void deserialize(const pathfinding::MovingLineObstacle &obstacle);

        Vector startPos1;
        Vector speed1;
        Vector acc1;
        Vector startPos2;
        Vector speed2;
        Vector acc2;
        float startTime;
        float endTime;
    };

    struct FriendlyRobotObstacle : public MovingObstacle {
        FriendlyRobotObstacle();
        FriendlyRobotObstacle(std::vector<TrajectoryPoint> *trajectory, float radius, int prio);
        FriendlyRobotObstacle(const FriendlyRobotObstacle &other);
        FriendlyRobotObstacle(FriendlyRobotObstacle &&other);
        FriendlyRobotObstacle &operator=(const FriendlyRobotObstacle &other);
        FriendlyRobotObstacle &operator=(FriendlyRobotObstacle &&other);

        bool intersects(Vector pos, float time) const override;
        float distance(Vector pos, float time) const override;
        ZonedIntersection zonedDistance(const Vector &pos, float time, float nearRadius) const override;
        BoundingBox boundingBox() const override { return bound; }

        void serializeChild(pathfinding::Obstacle *obstacle) const override;
        void deserialize(const pathfinding::FriendlyRobotObstacle &obstacle);

        std::vector<TrajectoryPoint> *trajectory;
        float timeInterval;
        BoundingBox bound;

        // used when reconstructing obstacles from file
        std::vector<TrajectoryPoint> ownData;
    };

}

#endif // OBSTACLES_H
