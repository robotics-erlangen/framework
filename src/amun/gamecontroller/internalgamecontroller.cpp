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

#include "internalgamecontroller.h"

#include "sslvisiontracked.h"
#include "protobuf/geometry.h"
#include "core/timer.h"
#include "core/vector.h"
#include "core/coordinates.h"
#include "core/protobufhelper.h"
#include "config/config.h"

#include <QDebug>

static const QString SENDER_NAME_FOR_REFEREE = "Internal/SSL Game Controller";

InternalGameController::InternalGameController(const Timer *timer, QObject *parent) :
    QObject(parent),
    m_timer(timer),
    m_gcCIProcess(timer, this),
    m_humanInterventionSimulator(timer, this)
{
    connect(&m_gcCIProcess, &GameControllerCI::sendStatus, this, &InternalGameController::sendStatus);
    connect(&m_gcCIProcess, &GameControllerCI::internalGCPortsUpdated, this, &InternalGameController::internalGCPortsUpdated);

    connect(&m_humanInterventionSimulator, &HumanInterventionSimulator::sendStatus, this, &InternalGameController::sendStatus);
    connect(&m_humanInterventionSimulator, &HumanInterventionSimulator::sendCommand, this, &InternalGameController::sendCommand);
}

InternalGameController::~InternalGameController()
{
    stop();
}

void InternalGameController::stop()
{
    m_gcCIProcess.stop();
}

void InternalGameController::handleStatus(const Status &status)
{
    if (!m_trackedVisionGenerator || !m_isEnabled) {
        return;
    }

    if (status->has_geometry()) {
        const std::string str = status->geometry().SerializeAsString();
        if (str != m_geometryString) {
            gameController::CiInput input;
            input.set_timestamp(status->world_state().time());
            convertToSSlGeometry(status->geometry(), input.mutable_geometry()->mutable_field());
            if (sendCiInput(input)) {
                m_geometryString = str;
            }
        }

        if (status->geometry().has_division() && status->geometry().division() != m_currentDivision) {
            gameController::CiInput ciInput;
            ciInput.set_timestamp(m_timer->currentTime());
            auto div = status->geometry().division() == world::Geometry::A ? gameController::Division::DIV_A : gameController::Division::DIV_B;
            ciInput.add_api_inputs()->mutable_change()->mutable_update_config_change()->set_division(div);
            if (sendCiInput(ciInput)) {
                m_currentDivision = status->geometry().division();
            }
        }
    }

    m_humanInterventionSimulator.handleStatus(status);

    if (status->has_world_state()) {
        gameController::CiInput ciInput;
        ciInput.set_timestamp(status->world_state().time());
        m_trackedVisionGenerator->createTrackedFrame(status->world_state(), ciInput.mutable_tracker_packet());

        sendCiInput(ciInput);

        // the delayed sending of the freekick command from handleBallTeleportation()
        if (m_continueFrameCounter > 0) {
            m_continueFrameCounter--;

            if (m_continueFrameCounter == 0) {
                gameController::CiInput ciInput;
                ciInput.set_timestamp(m_timer->currentTime());
                gameController::Change *change = ciInput.add_api_inputs()->mutable_change();
                change->mutable_new_command_change()->mutable_command()->CopyFrom(mapCommand(m_nextCommand));
                sendCiInput(ciInput);
            }
        }

        if (m_enableRobotExchange) {
            m_humanInterventionSimulator.handleNumberOfRobots(status->world_state());
        }
    }
}

bool InternalGameController::sendCiInput(const gameController::CiInput &input)
{
    const bool wentThrough = m_gcCIProcess.send(input);

    const auto ciOutputs = m_gcCIProcess.clearQueuedOutputs();

    for (const auto& ciOutput : ciOutputs) {
        if (!ciOutput.has_referee_msg()) {
            continue;
        }

        const SSL_Referee &referee = ciOutput.referee_msg();

        QByteArray packetData = protobufhelper::bufferWithSpaceFor(referee);
        if (referee.SerializeToArray(packetData.data(), packetData.size())) {
            emit gotPacketForReferee(packetData, SENDER_NAME_FOR_REFEREE);

            if (m_humanInterventionSimulator.handleBallTeleportation(referee)) {
                // delay sending out the direct freekick command since the changed ball position will not yet have
                // arrived at the (internal) referee, so the position change from the teleportation would cause
                // the referee to consider the freekick done and switch to game
                // It is sent out in handleStatus m_continueFrameCounter frames later
                m_continueFrameCounter = 50;
                m_nextCommand = referee.next_command();
            }
        }
    }

    return wentThrough;
}

static gameController::Command makeCommand(gameController::Command::Type type, bool teamIsBlue, bool commandIsNeutral) {
    gameController::Command command;
    command.set_type(type);
    if (commandIsNeutral) {
        command.set_for_team(gameController::Team::UNKNOWN);
    } else {
        command.set_for_team(teamIsBlue ? gameController::Team::BLUE : gameController::Team::YELLOW);
    }

    return command;
}

gameController::Command InternalGameController::mapCommand(SSL_Referee::Command command)
{
    const std::map<SSL_Referee::Command, gameController::Command> commandMap = {
        {SSL_Referee::HALT, makeCommand(gameController::Command::HALT, false, true)},
        {SSL_Referee::STOP, makeCommand(gameController::Command::STOP, false, true)},
        {SSL_Referee::NORMAL_START, makeCommand(gameController::Command::NORMAL_START, false, true)},
        {SSL_Referee::FORCE_START, makeCommand(gameController::Command::FORCE_START, false, true)},
        {SSL_Referee::PREPARE_KICKOFF_YELLOW, makeCommand(gameController::Command::KICKOFF, false, false)},
        {SSL_Referee::PREPARE_KICKOFF_BLUE, makeCommand(gameController::Command::KICKOFF, true, false)},
        {SSL_Referee::PREPARE_PENALTY_YELLOW, makeCommand(gameController::Command::PENALTY, false, false)},
        {SSL_Referee::PREPARE_PENALTY_BLUE, makeCommand(gameController::Command::PENALTY, true, false)},
        {SSL_Referee::DIRECT_FREE_YELLOW, makeCommand(gameController::Command::DIRECT, false, false)},
        {SSL_Referee::DIRECT_FREE_BLUE, makeCommand(gameController::Command::DIRECT, true, false)},
        {SSL_Referee::TIMEOUT_YELLOW, makeCommand(gameController::Command::TIMEOUT, false, false)},
        {SSL_Referee::TIMEOUT_BLUE, makeCommand(gameController::Command::TIMEOUT, true, false)},
        {SSL_Referee::BALL_PLACEMENT_YELLOW, makeCommand(gameController::Command::BALL_PLACEMENT, false, false)},
        {SSL_Referee::BALL_PLACEMENT_BLUE, makeCommand(gameController::Command::BALL_PLACEMENT, true, false)},
    };

    auto it = commandMap.find(command);

    if (it == commandMap.end()) {
        qDebug() <<"Error in ssl game controller wrapper: could not map command "<<command;
        return makeCommand(gameController::Command::HALT, false, true);
    }
    return it->second;
}

void InternalGameController::handleRefereeUpdate(const SSL_Referee &newState, bool delayedSending)
{
    gameController::CiInput ciInput;
    ciInput.set_timestamp(m_timer->currentTime());

    // the ui part of the internal referee will only change command, stage, goalie or cards

    // the stage change must be before the command change, as the GC issues commands on stage change
    if (!m_lastReferee.IsInitialized() || newState.stage() != m_lastReferee.stage()) {
        gameController::Change *change = ciInput.add_api_inputs()->mutable_change();
        change->mutable_change_stage_change()->set_new_stage(newState.stage());
    }

    if (!m_lastReferee.IsInitialized() || newState.command() != m_lastReferee.command() ||
            newState.command_counter() != m_lastReferee.command_counter()) {

        // must be before the referee state change, otherwise the GC might send out the referee state without the placement pos
        if (newState.command() == SSL_Referee::BALL_PLACEMENT_BLUE || newState.command() == SSL_Referee::BALL_PLACEMENT_YELLOW) {
            gameController::Change *placementChange = ciInput.add_api_inputs()->mutable_change();
            placementChange->mutable_set_ball_placement_pos_change()->mutable_pos()->set_x(newState.designated_position().x() / 1000.0f);
            placementChange->mutable_set_ball_placement_pos_change()->mutable_pos()->set_y(newState.designated_position().y() / 1000.0f);
        }

        gameController::Change *change = ciInput.add_api_inputs()->mutable_change();

        auto mapped = mapCommand(newState.command());
        change->mutable_new_command_change()->mutable_command()->CopyFrom(mapped);
    }

    if (!m_lastReferee.IsInitialized() || newState.blue().goalie() != m_lastReferee.blue().goalie()) {
        gameController::Change *change = ciInput.add_api_inputs()->mutable_change();
        auto updateTeam = change->mutable_update_team_state_change();
        updateTeam->set_for_team(gameController::Team::BLUE);
        updateTeam->mutable_goalkeeper()->set_value(newState.blue().goalie());
    }
    if (!m_lastReferee.IsInitialized() || newState.yellow().goalie() != m_lastReferee.yellow().goalie()) {
        gameController::Change *change = ciInput.add_api_inputs()->mutable_change();
        auto updateTeam = change->mutable_update_team_state_change();
        updateTeam->set_for_team(gameController::Team::YELLOW);
        updateTeam->mutable_goalkeeper()->set_value(newState.yellow().goalie());
    }

    if (!m_lastReferee.IsInitialized() || newState.blueteamonpositivehalf() != m_lastReferee.blueteamonpositivehalf()) {
        gameController::Change *change = ciInput.add_api_inputs()->mutable_change();
        auto updateTeam = change->mutable_update_team_state_change();
        updateTeam->set_for_team(gameController::Team::BLUE);
        updateTeam->mutable_on_positive_half()->set_value(newState.blueteamonpositivehalf());
    }

    if (m_lastReferee.has_blue() && newState.blue().yellow_cards() > m_lastReferee.blue().yellow_cards()) {
        gameController::Change *change = ciInput.add_api_inputs()->mutable_change();
        change->mutable_add_yellow_card_change()->set_for_team(gameController::Team::BLUE);
    }
    if (m_lastReferee.has_yellow() && newState.yellow().yellow_cards() > m_lastReferee.yellow().yellow_cards()) {
        gameController::Change *change = ciInput.add_api_inputs()->mutable_change();
        change->mutable_add_yellow_card_change()->set_for_team(gameController::Team::YELLOW);
    }

    m_lastReferee = newState;

    if (ciInput.api_inputs_size() > 0) {
        if (delayedSending) {
            m_gcCIProcess.enqueueInput(ciInput);
        } else {
            if (!sendCiInput(ciInput) && m_gcCIProcess.hasQueuedInputs()) {
                m_gcCIProcess.enqueueInput(ciInput);
            }
        }
    }
}

void InternalGameController::handleGuiCommand(const QByteArray &data)
{
    SSL_Referee newState;
    newState.ParseFromArray(data.data(), data.size());

    // if the GC is not currently activated, directly rout the commands from the UI to the internal referee
    if (!m_isEnabled) {
        emit gotPacketForReferee(data, SENDER_NAME_FOR_REFEREE);
        m_lastReferee = newState;
        return;
    }

    handleRefereeUpdate(newState, false);
}

void InternalGameController::handleCommand(const amun::CommandReferee &refereeCommand)
{
    if (refereeCommand.has_command()) {
        const std::string &c = refereeCommand.command();
        handleGuiCommand(QByteArray(c.data(), c.size()));
    }
    if (refereeCommand.has_use_automatic_robot_exchange()) {
        m_enableRobotExchange = refereeCommand.use_automatic_robot_exchange();
    }
}

void InternalGameController::setFlip(bool flip)
{
    if (m_trackedVisionGenerator) {
        m_trackedVisionGenerator->setFlip(flip);
    }
}

void InternalGameController::setEnabled(bool enabled)
{
    if (enabled == m_isEnabled) {
        return;
    }
    m_isEnabled = enabled;

    if (enabled) {
        start();
    } else {
        stop();
    }
}

void InternalGameController::start()
{
    if (!m_trackedVisionGenerator) {
        m_trackedVisionGenerator.reset(new SSLVisionTracked());
    }

    // queue all packets to set the GC to the current game state
    {
        // configure the game controller
        {
            gameController::CiInput ciInput;
            ciInput.set_timestamp(m_timer->currentTime());
            ciInput.add_api_inputs()->set_reset_match(true);

            ciInput.add_api_inputs()->mutable_change()->mutable_update_config_change()->set_division(gameController::Division::DIV_A);
            // automatically continue events without needing human input
            ciInput.add_api_inputs()->mutable_config_delta()->set_auto_continue(true);

            m_gcCIProcess.enqueueInput(ciInput);
        }

        auto prevReferee = m_lastReferee;
        m_lastReferee.Clear();
        handleRefereeUpdate(prevReferee, true);

        // trigger a re-send of the geometry
        m_geometryString.clear();
    }

    m_gcCIProcess.start();
}
