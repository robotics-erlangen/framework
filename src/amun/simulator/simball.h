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

#ifndef SIMBALL_H
#define SIMBALL_H

#include "protobuf/command.pb.h"
#include <btBulletDynamicsCommon.h>

static const float BALL_RADIUS = 0.0215f;
static const float BALL_MASS = 0.046f;
static const float BALL_DECELERATION = 0.5f;

class RNG;
class SSL_DetectionBall;

class SimBall
{
public:
    SimBall(RNG *rng, btDiscreteDynamicsWorld *world, float fieldWidth, float fieldHeight);
    ~SimBall();

public:
    void begin();
    int update(SSL_DetectionBall *ball, float stddev);
    void move(const amun::SimulatorMoveBall &ball);
    void kick(const btVector3 &power);
    btVector3 position() const;
    btVector3 speed() const;
    const btRigidBody *body() const { return m_body; }
    bool isInvalid() const;

private:
    RNG *m_rng;
    btDiscreteDynamicsWorld *m_world;
    btCollisionShape *m_sphere;
    btRigidBody *m_body;
    btMotionState *m_motionState;
    amun::SimulatorMoveBall m_move;
    const float m_fieldWidth;
    const float m_fieldHeight;
};

#endif // SIMBALL_H
