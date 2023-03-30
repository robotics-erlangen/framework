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

#include "simfield.h"
#include "simulator.h"

using namespace camun::simulator;

SimField::SimField(btDiscreteDynamicsWorld *world, const world::Geometry &geometry) :
    m_world(world)
{
    const float totalWidth = geometry.field_width() / 2.0f + geometry.boundary_width();
    const float totalHeight = geometry.field_height() / 2.0f + geometry.boundary_width();
    // upper boundary
    const float roomHeight = 8.0f;
    const float height = geometry.field_height() / 2.0f - geometry.line_width();
    const float goalWidthHalf = geometry.goal_width() / 2.0f + geometry.goal_wall_width();
    const float goalHeightHalf = geometry.goal_height() / 2.0f;
    const float goalDepth = geometry.goal_depth() + geometry.goal_wall_width();
    const float goalDepthHalf = goalDepth / 2.0f;
    const float goalWallHalf = geometry.goal_wall_width() / 2.0f;

    // obstacle prototypes
    m_plane = new btStaticPlaneShape(btVector3(0, 0, 1), 0);
    m_goalSide = new btBoxShape(btVector3(goalWallHalf, goalDepthHalf, goalHeightHalf) * SIMULATOR_SCALE);
    m_goalBack = new btBoxShape(btVector3(goalWidthHalf, goalWallHalf, goalHeightHalf) * SIMULATOR_SCALE);

    // build field cube
    // floor
    addObject(m_plane, btTransform(btQuaternion(btVector3(1, 0, 0), 0), btVector3(0, 0, 0) * SIMULATOR_SCALE), 0.56, 0.35);
    // others
    addObject(m_plane, btTransform(btQuaternion(btVector3(1, 0, 0), M_PI), btVector3(0, 0, roomHeight) * SIMULATOR_SCALE), 0.3, 0.35);

    // if boundary_width == 0.0 the game is played without boundary area and needs different colliders on the goal line
    if (geometry.boundary_width() == 0.0) {
        const auto goalLineBoundaryWidthHalf = 0.5 * (totalWidth - goalWidthHalf);
        m_goalLineBoundaryShape.emplace(btVector3(goalLineBoundaryWidthHalf, 0.5, roomHeight * 0.5) * SIMULATOR_SCALE);
        const auto shapeOffsetX = goalWidthHalf + goalLineBoundaryWidthHalf;
        const auto shapeOffsetIntoVoidPositive = btVector3(0, 0.5, roomHeight * 0.5) * SIMULATOR_SCALE;
        const auto identity = btQuaternion::getIdentity();
        addObject(&m_goalLineBoundaryShape.value(), btTransform(identity, shapeOffsetIntoVoidPositive + btVector3(shapeOffsetX, totalHeight, 0) * SIMULATOR_SCALE), 0.3, 0.35);
        addObject(&m_goalLineBoundaryShape.value(), btTransform(identity, shapeOffsetIntoVoidPositive + btVector3(-shapeOffsetX, totalHeight, 0) * SIMULATOR_SCALE), 0.3, 0.35);

        const auto shapeOffsetIntoVoidNegative = btVector3(0, -0.5, roomHeight * 0.5) * SIMULATOR_SCALE;
        addObject(&m_goalLineBoundaryShape.value(), btTransform(identity, shapeOffsetIntoVoidNegative + btVector3(shapeOffsetX, -totalHeight, 0) * SIMULATOR_SCALE), 0.3, 0.35);
        addObject(&m_goalLineBoundaryShape.value(), btTransform(identity, shapeOffsetIntoVoidNegative + btVector3(-shapeOffsetX, -totalHeight, 0) * SIMULATOR_SCALE), 0.3, 0.35);
    } else {
        addObject(m_plane, btTransform(btQuaternion(btVector3(1, 0, 0),  M_PI_2), btVector3(0,  totalHeight, 0) * SIMULATOR_SCALE), 0.3, 0.35);
        addObject(m_plane, btTransform(btQuaternion(btVector3(1, 0, 0), -M_PI_2), btVector3(0, -totalHeight, 0) * SIMULATOR_SCALE), 0.3, 0.35);
    }

    addObject(m_plane, btTransform(btQuaternion(btVector3(0, 1, 0),  M_PI_2), btVector3(-totalWidth, 0, 0) * SIMULATOR_SCALE), 0.3, 0.35);
    addObject(m_plane, btTransform(btQuaternion(btVector3(0, 1, 0), -M_PI_2), btVector3( totalWidth, 0, 0) * SIMULATOR_SCALE), 0.3, 0.35);

    // corner blocks to smooth out the edges
    // on the actual field they are triangular blocks put in the corners of the field,
    // but here they are just approximated by the one side that is relevant for collision checking
    if (geometry.has_corner_block_cathetus_length()) {
        const float cathetus = geometry.corner_block_cathetus_length();
        const float hypothenuse = sqrt(2 * cathetus * cathetus);
        // basically the height of the triangle when looking top down onto the field
        const float blockOffset = (cathetus * cathetus) / hypothenuse;
        m_cornerBlockShape.emplace(btVector3(hypothenuse * 0.5, goalWallHalf, roomHeight * 0.5) * SIMULATOR_SCALE);

        // this places the blocks to smooth the edges in order of angle, but since half of it can just be mirrored with a 180° rotation only the cases of
        // M_PI / 4 and 3 * M_PI / 4 are listed and if negativeYHalf is true it computes the same positions and just additionally rotates them in the end
        for (const auto negativeYHalf : { false, true }) {
            for (const auto [multipleOfPi, mirrorX] : { std::pair{0.25, false}, std::pair{0.75, true} }) {
                // the sign of totalWidthOffset and goalWidthOffset are flipped, because for the same rotation the triangle is
                // e.g. at the lower left corner of the field and on the upper left corner of the goal
                const auto totalWidthOffset = mirrorX ? totalWidth : -totalWidth;
                const auto goalWidthOffset = mirrorX ? -goalWidthHalf : goalWidthHalf;

                const auto shapeOffsetFromCorner = btVector3(blockOffset, 0, roomHeight * 0.5).rotate(btVector3(0, 0, 1), M_PI * -multipleOfPi) * SIMULATOR_SCALE;
                const auto baseTransform = btTransform(btQuaternion(btVector3(0, 0, 1), M_PI * multipleOfPi), shapeOffsetFromCorner);
                auto cornerTransform = baseTransform;
                cornerTransform.getOrigin() += btVector3(totalWidthOffset, totalHeight, 0) * SIMULATOR_SCALE;

                if (negativeYHalf) {
                    cornerTransform = btTransform(btQuaternion(btVector3(0, 0, 1), M_PI)) * cornerTransform;
                }
                addObject(&m_cornerBlockShape.value(), cornerTransform, 0.3, 0.35);

                // if boundary_width == 0.0 the game is played without boundary area and does not need the blocks around the goals
                if (geometry.boundary_width() != 0.0) {
                    auto goalTransform = baseTransform;
                    goalTransform.getOrigin() += btVector3(goalWidthOffset, totalHeight, 0) * SIMULATOR_SCALE;
                    if (negativeYHalf) {
                        goalTransform = btTransform(btQuaternion(btVector3(0, 0, 1), M_PI)) * goalTransform;
                    }
                    addObject(&m_cornerBlockShape.value(), goalTransform, 0.3, 0.35);
                }
            }
        }
    }

    // create goals
    for (int goal = 0; goal < 2; goal++) {
        const float side = (goal == 0) ? -1.0f : 1.0f;
        const btQuaternion rot = btQuaternion::getIdentity();

        // if the game is played without boundary area the goal stands on the outside of the line and not on the middle,
        // so we have to offset the goals by line_width / 2
        const auto lineWidthOffset = geometry.boundary_width() != 0.0 ? 0.0 : geometry.line_width() * 0.5;

        addObject(m_goalSide, btTransform(rot, btVector3((goalWidthHalf - goalWallHalf), side * (height + goalDepthHalf + lineWidthOffset), goalHeightHalf) * SIMULATOR_SCALE), 0.3, 0.5);
        addObject(m_goalSide, btTransform(rot, btVector3(-(goalWidthHalf - goalWallHalf), side * (height + goalDepthHalf + lineWidthOffset), goalHeightHalf) * SIMULATOR_SCALE), 0.3, 0.5);
        addObject(m_goalBack, btTransform(rot, btVector3(0.0f, side * (height + goalDepth - goalWallHalf + lineWidthOffset), goalHeightHalf) * SIMULATOR_SCALE), 0.1, 0.5);
    }
}

SimField::~SimField()
{
    foreach (btCollisionObject *object, m_objects) {
        m_world->removeCollisionObject(object);
        delete object;
    }

    delete m_goalSide;
    delete m_goalBack;
    delete m_plane;
}

void SimField::addObject(btCollisionShape *shape, const btTransform &transform, float restitution, float friction)
{
    // create new obstacle
    btCollisionObject* object = new btCollisionObject;
    object->setCollisionShape(shape);
    // damp ball a bit if it hits an obstacle
    object->setRestitution(restitution);
    // the friction is multiplied with the colliding obstacle ones
    object->setFriction(friction);
    object->setRollingFriction(friction);
    object->setWorldTransform(transform);
    m_world->addCollisionObject(object);
    m_objects.append(object);
}
