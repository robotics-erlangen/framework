/***************************************************************************
 *   Copyright 2021 Andreas Wendler                                        *
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

#include "sslvisiontracked.h"
#include "core/rng.h"

SSLVisionTracked::SSLVisionTracked()
{
    RNG rng;
    for (int i = 0;i<UUID_LENGTH;i++) {
        m_uuid += static_cast<char>('a' + (rng.uniformInt() % 26));
    }
}

void SSLVisionTracked::setFlip(bool flip)
{
    m_fieldTransform.setFlip(flip);
}

void SSLVisionTracked::setVector3(gameController::Vector3 *vec, float x, float y, float z)
{
    vec->set_x(m_fieldTransform.applyPosX(y, -x));
    vec->set_y(m_fieldTransform.applyPosY(y, -x));
    vec->set_z(z);
}

void SSLVisionTracked::setVector2(gameController::Vector2 *vec, float x, float y)
{
    vec->set_x(m_fieldTransform.applyPosX(y, -x));
    vec->set_y(m_fieldTransform.applyPosY(y, -x));
}

void SSLVisionTracked::setRobot(gameController::TrackedRobot *robot, const world::Robot &original, bool isBlue)
{
    robot->mutable_robot_id()->set_id(original.id());
    robot->mutable_robot_id()->set_team(isBlue ? gameController::Team::BLUE : gameController::Team::YELLOW);
    setVector2(robot->mutable_pos(), original.p_x(), original.p_y());
    robot->set_orientation(m_fieldTransform.applyAngle(original.phi() - M_PI_2));
    setVector2(robot->mutable_vel(), original.v_x(), original.v_y());
    robot->set_vel_angular(original.omega());
    // TODO: visibility
}

void SSLVisionTracked::createTrackedFrame(const world::State &state, gameController::TrackerWrapperPacket *packet)
{
    const double NS_PER_SEC = 1000000000.0;

    packet->set_uuid(m_uuid);
    packet->set_source_name(SOURCE_NAME);
    auto frame = packet->mutable_tracked_frame();
    frame->set_frame_number(m_trackedFrameCounter++);
    frame->set_timestamp(state.time() / NS_PER_SEC);

    {
        auto ball = frame->add_balls();
        setVector3(ball->mutable_pos(), state.ball().p_x(), state.ball().p_y(), state.ball().p_z());
        setVector3(ball->mutable_vel(), state.ball().v_x(), state.ball().v_y(), state.ball().v_z());
        // TODO: ball visibility
    }

    for (const auto &robot : state.blue()) {
        setRobot(frame->add_robots(), robot, true);
    }
    for (const auto &robot : state.yellow()) {
        setRobot(frame->add_robots(), robot, false);
    }

    // TODO: implement kicked ball capability
    frame->add_capabilities(gameController::CAPABILITY_DETECT_FLYING_BALLS);
}
