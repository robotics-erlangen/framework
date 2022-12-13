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
#include "trajectoryinput.h"
#include "protobuf/pathfinding.pb.h"
#include <QByteArray>
#include <vector>
#include <limits>

namespace Obstacles {

    struct Obstacle {
        Obstacle(int prio, float radius) : prio(prio), radius(radius) {}
        Obstacle(const pathfinding::Obstacle &obstacle) : prio(obstacle.prio()), radius(obstacle.radius()) {}
        virtual ~Obstacle() {}

        bool intersects(const TrajectoryPoint &point) const {
            return zonedDistance(point, 0) <= 0;
        }
        /// returns float max if the obstacle is not present anymore at the given time
        float distance(const TrajectoryPoint &point) const {
                return zonedDistance(point, std::numeric_limits<float>::infinity());
        }
        virtual float zonedDistance(const TrajectoryPoint &point, float nearRadius) const = 0;
        // TODO: it might be possible to also use the trajectory max. time to make the obstacles smaller
        virtual BoundingBox boundingBox() const = 0;
        // projects out of the position that the obstacle will have at t = inf (if it is still present)
        virtual Vector projectOut(Vector v, float extraDistance) const { return v; }

        void serialize(pathfinding::Obstacle *obstacle) const {
            obstacle->set_prio(prio);
            obstacle->set_radius(radius);
            serializeChild(obstacle);
        }
        virtual void serializeChild(pathfinding::Obstacle *obstacle) const = 0;
        virtual bool operator==(const Obstacle &other) const = 0;
        bool operator!=(const Obstacle &other) const { return !(*this == other); }

        int prio;
        float radius;
    };

    struct StaticObstacle : public Obstacle
    {
        // check for compatibility with checkMovementRelativeToObstacles optimization
        // the obstacle is assumed to be convex and that distance inside an obstacle
        // is calculated as the distance to the closest point on the obstacle border
        StaticObstacle(const char *name, int prio, float radius) : Obstacle(prio, radius), name(name) {}
        StaticObstacle(const pathfinding::Obstacle &obstacle);

        virtual float zonedDistance(const TrajectoryPoint &point, float nearRadius) const final override {
            return zonedDistance(point.state.pos, nearRadius);
        }

        virtual float distance(const Vector &v) const = 0;
        // returns the exact distance if it less than nearRadius, some value higher than nearRadius otherwise
        virtual float zonedDistance(const Vector &v, float nearRadius) const = 0;
        /**
         * @brief Returns the distance to the given line segment.
         * Negative distances for lines inside or partially inside the obstacle are
         * not necessarily supported, depending on obstacle type
         */
        virtual float distance(const LineSegment &segment) const = 0;

        QByteArray obstacleName() const { return name; }

        QByteArray name;
    };

    struct Circle : StaticObstacle
    {
        Circle(const char* name, int prio, float radius, Vector center) : StaticObstacle(name, prio, radius), center(center) {}
        Circle(const pathfinding::Obstacle &obstacle, const pathfinding::CircleObstacle &circle);

        float distance(const Vector &v) const override;
        float distance(const LineSegment &segment) const override;
        float zonedDistance(const Vector &v, float nearRadius) const override;
        Vector projectOut(Vector v, float extraDistance) const override;
        BoundingBox boundingBox() const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;
        bool operator==(const Obstacle &otherObst) const override;

    private:
        Vector center;
    };

    struct Rect : StaticObstacle
    {
        // gets a default constructor since it is also used for boundary checking
        Rect();
        Rect(const char* name, int prio, float x1, float y1, float x2, float y2, float radius);
        Rect(const pathfinding::Obstacle &obstacle, const pathfinding::RectObstacle &rect);

        float distance(const Vector &v) const override;
        float distance(const LineSegment &segment) const override;
        float zonedDistance(const Vector &v, float nearRadius) const override;
        Vector projectOut(Vector v, float extraDistance) const override;
        BoundingBox boundingBox() const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;
        bool operator==(const Obstacle &otherObst) const override;

        Vector bottomLeft;
        Vector topRight;
    };

    struct Triangle : StaticObstacle
    {
        // the points can be given in any order
        Triangle(const char *name, int prio, float radius, Vector a, Vector b, Vector c);
        Triangle(const pathfinding::Obstacle &obstacle, const pathfinding::TriangleObstacle &tri);

        float distance(const Vector &v) const override;
        float distance(const LineSegment &segment) const override;
        float zonedDistance(const Vector &v, float nearRadius) const override;
        BoundingBox boundingBox() const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;
        bool operator==(const Obstacle &otherObst) const override;

    private:
        Vector p1, p2, p3;
    };

    struct Line : StaticObstacle
    {
        Line(const char *name, int prio, float radius, const Vector &p1, const Vector &p2) : StaticObstacle(name, prio, radius), segment(p1, p2) {}
        Line(const pathfinding::Obstacle &obstacle, const pathfinding::LineObstacle &line);

        float distance(const Vector &v) const override;
        float distance(const LineSegment &segment) const override;
        float zonedDistance(const Vector &v, float nearRadius) const override;
        Vector projectOut(Vector v, float extraDistance) const override;
        BoundingBox boundingBox() const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;
        bool operator==(const Obstacle &otherObst) const override;

    private:
        LineSegment segment;
    };

    struct MovingCircle : public Obstacle {
        MovingCircle(int prio, float radius, Vector start, Vector speed, Vector acc, float t0, float t1);
        MovingCircle(const pathfinding::Obstacle &obstacle, const pathfinding::MovingCircleObstacle &circle);

        float zonedDistance(const TrajectoryPoint &point, float nearRadius) const override;
        BoundingBox boundingBox() const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;
        bool operator==(const Obstacle &otherObst) const override;

    private:
        Vector startPos;
        Vector speed;
        Vector acc;
        float startTime;
        float endTime;
    };

    struct MovingLine : public Obstacle {
        MovingLine(int prio, float radius, Vector start1, Vector speed1, Vector acc1,
                   Vector start2, Vector speed2, Vector acc2, float t0, float t1);
        MovingLine(const pathfinding::Obstacle &obstacle, const pathfinding::MovingLineObstacle &line);

        float zonedDistance(const TrajectoryPoint &point, float nearRadius) const override;
        BoundingBox boundingBox() const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;
        bool operator==(const Obstacle &otherObst) const override;

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

    struct FriendlyRobotObstacle : public Obstacle {
        FriendlyRobotObstacle();
        /**
         * @param trajectory Must be comprised of at least two points, all equidistant in time
         * The first element must start at time zero
         */
        FriendlyRobotObstacle(std::vector<TrajectoryPoint> *trajectory, float radius, int prio);
        FriendlyRobotObstacle(const pathfinding::Obstacle &obstacle, const pathfinding::FriendlyRobotObstacle &robot);
        FriendlyRobotObstacle(const FriendlyRobotObstacle &other);
        FriendlyRobotObstacle(FriendlyRobotObstacle &&other);
        FriendlyRobotObstacle &operator=(const FriendlyRobotObstacle &other);
        FriendlyRobotObstacle &operator=(FriendlyRobotObstacle &&other);

        float zonedDistance(const TrajectoryPoint &point, float nearRadius) const override;
        BoundingBox boundingBox() const override { return bound; }
        Vector projectOut(Vector v, float extraDistance) const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;
        bool operator==(const Obstacle &otherObst) const override;

    private:
        std::vector<TrajectoryPoint> *trajectory;
        float timeInterval;
        BoundingBox bound;

        // used when reconstructing obstacles from file
        std::vector<TrajectoryPoint> ownData;
    };

    struct OpponentRobotObstacle : public Obstacle {
        OpponentRobotObstacle(int prio, float baseRadius, Vector start, Vector speed);
        OpponentRobotObstacle(const pathfinding::Obstacle &obstacle, const pathfinding::OpponentRobotObstacle &circle);

        float zonedDistance(const TrajectoryPoint &point, float nearRadius) const override;
        BoundingBox boundingBox() const override;

        void serializeChild(pathfinding::Obstacle *obstacle) const override;
        bool operator==(const Obstacle &otherObst) const override;

    private:
        Vector startPos;
        Vector speed;

        static constexpr float MAX_TIME = 0.8f;
        static constexpr float ROBOT_RADIUS = 0.09f;
    };

}

#endif // OBSTACLES_H
