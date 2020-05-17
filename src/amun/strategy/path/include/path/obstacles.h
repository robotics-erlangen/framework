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
        Obstacle(const char *name, int prio, float radius) : name(name), prio(prio), radius(radius) {}
        Obstacle(const pathfinding::Obstacle &obstacle);
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

        QByteArray obstacleName() const { return name; }

        QByteArray name;
        int prio;
        float radius;
    };

    struct Circle : Obstacle
    {
        Circle(const char* name, int prio, float radius, Vector center) : Obstacle(name, prio, radius), center(center) {}
        Circle(const pathfinding::Obstacle &obstacle, const pathfinding::CircleObstacle &circle);

        float distance(const Vector &v) const override;
        float distance(const LineSegment &segment) const override;
        ZonedIntersection zonedDistance(const Vector &v, float nearRadius) const override;
        Vector projectOut(Vector v, float extraDistance) const override;
        BoundingBox boundingBox() const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;

    private:
        Vector center;
    };

    struct Rect : Obstacle
    {
        // gets a default constructor since it is also used for boundary checking
        Rect();
        Rect(const char* name, int prio, float x1, float y1, float x2, float y2);
        Rect(const pathfinding::Obstacle &obstacle, const pathfinding::RectObstacle &rect);

        float distance(const Vector &v) const override;
        float distance(const LineSegment &segment) const override;
        ZonedIntersection zonedDistance(const Vector &v, float nearRadius) const override;
        BoundingBox boundingBox() const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;

        Vector bottom_left;
        Vector top_right;
    };

    struct Triangle : Obstacle
    {
        // the points can be given in any order
        Triangle(const char *name, int prio, float radius, Vector a, Vector b, Vector c);
        Triangle(const pathfinding::Obstacle &obstacle, const pathfinding::TriangleObstacle &tri);

        float distance(const Vector &v) const override;
        float distance(const LineSegment &segment) const override;
        ZonedIntersection zonedDistance(const Vector &v, float nearRadius) const override;
        BoundingBox boundingBox() const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;

    private:
        Vector p1, p2, p3;
    };

    struct Line : Obstacle
    {
        Line(const char *name, int prio, float radius, const Vector &p1, const Vector &p2) : Obstacle(name, prio, radius), segment(p1, p2) {}
        Line(const pathfinding::Obstacle &obstacle, const pathfinding::LineObstacle &line);

        float distance(const Vector &v) const override;
        float distance(const LineSegment &segment) const override;
        ZonedIntersection zonedDistance(const Vector &v, float nearRadius) const override;
        Vector projectOut(Vector v, float extraDistance) const override;
        BoundingBox boundingBox() const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;

    private:
        LineSegment segment;
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
        MovingObstacle(int prio, float radius) : prio(prio), radius(radius) {}
        MovingObstacle(const pathfinding::Obstacle &obstacle) : prio(obstacle.prio()), radius(obstacle.radius()) {}
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

        int prio;
        float radius;
    };

    struct MovingCircle : public MovingObstacle {
        MovingCircle(int prio, float radius, Vector start, Vector speed, Vector acc, float t0, float t1);
        MovingCircle(const pathfinding::Obstacle &obstacle, const pathfinding::MovingCircleObstacle &circle);
        bool intersects(Vector pos, float time) const override;
        float distance(Vector pos, float time) const override;
        ZonedIntersection zonedDistance(const Vector &pos, float time, float nearRadius) const override;
        BoundingBox boundingBox() const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;

    private:
        Vector startPos;
        Vector speed;
        Vector acc;
        float startTime;
        float endTime;
    };

    struct MovingLine : public MovingObstacle {
        MovingLine(int prio, float radius, Vector start1, Vector speed1, Vector acc1,
                   Vector start2, Vector speed2, Vector acc2, float t0, float t1);
        MovingLine(const pathfinding::Obstacle &obstacle, const pathfinding::MovingLineObstacle &line);

        bool intersects(Vector pos, float time) const override;
        float distance(Vector pos, float time) const override;
        ZonedIntersection zonedDistance(const Vector &pos, float time, float nearRadius) const override;
        BoundingBox boundingBox() const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;

    private:
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
        FriendlyRobotObstacle(const pathfinding::Obstacle &obstacle, const pathfinding::FriendlyRobotObstacle &robot);
        FriendlyRobotObstacle(const FriendlyRobotObstacle &other);
        FriendlyRobotObstacle(FriendlyRobotObstacle &&other);
        FriendlyRobotObstacle &operator=(const FriendlyRobotObstacle &other);
        FriendlyRobotObstacle &operator=(FriendlyRobotObstacle &&other);

        bool intersects(Vector pos, float time) const override;
        float distance(Vector pos, float time) const override;
        ZonedIntersection zonedDistance(const Vector &pos, float time, float nearRadius) const override;
        BoundingBox boundingBox() const override { return bound; }

        void serializeChild(pathfinding::Obstacle *obstacle) const override;

    private:
        std::vector<TrajectoryPoint> *trajectory;
        float timeInterval;
        BoundingBox bound;

        // used when reconstructing obstacles from file
        std::vector<TrajectoryPoint> ownData;
    };

}

#endif // OBSTACLES_H
