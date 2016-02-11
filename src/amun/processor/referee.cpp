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

#include "referee.h"
#include "protobuf/ssl_referee.h"

/*!
 * \class Referee
 * \ingroup processor
 * \brief Keeps track of current referee state and detects ball movement
 */

/*!
 * \brief Create a new Referee instance
 */
Referee::Referee(bool isInternalReferee) :
    m_isInternalReferee(isInternalReferee), m_counter(-1)
{
    // initialize with first half to simplify testing
    m_gameState.set_stage(SSL_Referee::NORMAL_FIRST_HALF);
    m_gameState.set_state(amun::GameState::Halt);
    teamInfoSetDefault(m_gameState.mutable_blue());
    teamInfoSetDefault(m_gameState.mutable_yellow());
    m_gameState.set_stage_time_left(0);
}

/*!
 * \brief Processes a referee command packet
 * \param data The packet to process
 */
void Referee::handlePacket(const QByteArray &data)
{
    SSL_Referee packet;
    if (!packet.ParseFromArray(data.data(), data.size()))
        return;

    // TODO: any use for the timestamps?
    m_gameState.mutable_blue()->CopyFrom(packet.blue());
    m_gameState.mutable_yellow()->CopyFrom(packet.yellow());

    m_gameState.set_stage_time_left(packet.stage_time_left());
    m_gameState.set_stage(packet.stage());
    if (packet.has_designated_position()) {
        m_gameState.mutable_designated_position()->CopyFrom(packet.designated_position());
    }

    if (m_isInternalReferee) {
        // the internal referee sends the counter delta since the last referee command
        // this is possible as referee packets are sent only once
        // a referee command can originate from the GUI referee or the strategy
        // using a delta simplifies interleaving the commands
        packet.set_command_counter(m_counter + packet.command_counter());
    }

    if (m_counter != packet.command_counter()) {
        m_counter = packet.command_counter();
        handleCommand(packet.command());
    }
}

/*!
 * \brief Update referee state
 * \param worldState Current world state, used to identify ball movement
 * \param gameState Output for newly calculated game state
 */
void Referee::process(const world::State &worldState)
{
    const float ballMovementDistance = 0.10f;

    switch (m_gameState.state()) {
    case amun::GameState::KickoffYellow:
    case amun::GameState::KickoffBlue:

    case amun::GameState::PenaltyYellow:
    case amun::GameState::PenaltyBlue:

    case amun::GameState::DirectYellow:
    case amun::GameState::DirectBlue:

    case amun::GameState::IndirectYellow:
    case amun::GameState::IndirectBlue:
        if (worldState.has_ball()) {
            const world::Ball& ball = worldState.ball();

            // save position when a freekick / kickoff / penalty is started
            // then wait until the ball has moved far enough.
            if (!m_ball.IsInitialized()) {
                m_ball.CopyFrom(ball);
            } else {
                const float x = m_ball.p_x() - ball.p_x();
                const float y = m_ball.p_y() - ball.p_y();

                if (x * x + y * y > ballMovementDistance * ballMovementDistance) {
                    m_gameState.set_state(amun::GameState::Game);
                }
            }
        }
        break;

    default:
        // invalidate ball if we're not waiting for it to move
        if (m_ball.IsInitialized()) {
            m_ball.Clear();
        }
        break;
    }
}

/*!
 * \brief Handle a referee command
 * \param command Command to process
 */
void Referee::handleCommand(SSL_Referee::Command command)
{
    switch (command) {
    case SSL_Referee::HALT:
        m_gameState.set_state(amun::GameState::Halt);
        break;

    case SSL_Referee::STOP:
        m_gameState.set_state(amun::GameState::Stop);
        break;

    case SSL_Referee::NORMAL_START:
        switch (m_gameState.state()) {
        case amun::GameState::KickoffYellowPrepare:
            m_gameState.set_state(amun::GameState::KickoffYellow);
            break;

        case amun::GameState::KickoffBluePrepare:
            m_gameState.set_state(amun::GameState::KickoffBlue);
            break;

        case amun::GameState::PenaltyYellowPrepare:
            m_gameState.set_state(amun::GameState::PenaltyYellow);
            break;

        case amun::GameState::PenaltyBluePrepare:
            m_gameState.set_state(amun::GameState::PenaltyBlue);
            break;

        default:
            // silently ignore start command
            break;
        }
        break;

    case SSL_Referee::FORCE_START:
        m_gameState.set_state(amun::GameState::GameForce);
        break;

    case SSL_Referee::PREPARE_KICKOFF_YELLOW:
        m_gameState.set_state(amun::GameState::KickoffYellowPrepare);
        break;

    case SSL_Referee::PREPARE_KICKOFF_BLUE:
        m_gameState.set_state(amun::GameState::KickoffBluePrepare);
        break;

    case SSL_Referee::BALL_PLACEMENT_YELLOW:
        m_gameState.set_state(amun::GameState::BallPlacementYellow);
        break;

    case SSL_Referee::BALL_PLACEMENT_BLUE:
        m_gameState.set_state(amun::GameState::BallPlacementBlue);
        break;

    case SSL_Referee::PREPARE_PENALTY_YELLOW:
        m_gameState.set_state(amun::GameState::PenaltyYellowPrepare);
        break;

    case SSL_Referee::PREPARE_PENALTY_BLUE:
        m_gameState.set_state(amun::GameState::PenaltyBluePrepare);
        break;

    case SSL_Referee::DIRECT_FREE_YELLOW:
        m_gameState.set_state(amun::GameState::DirectYellow);
        break;

    case SSL_Referee::DIRECT_FREE_BLUE:
        m_gameState.set_state(amun::GameState::DirectBlue);
        break;

    case SSL_Referee::INDIRECT_FREE_YELLOW:
        m_gameState.set_state(amun::GameState::IndirectYellow);
        break;

    case SSL_Referee::INDIRECT_FREE_BLUE:
        m_gameState.set_state(amun::GameState::IndirectBlue);
        break;

    case SSL_Referee::TIMEOUT_YELLOW:
        m_gameState.set_state(amun::GameState::TimeoutYellow);
        break;

    case SSL_Referee::TIMEOUT_BLUE:
        m_gameState.set_state(amun::GameState::TimeoutBlue);
        break;

    case SSL_Referee::GOAL_YELLOW:
    case SSL_Referee::GOAL_BLUE:
        m_gameState.set_state(amun::GameState::Stop);
        break;
    }
}
