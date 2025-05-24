/***************************************************************************
 *   Copyright 2025 Andreas Wendler, Paul Bergmann                         *
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

#include "humaninterventionsimulator.h"

#include "core/coordinates.h"
#include "core/timer.h"
#include "core/vector.h"
#include "protobuf/ssl_referee.h"
#include "protobuf/status.h"

HumanInterventionSimulator::HumanInterventionSimulator(const Timer *timer, QObject *parent) :
    QObject(parent),
    m_timer(timer)
{
}

bool HumanInterventionSimulator::handleBallTeleportation(const SSL_Referee &referee)
{
    // checks for halt after both teams failed placement, teleports the ball correctly and continues the game
    bool hasFailedBlue = false, hasFailedYellow = false;
    bool hasGoal = false;
    for (const auto &event : referee.game_events()) {
        if (event.type() == gameController::GameEvent::PLACEMENT_FAILED) {
            if (event.placement_failed().by_team() == gameController::Team::BLUE) {
                hasFailedBlue = true;
            } else {
                hasFailedYellow = true;
            }
        } else if (event.type() == gameController::GameEvent::GOAL || event.type() == gameController::GameEvent::INVALID_GOAL) {
            hasGoal = true;
        }
    }

    if (referee.command() != SSL_Referee::HALT) {
        m_ballIsTeleported = false;
    }

    const auto bothTeamsFailed = hasFailedBlue && hasFailedYellow;
    const auto isHaltOrStop = referee.command() == SSL_Referee::HALT || referee.command() == SSL_Referee::STOP;
    if (isHaltOrStop
            && (bothTeamsFailed || hasGoal)
            && referee.has_designated_position()
            && referee.has_next_command()
            && !m_ballIsTeleported) {

        m_ballIsTeleported = true;

        Command ballCommand(new amun::Command);
        auto* teleport = ballCommand->mutable_simulator()->mutable_ssl_control()->mutable_teleport_ball();
        teleport->set_teleport_safely(true);
        teleport->set_x(referee.designated_position().x());
        teleport->set_y(referee.designated_position().y());
        teleport->set_vx(0);
        teleport->set_vy(0);
        teleport->set_vz(0);
        emit sendCommand(ballCommand);

        return true;
    }

    return false;
}

void HumanInterventionSimulator::handleNumberOfRobots(const world::State &worldState)
{
    const Vector substitutionPos1(m_fieldWidth / 2, 0);
    const Vector substitutionPos2(-m_fieldWidth / 2, 0);

    if (!worldState.has_ball()) {
        return;
    }
    const Vector ballPos(worldState.ball().p_x(), worldState.ball().p_y());

    if (worldState.time() - m_lastExchangeTime < 1e9) { // 1 second
        return;
    }

    for (bool teamIsBlue : {false, true}) {

        const auto &teamRobots = teamIsBlue ? worldState.blue() : worldState.yellow();
        const int allowedRobots = teamIsBlue ? m_allowedRobotsBlue : m_allowedRobotsYellow;
        const auto team = teamIsBlue ? gameController::Team::BLUE : gameController::Team::YELLOW;
        const auto &teamIds = teamIsBlue ? m_blueTeamIds : m_yellowTeamIds;
        const auto teamString = teamIsBlue ? "blue" : "yellow";

        const int numRobots = teamRobots.size();
        if (numRobots > allowedRobots) {
            for (const auto &robot : teamRobots) {
                const Vector pos(robot.p_x(), robot.p_y());
                const Vector speed(robot.v_x(), robot.v_y());

                if (speed.length() < 0.1 && ((pos.distance(substitutionPos1) < 1 && ballPos.distance(substitutionPos1) > 3)
                        || (pos.distance(substitutionPos2) < 1 && ballPos.distance(substitutionPos2) > 3))) {

                    m_lastExchangeTime = worldState.time();

                    Command command(new amun::Command);
                    auto teleport = command->mutable_simulator()->mutable_ssl_control()->add_teleport_robot();
                    teleport->mutable_id()->set_id(robot.id());
                    teleport->mutable_id()->set_team(team);
                    teleport->set_present(false);
                    emit sendCommand(command);

                    Status status(new amun::Status);
                    auto debug = status->add_debug();
                    debug->set_source(amun::DebugSource::GameController);
                    auto log = debug->add_log();
                    log->set_timestamp(m_timer->currentTime());
                    log->set_text(QString("Removed %1 %2 to fix the robot count").arg(teamString).arg(robot.id()).toStdString());
                    emit sendStatus(status);
                    break;
                }
            }
        } else if (numRobots < allowedRobots) {

            // check for a free position to add the robot
            Vector addPos;
            if (isPositionFreeToEnterRobot(substitutionPos1, worldState)) {
                addPos = substitutionPos1;
            } else if (isPositionFreeToEnterRobot(substitutionPos2, worldState)) {
                addPos = substitutionPos2;
            } else {
                return;
            }

            // find a robot that is enabled in the ui but currently removed in the simulator
            for (const auto possibleId : teamIds) {
                bool isPresent = std::any_of(teamRobots.begin(), teamRobots.end(), [possibleId](const auto &robot) {
                    return robot.id() == possibleId;
                });
                if (isPresent) {
                    continue;
                }

                m_lastExchangeTime = worldState.time();

                Command command(new amun::Command);
                auto teleport = command->mutable_simulator()->mutable_ssl_control()->add_teleport_robot();
                teleport->mutable_id()->set_id(possibleId);
                teleport->mutable_id()->set_team(team);
                coordinates::toVision(addPos, *teleport);
                teleport->set_orientation(0);
                teleport->set_v_x(0);
                teleport->set_v_y(0);
                teleport->set_v_angular(0);
                teleport->set_present(true);
                emit sendCommand(command);

                Status status(new amun::Status);
                auto debug = status->add_debug();
                debug->set_source(amun::DebugSource::GameController);
                auto log = debug->add_log();
                log->set_timestamp(m_timer->currentTime());
                log->set_text(QString("Added %1 %2 since yellow card is over").arg(teamString).arg(possibleId).toStdString());
                emit sendStatus(status);
                break;
            }
        }
    }
}

void HumanInterventionSimulator::handleStatus(const Status &status)
{
    if (status->has_geometry()) {
        m_fieldWidth = status->geometry().field_width();
    }

    if (status->has_game_state()) {
        if (status->game_state().has_blue() && status->game_state().blue().has_max_allowed_bots()) {
            m_allowedRobotsBlue = status->game_state().blue().max_allowed_bots();
        }
        if (status->game_state().has_yellow() && status->game_state().yellow().has_max_allowed_bots()) {
            m_allowedRobotsYellow = status->game_state().yellow().max_allowed_bots();
        }
    }

    if (status->has_team_blue()) {
        m_blueTeamIds.clear();
        for (const auto &spec : status->team_blue().robot()) {
            m_blueTeamIds.append(spec.id());
        }
    }
    if (status->has_team_yellow()) {
        m_yellowTeamIds.clear();
        for (const auto &spec : status->team_yellow().robot()) {
            m_yellowTeamIds.append(spec.id());
        }
    }
}

bool HumanInterventionSimulator::isPositionFreeToEnterRobot(Vector pos, const world::State &worldState)
{
    const Vector ballPos(worldState.ball().p_x(), worldState.ball().p_y());
    if (pos.distance(ballPos) < 3) {
        return false;
    }
    for (const auto &robot : worldState.blue()) {
        const Vector robotPos(robot.p_x(), robot.p_y());
        if (robotPos.distance(pos) < 1) {
            return false;
        }
    }
    for (const auto &robot : worldState.yellow()) {
        const Vector robotPos(robot.p_x(), robot.p_y());
        if (robotPos.distance(pos) < 1) {
            return false;
        }
    }
    return true;
}
