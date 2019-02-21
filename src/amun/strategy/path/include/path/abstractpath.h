#ifndef ABSTRACTPATH_H
#define ABSTRACTPATH_H

#include "vector.h"
#include "linesegment.h"
#include "protobuf/robot.pb.h"
#include <QByteArray>
#include <QVector>

class RNG;

class AbstractPath
{
protected:
    struct Obstacle
    {
        // check for compatibility with checkMovementRelativeToObstacles optimization
        // the obstacle is assumed to be convex and that distance inside an obstacle
        // is calculated as the distance to the closest point on the obstacle border
        virtual ~Obstacle() {}
        virtual float distance(const Vector &v) const = 0;
        virtual float distance(const LineSegment &segment) const = 0;

        QByteArray obstacleName() const { return name; }
        QByteArray name;
        int prio;
    };

    struct Circle : Obstacle
    {
        float distance(const Vector &v) const override;
        float distance(const LineSegment &segment) const override;

        Vector center;
        float radius;
    };

    struct Rect : Obstacle
    {
        float distance(const Vector &v) const override;
        float distance(const LineSegment &segment) const override;

        Vector bottom_left;
        Vector top_right;
    };

    struct Triangle : Obstacle
    {
        float distance(const Vector &v) const override;
        float distance(const LineSegment &segment) const override;

        Vector p1, p2, p3;
        float lineWidth;
    };

    struct Line : Obstacle
    {
        Line() : segment(Vector(0,0), Vector(0,0)) {}
        Line(const Vector &p1, const Vector &p2) : segment(p1, p2) {}
        float distance(const Vector &v) const override;
        float distance(const LineSegment &segment) const override;

        LineSegment segment;
        float width;
    };

public:
    AbstractPath(uint32_t rng_seed);
    virtual ~AbstractPath();
    AbstractPath(const AbstractPath&) = delete;
    AbstractPath& operator=(const AbstractPath&) = delete;
    virtual void reset() = 0;

    // basic world parameters
    void setRadius(float r);
    bool isRadiusValid() { return m_radius >= 0.f; }
    void setBoundary(float x1, float y1, float x2, float y2);
    // world obstacles
    void clearObstacles();
    void addCircle(float x, float y, float radius, const char *name, int prio);
    void addLine(float x1, float y1, float x2, float y2, float width, const char *name, int prio);
    void addRect(float x1, float y1, float x2, float y2, const char *name, int prio);
    void addTriangle(float x1, float y1, float x2, float y2, float x3, float y3, float lineWidth, const char *name, int prio);

protected:
    void collectObstacles() const;
    virtual void clearObstaclesCustom() {}

protected:
    // only valid after a call to collectObstacles, may become invalid after the calling function returns!
    mutable QVector<const Obstacle*> m_obstacles;

    QVector<Circle> m_circleObstacles;
    QVector<Rect> m_rectObstacles;
    QVector<Triangle> m_triangleObstacles;
    QVector<Line> m_lineObstacles;

    mutable RNG *m_rng; // allow using from const functions
    Rect m_boundary;
    float m_radius;
};

#endif // ABSTRACTPATH_H
