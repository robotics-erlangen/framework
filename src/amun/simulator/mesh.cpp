/***************************************************************************
 *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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

#include "mesh.h"
#include <cmath>

/*!
 * \class Mesh
 * \ingroup simulator
 * \brief A 3D mesh
 */

/*!
 * \brief Resets the mesh to its initial state
 */
void Mesh::clear()
{
    m_hull.clear();
    m_vertices.clear();
    m_normals.clear();
    m_texCoords.clear();
    m_indices.clear();
    m_groups.clear();
}

/*!
 * \brief Creates a mesh for a robot of a given size
 * \param radius Radius of the robot
 * \param height Height of the robot
 * \param angle Angle of the front side
 */
void Mesh::createRobotMesh(float radius, float height, float angle)
{
    clear();

    const float halfAngle = angle / 2.0f;

    const float angleStart = halfAngle + M_PI_2;
    const float angleStop =  2.0f * M_PI - halfAngle + M_PI_2 ;
    const uint num = 20;
    const float angleStep = (angleStop - angleStart) / num;

    addRobotCover(radius, height, num, angleStart, angleStep);
    if (angle > 0.0f) {
        addRobotFront(radius, height, angleStart, angleStop);
    }
    addRobotPlate(radius, height, num, angleStart, angleStep, true);
    addRobotPlate(radius, height, num, angleStop, angleStep, false);
}

/*!
 * \brief Adds triangles for the outer hull
 * \param radius Radius of the robot
 * \param height Height of the robot
 * \param num Number of segments
 * \param angle Angle of the hull start
 * \param angleStep Step size in rad
 */
void Mesh::addRobotCover(float radius, float height, uint num, float angle, float angleStep)
{
    QVector<uint>& group = m_groups[QStringLiteral("cover")];
    group.reserve(group.size() + 2 * num + 2);
    for (uint i = 0; i <= num; i++) {
        // upper vertex row
        addNormal(cos(angle), sin(angle), 0.0f);
        addTexCoord((angle - M_PI_2) / M_PI / 2.0f, 1.0f);
        addVertex(radius * cos(angle), radius * sin(angle),  height / 2.0f);
        m_hull.append(QVector3D(radius * cos(angle), radius * sin(angle),  height / 2.0f));

        // bottom vertex row
        addNormal(cos(angle), sin(angle), 0.0f);
        addTexCoord((angle - M_PI_2) / M_PI / 2.0f, 0.0f);
        addVertex(radius * cos(angle), radius * sin(angle), -height / 2.0f);
        m_hull.append(QVector3D(radius * cos(angle), radius * sin(angle), -height / 2.0f));

        group.append(i * 2 + 0);
        group.append(i * 2 + 1);

        angle += angleStep;
    }

    for (uint i = 0; i < num; i++) {
        addTriangle(i * 2 + 0, i * 2 + 1, i * 2 + 2);
        addTriangle(i * 2 + 2, i * 2 + 1, i * 2 + 3);
    }
}

/*!
 * \brief Adds front plane
 * \param radius Radius of the robot
 * \param height Height of the robot
 * \param angleStart Start angle in rad
 * \param angleStop Stop angle in rad
 */
void Mesh::addRobotFront(float radius, float height, float angleStart, float angleStop)
{
    uint firstIndex = m_vertices.count() / 3;

    addNormal(cos(angleStop), sin(angleStop), 0.0f);
    addTexCoord(0.0f, 1.0f);
    addVertex(radius * cos(angleStop), radius * sin(angleStop),  height / 2.0f);

    addNormal(cos(angleStop), sin(angleStop), 0.0f);
    addTexCoord(0.0f, 0.0f);
    addVertex(radius * cos(angleStop), radius * sin(angleStop), -height / 2.0f);

    addNormal(cos(angleStart), sin(angleStart), 0.0f);
    addTexCoord(1.0f, 1.0f);
    addVertex(radius * cos(angleStart), radius * sin(angleStart),  height / 2.0f);

    addNormal(cos(angleStart), sin(angleStart), 0.0f);
    addTexCoord(1.0f, 0.0f);
    addVertex(radius * cos(angleStart), radius * sin(angleStart), -height / 2.0f);

    addTriangle(firstIndex + 0, firstIndex + 1, firstIndex + 2);
    addTriangle(firstIndex + 2, firstIndex + 1, firstIndex + 3);

    QVector<uint>& group = m_groups[QStringLiteral("front")];
    group.append(firstIndex + 0);
    group.append(firstIndex + 1);
    group.append(firstIndex + 2);
    group.append(firstIndex + 3);
}

/*!
 * \brief Adds triangles for top/bottom plates
 * \param radius Radius of the robot
 * \param height Height of the robot
 * \param num Number of segments
 * \param angle Angle of the front side
 * \param angleStep Step size in rad
 * \param top If \c true this method creates the top plate. Otherwise the bottom plate is created
 */
void Mesh::addRobotPlate(float radius, float height, uint num, float angle, float angleStep, bool top)
{
    QVector<uint>& group = m_groups[top ? QStringLiteral("top") : QStringLiteral("bottom")];
    group.reserve(group.size() + num + 3);

    const float normal = top ? 1.0f : -1.0f;
    const uint firstIndex = m_vertices.count() / 3;

    addNormal(0.0f, 0.0f, normal);
    addTexCoord(0.5f, 0.5f);
    addVertex(0.0f, 0.0f, normal * height / 2.0f);
    group.append(firstIndex);

    for (uint i = 0; i <= num; i++) {
        addNormal(0.0f, 0.0f, normal);
        addTexCoord(cos(angle - M_PI_2) / 2.0f + 0.5f, sin(angle - M_PI_2) / 2.0f + 0.5f);
        addVertex(radius * cos(angle), radius * sin(angle), normal * height / 2.0f);

        group.append(firstIndex + i + 1);
        angle += normal * angleStep;
    }
    group.append(firstIndex + 1);

    for (uint i = 0; i < num; i++) {
        addTriangle(firstIndex, firstIndex + i + 1, firstIndex + i + 2);
    }
    addTriangle(firstIndex, firstIndex + num + 1, firstIndex + 1);
}

/*!
 * \brief Add a vertex
 * \param x x-coordinate of the vertex
 * \param y y-coordinate of the vertex
 * \param z z-coordinate of the vertex
 */
void Mesh::addVertex(float x, float y, float z)
{
    m_vertices.append(x);
    m_vertices.append(y);
    m_vertices.append(z);
}

/*!
 * \brief Add a normal to a vertex
 * \param x x-coordinate of the normal
 * \param y y-coordinate of the normal
 * \param z z-coordinate of the normal
 */
void Mesh::addNormal(float x, float y, float z)
{
    m_normals.append(x);
    m_normals.append(y);
    m_normals.append(z);
}

/*!
 * \brief Add texture coordinates to a vertex
 * \param x x-coordinate of the texture
 * \param y x-coordinate of the texture
 */
void Mesh::addTexCoord(float x, float y)
{
    m_texCoords.append(x);
    m_texCoords.append(y);
}

/*!
 * \brief Adds a triangle
 * \param v1 Index of the first vertex
 * \param v2 Index of the seconds vertex
 * \param v3 Index of the third vertex
 */
void Mesh::addTriangle(uint v1, uint v2, uint v3)
{
    m_indices.append(v1);
    m_indices.append(v2);
    m_indices.append(v3);
}
