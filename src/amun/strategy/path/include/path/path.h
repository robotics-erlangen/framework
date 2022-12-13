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

#include "abstractpath.h"
#include "kdtree.h"
#include "linesegment.h"

class Path : public AbstractPath
{
public:
    struct Waypoint
    {
        float x;
        float y;
        float l;
        float r;
    };

    typedef QVector<Waypoint> List;

public:
    Path(uint32_t rng_seed);
    virtual ~Path() override;
    Path(const Path&) = delete;
    Path& operator=(const Path&) = delete;


public:
    void reset() override;

    void addSeedTarget(float x, float y);
    bool testSpline(const robot::Spline &spline);

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

    bool test(const LineSegment &segment) const;
    bool test(const LineSegment &segment, const QVector<const Obstacles::StaticObstacle*> &obstacles) const;
    bool test(const Vector &v, float radius, const QVector<const Obstacles::StaticObstacle*> &obstacles) const;
    float calculateObstacleCoverage(const Vector &v, const QVector<const Obstacles::StaticObstacle*> &obstacles, float robotRadius) const;
    bool checkMovementRelativeToObstacles(const LineSegment &segment, const QVector<const Obstacles::StaticObstacle*> &obstacles, float radius) const;
    float outsidePlayfieldCoverage(const Vector &point, float radius) const;

    Vector findValidPoint(const LineSegment &segment) const;
    void simplify(QVector<Vector> &points, float radius);
    void cutCorners(QVector<Vector> &points);
    void calculateCorridor(const Vector &start, List &list, float radius);

    virtual void clearObstaclesCustom() override;

private:
    QVector<Vector> m_waypoints;
    QVector<Vector> m_seedTargets;

    Obstacles::Rect m_sampleRect;
    float m_p_dest;
    float m_p_wp;
    const float m_stepSize;
    const int m_cacheSize;
    KdTree *m_treeStart;
    KdTree *m_treeEnd;
};

#endif // PATH_H
