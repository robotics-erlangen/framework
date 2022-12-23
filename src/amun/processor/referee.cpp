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
Referee::Referee() :
    m_counter(-1),
    m_flipped(false)
{
    // initialize with first half to simplify testing
    m_gameState.set_stage(SSL_Referee::NORMAL_FIRST_HALF);
    m_gameState.set_state(amun::GameState::Halt);
    teamInfoSetDefault(m_gameState.mutable_blue());
    teamInfoSetDefault(m_gameState.mutable_yellow());
    m_gameState.set_stage_time_left(0);
    m_gameState.set_goals_flipped(false);
}

/*!
 * \brief Processes a referee command packet
 * \param data The packet to process
 */
void Referee::handlePacket(const QByteArray &data, const QString &sender)
{
    SSL_Referee packet;
    if (!packet.ParseFromArray(data.data(), data.size())) {
        return;
    }

    if (!packet.has_source_identifier() || packet.source_identifier() != m_sourceIdentifier) {
        if (packet.has_source_identifier()) {
            m_sourceIdentifier = packet.source_identifier();
        } else {
            m_sourceIdentifier.clear();
        }

        /* The sender field is not always relevant, e.g. it is not when
         * - the Referee is called by the VisionAnalyzer; there is no strategy
         *   connecting to the game controller
         * - The internal referee is used.
         * Also, the source_identifier may not be set in such cases.
         *
         * The refereeHostChanged signal is probably/hopefully not connected in
         * such cases. In case it is, we require the sender to be set in order
         * to provide a useful debugging output if something breaks here.
         */
        Q_ASSERT(!sender.isNull() && !sender.isEmpty());

        emit refereeHostChanged(sender);
    }

    // TODO: any use for the timestamps?
    m_gameState.mutable_blue()->CopyFrom(packet.blue());
    m_gameState.mutable_yellow()->CopyFrom(packet.yellow());

    m_gameState.set_stage_time_left(packet.stage_time_left());
    m_gameState.set_stage(packet.stage());
    if (packet.has_blueteamonpositivehalf()) {
        setFlipped(!packet.blueteamonpositivehalf());
    }
    if (packet.has_designated_position()) {
        m_gameState.mutable_designated_position()->CopyFrom(packet.designated_position());
        if (m_flipped) {
            m_gameState.mutable_designated_position()->set_x(-m_gameState.designated_position().x());
            m_gameState.mutable_designated_position()->set_y(-m_gameState.designated_position().y());
        }
    }
    if (packet.has_gameevent()) {
        m_gameState.mutable_game_event()->CopyFrom(packet.gameevent());
    }
    if (packet.game_events_size() > 0) {
        m_gameState.clear_game_event_2019();
        for (const auto &event : packet.game_events()) {
            m_gameState.add_game_event_2019()->CopyFrom(event);
        }
    }

    if (packet.has_current_action_time_remaining()) {
        m_gameState.set_current_action_time_remaining(packet.current_action_time_remaining());
    }

    if (m_counter != packet.command_counter()) {
        m_counter = packet.command_counter();
        m_gameState.set_state(processCommand(packet.command(), gameState().state()));
        m_lastCommand = packet.command();
    } else if (packet.has_command() && (!m_lastCommand || m_lastCommand != packet.command())) {
        m_gameState.set_state(processCommand(packet.command(), gameState().state()));
        m_lastCommand = packet.command();
    }

    if (packet.has_next_command()) {
        m_gameState.set_next_state(processCommand(packet.next_command(), gameState().state()));
    } else {
        m_gameState.clear_next_state();
    }
}

void Referee::setFlipped(bool flipped)
{
    m_flipped = flipped;
    m_gameState.set_goals_flipped(m_flipped);
}

/*!
 * \brief Update referee state
 * \param worldState Current world state, used to identify ball movement
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
                    if (m_gameState.state() == amun::GameState::PenaltyBlue) {
                        m_gameState.set_state(amun::GameState::PenaltyBlueRunning);
                    } else if (m_gameState.state() == amun::GameState::PenaltyYellow) {
                        m_gameState.set_state(amun::GameState::PenaltyYellowRunning);
                    } else {
                        m_gameState.set_state(amun::GameState::Game);
                    }
                }
            }
        }
        if (m_gameState.has_current_action_time_remaining() && m_gameState.current_action_time_remaining() < 0) {
            m_gameState.set_state(amun::GameState::Game);
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

amun::GameState::State Referee::processCommand(SSL_Referee::Command command, amun::GameState::State currentState)
{
    switch (command) {
    case SSL_Referee::HALT:
        return amun::GameState::Halt;

    case SSL_Referee::STOP:
        return amun::GameState::Stop;

    case SSL_Referee::NORMAL_START:
        switch (currentState) {
        case amun::GameState::KickoffYellowPrepare:
            return amun::GameState::KickoffYellow;

        case amun::GameState::KickoffBluePrepare:
            return amun::GameState::KickoffBlue;

        case amun::GameState::PenaltyYellowPrepare:
            return amun::GameState::PenaltyYellow;

        case amun::GameState::PenaltyBluePrepare:
            return amun::GameState::PenaltyBlue;

        // while this is not consistent with the rules, the game controller uses it this way
        case amun::GameState::Stop:
            return amun::GameState::Game;

        default:
            // silently ignore start command
            return currentState;
        }

    case SSL_Referee::FORCE_START:
        return amun::GameState::GameForce;

    case SSL_Referee::PREPARE_KICKOFF_YELLOW:
        return amun::GameState::KickoffYellowPrepare;

    case SSL_Referee::PREPARE_KICKOFF_BLUE:
        return amun::GameState::KickoffBluePrepare;

    case SSL_Referee::BALL_PLACEMENT_YELLOW:
        return amun::GameState::BallPlacementYellow;

    case SSL_Referee::BALL_PLACEMENT_BLUE:
        return amun::GameState::BallPlacementBlue;

    case SSL_Referee::PREPARE_PENALTY_YELLOW:
        return amun::GameState::PenaltyYellowPrepare;

    case SSL_Referee::PREPARE_PENALTY_BLUE:
        return amun::GameState::PenaltyBluePrepare;

    case SSL_Referee::DIRECT_FREE_YELLOW:
        return amun::GameState::DirectYellow;

    case SSL_Referee::DIRECT_FREE_BLUE:
        return amun::GameState::DirectBlue;

    case SSL_Referee::INDIRECT_FREE_YELLOW:
        return amun::GameState::IndirectYellow;

    case SSL_Referee::INDIRECT_FREE_BLUE:
        return amun::GameState::IndirectBlue;

    case SSL_Referee::TIMEOUT_YELLOW:
        return amun::GameState::TimeoutYellow;

    case SSL_Referee::TIMEOUT_BLUE:
        return amun::GameState::TimeoutBlue;

    case SSL_Referee::GOAL_YELLOW:
    case SSL_Referee::GOAL_BLUE:
        return amun::GameState::Stop;
    }
    return currentState;
}

bool Referee::isGameRunning()
{
    return m_gameState.state() != amun::GameState::Halt
            && m_gameState.state() != amun::GameState::TimeoutBlue
            && m_gameState.state() != amun::GameState::TimeoutYellow;
}
