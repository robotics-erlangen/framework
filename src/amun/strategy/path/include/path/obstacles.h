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

namespace StaticObstacles {

    struct Obstacle
    {
        // check for compatibility with checkMovementRelativeToObstacles optimization
        // the obstacle is assumed to be convex and that distance inside an obstacle
        // is calculated as the distance to the closest point on the obstacle border
        virtual ~Obstacle() {}
        virtual float distance(const Vector &v) const = 0;
        virtual float distance(const LineSegment &segment) const = 0;
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
        float radius = 0;
    };

    struct Circle : Obstacle
    {
        float distance(const Vector &v) const override;
        float distance(const LineSegment &segment) const override;
        Vector projectOut(Vector v, float extraDistance) const override;
        BoundingBox boundingBox() const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;

        Vector center;
    };

    struct Rect : Obstacle
    {
        float distance(const Vector &v) const override;
        float distance(const LineSegment &segment) const override;
        BoundingBox boundingBox() const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;

        Vector bottom_left;
        Vector top_right;
    };

    struct Triangle : Obstacle
    {
        float distance(const Vector &v) const override;
        float distance(const LineSegment &segment) const override;
        BoundingBox boundingBox() const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;

        Vector p1, p2, p3;
    };

    struct Line : Obstacle
    {
        Line() : segment(Vector(0,0), Vector(0,0)) {}
        Line(const Vector &p1, const Vector &p2) : segment(p1, p2) {}
        float distance(const Vector &v) const override;
        float distance(const LineSegment &segment) const override;
        Vector projectOut(Vector v, float extraDistance) const override;
        BoundingBox boundingBox() const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;

        LineSegment segment;
    };

    struct AvoidanceLine : public Line {
        void serializeChild(pathfinding::Obstacle *obstacle) const override;

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
        virtual BoundingBox boundingBox() const {
            float max = std::numeric_limits<float>::max();
            return BoundingBox(Vector(-max, -max), Vector(max, max));
        }

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
        bool intersects(Vector pos, float time) const override;
        float distance(Vector pos, float time) const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;

        Vector startPos;
        Vector speed;
        Vector acc;
        float startTime;
        float endTime;
    };

    struct MovingLine : public MovingObstacle {
        bool intersects(Vector pos, float time) const override;
        float distance(Vector pos, float time) const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;

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
        bool intersects(Vector pos, float time) const override;
        float distance(Vector pos, float time) const override;
        BoundingBox boundingBox() const override { return  bound; }

        void serializeChild(pathfinding::Obstacle *obstacle) const override;

        std::vector<TrajectoryPoint> *trajectory;
        float timeInterval;
        BoundingBox bound;
    };

}

#endif // OBSTACLES_H
