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

#include "simball.h"
#include "simulator.h"
#include "core/rng.h"
#include "protobuf/ssl_detection.pb.h"
#include <cmath>
#include <QDebug>

using namespace camun::simulator;

SimBall::SimBall(RNG *rng, btDiscreteDynamicsWorld *world, float fieldWidth, float fieldHeight) :
    m_rng(rng),
    m_world(world),
    m_fieldWidth(fieldWidth),
    m_fieldHeight(fieldHeight)
{
    // see http://robocup.mi.fu-berlin.de/buch/rolling.pdf for correct modelling
    m_sphere = new btSphereShape(BALL_RADIUS * SIMULATOR_SCALE);

    btVector3 localInertia(0, 0, 0);
    // FIXME measure inertia coefficient
    m_sphere->calculateLocalInertia(BALL_MASS, localInertia);

    btTransform startWorldTransform;
    startWorldTransform.setIdentity();
    startWorldTransform.setOrigin(btVector3(0, 0, BALL_RADIUS) * SIMULATOR_SCALE);
    m_motionState = new btDefaultMotionState(startWorldTransform);

    btRigidBody::btRigidBodyConstructionInfo rbInfo(BALL_MASS, m_motionState, m_sphere, localInertia);

    // parameters seem to be ignored...
    m_body = new btRigidBody(rbInfo);
    // see simulator.cpp
    m_body->setRestitution(1.f);
    m_body->setFriction(1.f);

    // \mu_r = -a / g = 0.0357 (while rolling)
    // rollingFriction in bullet is too unstable to be useful
    // use custom implementation in begin()
    m_world->addRigidBody(m_body);
}

SimBall::~SimBall()
{
    m_world->removeRigidBody(m_body);
    delete m_body;
    delete m_sphere;
    delete m_motionState;
}

void SimBall::begin()
{
    // custom implementation of rolling friction
    const btVector3 p = m_body->getWorldTransform().getOrigin();
    if (p.z() < BALL_RADIUS * 1.1 * SIMULATOR_SCALE) { // ball is on the ground
        const btVector3 velocity = m_body->getLinearVelocity();
        if (velocity.length() < 0.01 * SIMULATOR_SCALE) {
            // stop the ball if it is really slow
            // -> the real ball snaps to a dimple
            m_body->setLinearVelocity(btVector3(0, 0, 0));
        } else {
            // just apply rolling friction, normal friction is somehow handled by bullet
            // this is quite a hack as it's always applied
            // but as the strong deceleration is more or less magic, some additional deceleration doesn't matter
            const btScalar hackFactor = 1.4;
            const btScalar rollingDeceleration = hackFactor * 0.35;
            btVector3 force(velocity.x(), velocity.y(), 0.0f);
            force.safeNormalize();
            m_body->applyCentralImpulse(-force * rollingDeceleration * SIMULATOR_SCALE * BALL_MASS * SUB_TIMESTEP);
        }
    }

    if (m_move.has_p_x()) {
        if (m_move.position()) {
            // set ball to the given position and speed
            const btVector3 pos(m_move.p_x(), m_move.p_y(), BALL_RADIUS + m_move.p_z());
            btTransform transform = m_body->getWorldTransform();
            transform.setOrigin(pos * SIMULATOR_SCALE);
            m_body->setWorldTransform(transform);
            const btVector3 linVel(m_move.v_x(), m_move.v_y(), m_move.v_z());
            m_body->setLinearVelocity(linVel * SIMULATOR_SCALE);
            m_body->setAngularVelocity(btVector3(0, 0, 0));
            m_body->activate();
            m_body->setDamping(0.0, 0.0);
            m_move.Clear(); // clear move command
            // reset is neccessary, as the command is only sent once
            // without one canceling it
        } else {
            // move ball by hand
            btVector3 force(m_move.p_x(), m_move.p_y(), 0.0f);
            force = force - m_body->getWorldTransform().getOrigin() / SIMULATOR_SCALE;
            force.setZ(0.0f);
            m_body->activate();
            m_body->applyCentralImpulse(force * BALL_MASS * 0.1 * SIMULATOR_SCALE);
            m_body->setDamping(0.99, 0.99);
        }
    } else {
        // ball is slowed down by rolling friction, not damping!
        m_body->setDamping(0.0, 0.0);
    }
}

// samples a plane rotated towards the camera, sets p to the average position of the visible points and returns the relative amount of visible pixels
static float positionOfVisiblePixels(btVector3& p, const btVector3& simulatorBallPosition, const btVector3& simulatorCameraPosition, const btCollisionWorld* const m_world)
{

    const float simulatorBallRadius = BALL_RADIUS * SIMULATOR_SCALE;

    // axis and angle for rotating the plane towards the camera
    btVector3 cameraDirection = (simulatorCameraPosition - simulatorBallPosition).normalize();

    const btVector3 up = btVector3(0, 0, 1);

    btVector3 axis = up.cross(cameraDirection).normalize();
    btScalar angle = up.angle(cameraDirection);

    const int sampleRadius = 7;
    std::size_t maxHits = pow((2*sampleRadius+1), 2);
    std::size_t cameraHitCounter = 0;

    btVector3 newPos = btVector3(0, 0, 0);

    for (int x = -sampleRadius; x <= sampleRadius; ++x) {
        for (int y = -sampleRadius; y <= sampleRadius; ++y) {
            // create offset to the midpoint of the plane
            btVector3 offset(x, y, 0);
            offset *= simulatorBallRadius / sampleRadius;

            // ignore samples outside the ball
            if (offset.length() >= simulatorBallRadius) {
                --maxHits;
                continue;
            }

            // rotate the plane/offset
            offset.rotate(axis, angle);
            btVector3 samplePoint = simulatorBallPosition + offset;

            btCollisionWorld::ClosestRayResultCallback sampleResult(samplePoint, simulatorCameraPosition);
            m_world->rayTest(samplePoint, simulatorCameraPosition, sampleResult);

            if (!sampleResult.hasHit()) {
                // transform point back to plane with upwards normal to ensure unchanged height
                samplePoint -= simulatorBallPosition;
                samplePoint.rotate(axis, -angle);
                samplePoint += simulatorBallPosition;

                newPos += samplePoint;

                ++cameraHitCounter;
            }
        }
    }

    if (cameraHitCounter > 0) {
        // return average position of samples transformed to real world space
        newPos /= cameraHitCounter;
        p = newPos / SIMULATOR_SCALE;
    }

    return static_cast<float>(cameraHitCounter) / static_cast<float>(maxHits);
}

bool SimBall::update(SSL_DetectionBall *ball, float stddev, const CameraInfo& cameraInfo,
                    float fieldBoundaryWidth, bool enableInvisibleBall, float visibilityThreshold)
{
    // setup ssl-vision ball detection
    ball->set_confidence(1.0);
    ball->set_pixel_x(0);
    ball->set_pixel_y(0);

    btTransform transform;
    m_motionState->getWorldTransform(transform);

    btVector3 p = transform.getOrigin() / SIMULATOR_SCALE;

    const btVector3 simulatorCameraPosition = btVector3(cameraInfo.position.x(), cameraInfo.position.y(), cameraInfo.position.z()) * SIMULATOR_SCALE;

    float visibility = 1;
    // the camera uses the mid point of the visible pixels as the mid point of the ball
    // if some parts of the ball aren't visible the position this function adjusts the position accordingly (hopefully)
    if (enableInvisibleBall) {
        //if the visibility is lower than the threshold the ball disappears
        visibility = positionOfVisiblePixels(p, transform.getOrigin(), simulatorCameraPosition, m_world);
        if (visibility < visibilityThreshold) {
            return false;
        }
    }

    const float SCALING_LIMIT = 0.9f;
    const float MAX_EXTRA_OVERLAP = 0.05f;

    float modZ = std::min(SCALING_LIMIT * cameraInfo.position.z(), std::max(0.f, p.z() - BALL_RADIUS));
    float modX = (p.x() - cameraInfo.position.x()) * (cameraInfo.position.z() / (cameraInfo.position.z() - modZ)) + cameraInfo.position.x();
    float modY = (p.y() - cameraInfo.position.y()) * (cameraInfo.position.z() / (cameraInfo.position.z() - modZ)) + cameraInfo.position.y();

    float distBallCam = std::sqrt((cameraInfo.position.z()-modZ)*(cameraInfo.position.z()-modZ)+
        (cameraInfo.position.x()-p.x())*(cameraInfo.position.x()-p.x())+(cameraInfo.position.y()-p.y())*(cameraInfo.position.y()-p.y()));
    float denomSqrt = (distBallCam*1000)/FOCAL_LENGTH - 1;
    float area = visibility * (BALL_RADIUS*BALL_RADIUS*1000000*M_PI) / (denomSqrt*denomSqrt);
    ball->set_area(area);

    if (std::abs(modX - cameraInfo.position.x()) > cameraInfo.halfAreaX + fieldBoundaryWidth + MAX_EXTRA_OVERLAP
            || std::abs(modY - cameraInfo.position.y()) > cameraInfo.halfAreaY + fieldBoundaryWidth + MAX_EXTRA_OVERLAP) {
        // invalid
        return false;
    }

    // if (height > 0.1f) {
    //     qDebug() << "simball" << p.x() << p.y() << height << "ttt" << ball_x << ball_y;
    // }

    // add noise to coordinates
    // to convert from bullet coordinate system to ssl-vision rotate by 90 degree ccw
    const Vector2 noise = m_rng->normalVector(stddev);
    ball->set_x((modY + noise.x) * 1000.0f);
    ball->set_y(-(modX + noise.y) * 1000.0f);
    return true;
}


void SimBall::move(const amun::SimulatorMoveBall &ball)
{
    m_move = ball;
}

btVector3 SimBall::position() const
{
    const btTransform transform = m_body->getWorldTransform();
    return btVector3(transform.getOrigin().x(), transform.getOrigin().y(), 0);
}

btVector3 SimBall::speed() const
{
    return m_body->getLinearVelocity();
}

bool SimBall::isInvalid() const
{
    const btTransform transform = m_body->getWorldTransform();
    const btVector3 velocity = m_body->getLinearVelocity();
    bool isNan = std::isnan(transform.getOrigin().x()) || std::isnan(transform.getOrigin().y())
            || std::isnan(transform.getOrigin().z()) || std::isinf(transform.getOrigin().x())
            || std::isinf(transform.getOrigin().y()) || std::isinf(transform.getOrigin().z())
            || std::isnan(velocity.x()) || std::isnan(velocity.y()) || std::isnan(velocity.z())
            || std::isinf(velocity.x()) || std::isinf(velocity.y()) || std::isinf(velocity.z());
    bool isBelowField = (transform.getOrigin().z() <= 0);
    return isNan || isBelowField;
}

void SimBall::kick(const btVector3 &power)
{
    m_body->activate();
    m_body->applyCentralForce(power);

    // btTransform transform;
    // m_motionState->getWorldTransform(transform);
    // const btVector3 p = transform.getOrigin() / SIMULATOR_SCALE;
    // qDebug() << "kick at" << p.x() << p.y();
}
