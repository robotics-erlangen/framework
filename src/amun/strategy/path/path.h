/***************************************************************************
 *   Copyright 2015 Florian Bauer, Michael Eischer, Jan Kallwies,          *
 *       Philipp Nordhus                                                   *
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

#ifndef PATH_H
#define PATH_H

#include "kdtree.h"
#include "linesegment.h"
#include "core/rng.h"
#include "protobuf/robot.pb.h"
#include <QList>
#include <QString>

class Path
{
private:
    struct Obstacle
    {
        // check for compatibility with checkMovementRelativeToObstacles optimization
        // the obstacle is assumed to be convex and that distance inside an obstacle
        // is calculated as the distance to the closest point on the obstacle border
        virtual ~Obstacle() {}
        virtual float distance(const Vector &v) const = 0;
        virtual float distance(const LineSegment &segment) const = 0;
        virtual float size() const = 0;

        QString obstacleName() const { return name; }
        QString name;
    };

    struct Circle : Obstacle
    {
        float distance(const Vector &v) const;
        float distance(const LineSegment &segment) const;
        float size() const { return radius; }

        Vector center;
        float radius;
    };

    struct Line : Obstacle
    {
        Line(const Vector &p1, const Vector &p2) : segment(p1, p2) {}
        float distance(const Vector &v) const;
        float distance(const LineSegment &segment) const;
        float size() const { return width; }

        LineSegment segment;
        float width;
    };

    struct Rect : Obstacle
    {
        float distance(const Vector &v) const;
        float distance(const LineSegment &segment) const;
        float size() const { return std::min(top_right.x-bottom_left.x, top_right.y-bottom_left.y); }

        Vector bottom_left;
        Vector top_right;
    };

public:
    struct Waypoint
    {
        float x;
        float y;
        float l;
        float r;
    };

    typedef QList<Waypoint> List;

public:
    Path();
    ~Path();

public:
    void reset();
    // basic world parameters
    void setRadius(float r);
    bool isRadiusValid() { return m_radius >= 0.f; }
    void setBoundary(float x1, float y1, float x2, float y2);
    // world obstacles
    void clearObstacles();
    void addCircle(float x, float y, float radius, const char *name);
    void addLine(float x1, float y1, float x2, float y2, float width, const char *name);
    void addRect(float x1, float y1, float x2, float y2, const char *name);
    bool testSpline(const robot::Spline &spline, float radius) const;
    // path finding
    void setProbabilities(float p_dest, float p_wp);
    List get(float start_x, float start_y, float end_x, float end_y);
    const KdTree* treeStart() const { return m_treeStart; }
    const KdTree* treeEnd() const { return m_treeEnd; }

private:
    Vector evalSpline(const robot::Spline &spline, float t) const;

    Vector randomState() const;
    Vector getTarget(const Vector &end);
    void addToWaypointCache(const Vector &pos);
    const KdTree::Node * extend(KdTree *tree, const KdTree::Node *fromNode, const Vector &to, float radius, float stepSize);
    const KdTree::Node * rasterPath(const LineSegment &segment, const KdTree::Node * lastNode, float step_size);

    bool test(const LineSegment &segment, float radius) const;
    bool test(const LineSegment &segment, float radius, const QList<const Obstacle*> &obstacles) const;
    bool test(const Vector &v, float radius, const QList<const Obstacle*> &obstacles) const;
    float calculateObstacleCoverage(const Vector &v, const QList<const Obstacle*> &obstacles, float robotRadius) const;
    bool checkMovementRelativeToObstacles(const LineSegment &segment, const QList<const Obstacle*> &obstacles, float radius) const;
    bool pointInPlayfield(const Vector &point, float radius) const;
    float outsidePlayfieldCoverage(const Vector &point, float radius) const;

    Vector findValidPoint(const LineSegment &segment, float radius) const;
    void simplify(QList<Vector> &points, float radius);
    void cutCorners(QList<Vector> &points, float radius);
    void calculateCorridor(const Vector &start, List &list, float radius);

private:
    QList<Vector> m_waypoints;
    QList<const Obstacle*> m_obstacles;
    Rect m_boundary;
    float m_width; // width and height of bounding rectangle
    float m_height;
    float m_p_dest;
    float m_p_wp;
    float m_radius;
    const float m_stepSize;
    const int m_cacheSize;
    mutable RNG m_rng; // allow using from const functions
    KdTree *m_treeStart;
    KdTree *m_treeEnd;
};

#endif // PATH_H
