#ifndef OBSTACLES_H
#define OBSTACLES_H

#include "boundingbox.h"
#include "linesegment.h"
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

        Vector center;
    };

    struct Rect : Obstacle
    {
        float distance(const Vector &v) const override;
        float distance(const LineSegment &segment) const override;
        BoundingBox boundingBox() const override;

        Vector bottom_left;
        Vector top_right;
    };

    struct Triangle : Obstacle
    {
        float distance(const Vector &v) const override;
        float distance(const LineSegment &segment) const override;
        BoundingBox boundingBox() const override;

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

        LineSegment segment;
    };

    struct AvoidanceLine : public Line {
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
        FriendlyRobotObstacle(std::vector<TrajectoryPoint> *trajectory, float radius, int prio);
        bool intersects(Vector pos, float time) const override;
        float distance(Vector pos, float time) const override;
        BoundingBox boundingBox() const override { return  bound; }

        std::vector<TrajectoryPoint> *trajectory;
        float radius;
        float timeInterval;
        BoundingBox bound;
    };

}

#endif // OBSTACLES_H
