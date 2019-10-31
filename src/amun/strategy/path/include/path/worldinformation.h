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

#include "vector.h"
#include "obstacles.h"
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

    // world obstacles
    void clearObstacles();
    // only valid after a call to collectObstacles, may become invalid after the calling function returns!
    QVector<const StaticObstacles::Obstacle*> &obstacles() const { return m_obstacles; }
    void addToAllObstacleRadius(float additionalRadius);

    // static obstacles
    void addCircle(float x, float y, float radius, const char *name, int prio);
    void addLine(float x1, float y1, float x2, float y2, float width, const char *name, int prio);
    void addRect(float x1, float y1, float x2, float y2, const char *name, int prio);
    void addTriangle(float x1, float y1, float x2, float y2, float x3, float y3, float lineWidth, const char *name, int prio);

    void collectObstacles() const;
    bool pointInPlayfield(const Vector &point, float radius) const;

private:
    mutable QVector<const StaticObstacles::Obstacle*> m_obstacles;

    QVector<StaticObstacles::Circle> m_circleObstacles;
    QVector<StaticObstacles::Rect> m_rectObstacles;
    QVector<StaticObstacles::Triangle> m_triangleObstacles;
    QVector<StaticObstacles::Line> m_lineObstacles;

    StaticObstacles::Rect m_boundary;
    float m_radius = -1.0f;
};

#endif // WORLDINFORMATION_H
