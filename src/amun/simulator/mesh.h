/***************************************************************************
 *   Copyright 2014 Michael Eischer, Philipp Nordhus                       *
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

#ifndef MESH_H
#define MESH_H

#include <QMap>
#include <QVector>
#include <QVector3D>
#include <QString>

class Mesh
{
public:
    void clear();
    void createRobotMesh(float radius, float height, float angle);

public:
    const float* vertices() const { return m_vertices.data(); }
    const float* normals() const { return m_normals.data(); }
    const float* texCoords() const { return m_texCoords.data(); }
    const uint* indices() const { return m_indices.data(); }

    uint numVertices() const { return m_vertices.size() / 3; }
    uint numIndices() const { return m_indices.size(); }

    const uint* indices(const QString& name) const { return m_groups.value(name).data(); }
    uint numIndices(const QString& name) const { return m_groups.value(name).size(); }

    const QList<QVector3D>& hull() const { return m_hull; }

private:
    void addVertex(float, float, float);
    void addNormal(float, float, float);
    void addTexCoord(float, float);
    void addTriangle(uint, uint, uint);

    void addRobotCover(float radius, float height, uint num, float angle, float angleStep);
    void addRobotFront(float radius, float height, float angleStart, float angleStop);
    void addRobotPlate(float radius, float height, uint num, float angle, float angleStep, bool top);

private:
    QVector<float> m_vertices;
    QVector<float> m_normals;
    QVector<float> m_texCoords;
    QVector<uint> m_indices;
    QMap<QString, QVector<uint> > m_groups;
    QList<QVector3D> m_hull;
};

#endif // MESH_H
