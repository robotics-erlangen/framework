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
    for (uint i = 0; i <= num; i++) {
        m_hull.append(QVector3D(radius * cos(angle), radius * sin(angle),  height / 2.0f));
        m_hull.append(QVector3D(radius * cos(angle), radius * sin(angle), -height / 2.0f));

        angle += angleStep;
    }
}
