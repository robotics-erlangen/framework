/***************************************************************************
 *   Copyright 2015 Michael Eischer, Jan Kallwies, Philipp Nordhus         *
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

#ifndef SIMROBOT_H
#define SIMROBOT_H

#include "protobuf/command.pb.h"
#include "protobuf/robot.pb.h"
#include <QList>
#include <btBulletDynamicsCommon.h>

class RNG;
class SSL_DetectionRobot;

namespace camun {
    namespace simulator {
        class SimBall;
        class SimRobot;
    }
}

class camun::simulator::SimRobot
{
public:
    SimRobot(RNG *rng, const robot::Specs &specs, btDiscreteDynamicsWorld *world, const btVector3 &pos, float dir);
    ~SimRobot();
    SimRobot(const SimRobot&) = delete;
    SimRobot& operator=(const SimRobot&) = delete;

public:
    void begin(SimBall *ball, double time);
    bool canKickBall(SimBall *ball) const;
    void tryKick(SimBall *ball, float power, double time);
    robot::RadioResponse setCommand(const robot::Command &command, SimBall *ball, bool charge);
    void update(SSL_DetectionRobot *robot, float stddev_p, float stddev_phi, qint64 time);
    void move(const amun::SimulatorMoveRobot &robot);
    bool isFlipped();
    btVector3 position() const;
    qint64 getLastSendTime() const { return m_lastSendTime; }

    const robot::Specs& specs() const { return m_specs; }

private:
    btVector3 relativeBallSpeed(SimBall *ball) const;
    float bound(float acceleration, float oldSpeed, float speedupLimit, float brakeLimit) const;
    void calculateDribblerMove(const btVector3 pos, const btQuaternion rot, const btVector3 linVel);

    RNG *m_rng;
    robot::Specs m_specs;
    btDiscreteDynamicsWorld *m_world;
    btRigidBody * m_body;
    btRigidBody * m_dribblerBody;
    btHingeConstraint *m_constraint;
    QList<btCollisionShape*> m_shapes;
    btMotionState * m_motionState;
    btVector3 m_dribblerCenter;

    struct Wheel
    {
        float angle;
        btVector3 pos;
        btVector3 dir;
    };

    amun::SimulatorMoveRobot m_move;
    robot::Command m_command;
    bool m_charge;
    bool m_isCharged;
    bool m_inStandby;
    double m_shootTime;
    double m_commandTime;

    float error_sum_v_s;
    float error_sum_v_f;
    float error_sum_omega;

    qint64 m_lastSendTime = 0;
};

#endif // SIMROBOT_H
