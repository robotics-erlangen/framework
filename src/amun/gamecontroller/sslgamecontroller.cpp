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

#include "sslgamecontroller.h"
#include "sslvisiontracked.h"
#include "protobuf/geometry.h"
#include "core/timer.h"
#include "config/config.h"

#include <QDebug>
#include <QRegularExpression>
#include <QFile>
#include <QTcpServer>

SSLGameController::SSLGameController(const Timer *timer, QObject *parent) :
    QObject(parent),
    m_timer(timer),
    m_gcCIProtocolConnection(GC_CI_PORT_START, this)
{
    m_gcCIProtocolConnection.setRefereeHost("127.0.0.1");
}

SSLGameController::~SSLGameController()
{
    stop();
}

void SSLGameController::stop()
{
    if (m_gcProcess) {
        m_deliberatlyStopped = true;
        m_gcCIProtocolConnection.closeConnection();
        m_gcProcess->close();
        m_gcProcess = nullptr;
    }
}

void SSLGameController::handleGCStdout()
{
    const bool LOG_MESSAGES = false;

    if (LOG_MESSAGES) {
        Status status(new amun::Status);
        auto debug = status->add_debug();
        debug->set_source(amun::DebugSource::GameController);
        while (m_gcProcess->canReadLine()) {
            QByteArray line = m_gcProcess->readLine();
            // Remove log dates of the form 2021/01/10 10:00:10
            QString simplified = QString(line).replace(QRegularExpression("[0-9]+/[0-9]+/[0-9]+ [0-9]+:[0-9]+:[0-9]+ "), "");
            auto log = debug->add_log();
            log->set_timestamp(m_timer->currentTime());
            log->set_text(simplified.toStdString());
        }
        emit sendStatus(status);
    }
}

void SSLGameController::handleStatus(const Status &status)
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
            ciInput.add_api_inputs()->mutable_change()->mutable_update_config()->set_division(div);
            if (sendCiInput(ciInput)) {
                m_currentDivision = status->geometry().division();
            }
        }
    }

    if (status->has_world_state()) {
        gameController::CiInput ciInput;
        ciInput.set_timestamp(status->world_state().time());
        m_trackedVisionGenerator->createTrackedFrame(status->world_state(), ciInput.mutable_tracker_packet());

        sendCiInput(ciInput);

        // the delayed sending of the freekick command from handlePlacementFailure()
        if (m_continueFrameCounter > 0) {
            m_continueFrameCounter--;

            if (m_continueFrameCounter == 0) {
                gameController::CiInput ciInput;
                ciInput.set_timestamp(m_timer->currentTime());
                gameController::Change *change = ciInput.add_api_inputs()->mutable_change();
                change->mutable_new_command()->mutable_command()->CopyFrom(mapCommand(m_nextCommand));
                sendCiInput(ciInput);
            }
        }
    }
}

bool SSLGameController::sendCiInput(const gameController::CiInput &input)
{
    if (m_queuedInputs.size() > 0 && m_gcCIProtocolConnection.connectGameController()) {
        QVector<gameController::CiInput> inputs = m_queuedInputs;
        m_queuedInputs.clear();
        for (const auto &i : inputs) {
            sendCiInput(i);
        }
    }
    if (m_gcCIProtocolConnection.sendGameControllerMessage(&input)) {
        // the game controller may send multiple messages
        while(true) {
            gameController::CiOutput ciOutput;
            if (!m_gcCIProtocolConnection.receiveGameControllerMessage(&ciOutput)) {
                m_nonResponseCounter++;
                if (m_nonResponseCounter > 50) {
                    updateCurrentStatus(amun::StatusGameController::NOT_RESPONDING);
                }
                return true;
            }

            if (!ciOutput.has_referee_msg()) {
                continue;
            }

            m_nonResponseCounter = 0;
            if (m_currentState != amun::StatusGameController::RUNNING) {
                updateCurrentStatus(amun::StatusGameController::RUNNING);
            }

            const SSL_Referee &referee = ciOutput.referee_msg();

            QByteArray packetData;
            packetData.resize(referee.ByteSize());
            if (referee.SerializeToArray(packetData.data(), packetData.size())) {
                emit gotPacketForReferee(packetData);
                handleBallTeleportation(referee);
            }
        }
        return true;
    } else {
        m_nonResponseCounter++;
        if (m_nonResponseCounter > 50) {
            updateCurrentStatus(amun::StatusGameController::NOT_RESPONDING);
        }
    }
    return false;
}

void SSLGameController::handleBallTeleportation(const SSL_Referee &referee)
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
        } else if (event.type() == gameController::GameEvent::GOAL) {
            hasGoal = true;
        }
    }
    if (referee.command() != SSL_Referee::HALT) {
        m_ballIsTeleported = false;
    }
    if (referee.command() == SSL_Referee::HALT &&
            ((hasFailedBlue && hasFailedYellow) || hasGoal) &&
            referee.has_designated_position() &&
            referee.has_next_command() &&
            !m_ballIsTeleported) {

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

        // delay sending out the direct freekick command since the changed ball position will not yet have
        // arrived at the (internal) referee, so the position change from the teleportation would cause
        // the referee to consider the freekick done and switch to game
        // It is sent out in handleStatus m_continueFrameCounter frames later
        m_continueFrameCounter = 50;
        m_nextCommand = referee.next_command();
    }
}

void SSLGameController::handleGameEvent(std::shared_ptr<gameController::AutoRefToController> message)
{
    if (!message->has_game_event()) {
        return;
    }

    gameController::CiInput ciInput;
    ciInput.set_timestamp(m_timer->currentTime());
    ciInput.add_api_inputs()->mutable_change()->mutable_add_game_event()->mutable_game_event()->CopyFrom(message->game_event());
    sendCiInput(ciInput);
}

static gameController::Command makeCommand(gameController::Command::Type type, bool teamIsBlue, bool commandIsNeutral) {
    gameController::Command command;
    command.set_type(type);
    if (!commandIsNeutral) {
        command.set_for_team(teamIsBlue ? gameController::Team::BLUE : gameController::Team::YELLOW);
    }
    return command;
}

gameController::Command SSLGameController::mapCommand(SSL_Referee::Command command)
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

void SSLGameController::handleRefereeUpdate(const SSL_Referee &newState, bool delayedSending)
{
    gameController::CiInput ciInput;
    ciInput.set_timestamp(m_timer->currentTime());

    // the ui part of the internal referee will only change command, stage, goalie or cards

    // the stage change must be before the command change, as the GC issues commands on stage change
    if (!m_lastReferee.IsInitialized() || newState.stage() != m_lastReferee.stage()) {
        gameController::Change *change = ciInput.add_api_inputs()->mutable_change();
        change->mutable_change_stage()->set_new_stage(newState.stage());
    }

    if (!m_lastReferee.IsInitialized() || newState.command() != m_lastReferee.command() ||
            newState.command_counter() != m_lastReferee.command_counter()) {

        // must be before the referee state change, otherwise the GC might send out the referee state without the placement pos
        if (newState.command() == SSL_Referee::BALL_PLACEMENT_BLUE || newState.command() == SSL_Referee::BALL_PLACEMENT_YELLOW) {
            gameController::Change *placementChange = ciInput.add_api_inputs()->mutable_change();
            placementChange->mutable_set_ball_placement_pos()->mutable_pos()->set_x(newState.designated_position().x() / 1000.0f);
            placementChange->mutable_set_ball_placement_pos()->mutable_pos()->set_y(newState.designated_position().y() / 1000.0f);
        }

        gameController::Change *change = ciInput.add_api_inputs()->mutable_change();

        auto mapped = mapCommand(newState.command());
        change->mutable_new_command()->mutable_command()->CopyFrom(mapped);
    }

    if (!m_lastReferee.IsInitialized() || newState.blue().goalie() != m_lastReferee.blue().goalie()) {
        gameController::Change *change = ciInput.add_api_inputs()->mutable_change();
        auto updateTeam = change->mutable_update_team_state();
        updateTeam->set_for_team(gameController::Team::BLUE);
        updateTeam->set_goalkeeper(newState.blue().goalie());
    }
    if (!m_lastReferee.IsInitialized() || newState.yellow().goalie() != m_lastReferee.yellow().goalie()) {
        gameController::Change *change = ciInput.add_api_inputs()->mutable_change();
        auto updateTeam = change->mutable_update_team_state();
        updateTeam->set_for_team(gameController::Team::YELLOW);
        updateTeam->set_goalkeeper(newState.yellow().goalie());
    }

    if (!m_lastReferee.IsInitialized() || newState.blueteamonpositivehalf() != m_lastReferee.blueteamonpositivehalf()) {
        gameController::Change *change = ciInput.add_api_inputs()->mutable_change();
        auto updateTeam = change->mutable_update_team_state();
        updateTeam->set_for_team(gameController::Team::BLUE);
        updateTeam->set_on_positive_half(newState.blueteamonpositivehalf());
    }

    if (m_lastReferee.has_blue() && newState.blue().yellow_cards() > m_lastReferee.blue().yellow_cards()) {
        gameController::Change *change = ciInput.add_api_inputs()->mutable_change();
        change->mutable_add_yellow_card()->set_for_team(gameController::Team::BLUE);
    }
    if (m_lastReferee.has_yellow() && newState.yellow().yellow_cards() > m_lastReferee.yellow().yellow_cards()) {
        gameController::Change *change = ciInput.add_api_inputs()->mutable_change();
        change->mutable_add_yellow_card()->set_for_team(gameController::Team::YELLOW);
    }

    m_lastReferee = newState;

    if (ciInput.api_inputs_size() > 0) {
        if (delayedSending) {
            m_queuedInputs.append(ciInput);
        } else {
            if (!sendCiInput(ciInput) && m_queuedInputs.size() > 0) {
                m_queuedInputs.append(ciInput);
            }
        }
    }
}

void SSLGameController::handleGuiCommand(const QByteArray &data)
{
    SSL_Referee newState;
    newState.ParseFromArray(data.data(), data.size());

    // if the GC is not currently activated, directly rout the commands from the UI to the internal referee
    if (!m_isEnabled) {
        emit gotPacketForReferee(data);
        m_lastReferee = newState;
        return;
    }

    handleRefereeUpdate(newState, false);
}

void SSLGameController::handleCommand(const amun::CommandReferee &refereeCommand)
{
    if (refereeCommand.has_command()) {
        const std::string &c = refereeCommand.command();
        handleGuiCommand(QByteArray(c.data(), c.size()));
    }
}

void SSLGameController::gcFinished(int, QProcess::ExitStatus)
{
    if (m_deliberatlyStopped) {
        updateCurrentStatus(amun::StatusGameController::STOPPED);
    } else {
        updateCurrentStatus(amun::StatusGameController::CRASHED);
    }
}

void SSLGameController::setEnabled(bool enabled)
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

int SSLGameController::findFreePort(int startingFrom)
{
    for (int i = 0;i<10;i++) {
        int port = startingFrom + i;
        QTcpServer server;
        bool success = server.listen(QHostAddress::LocalHost, port);
        server.close();
        if (success) {
            return port;
        }
    }
    // just give up
    return startingFrom;
}

void SSLGameController::updateCurrentStatus(amun::StatusGameController::GameControllerState state)
{
    m_currentState = state;

    Status status(new amun::Status);
    status->mutable_amun_state()->mutable_game_controller()->set_current_state(m_currentState);
    emit sendStatus(status);
}

void SSLGameController::start()
{
    m_nonResponseCounter = 0;
    m_deliberatlyStopped = false;
    updateCurrentStatus(amun::StatusGameController::STARTING);

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

            ciInput.add_api_inputs()->mutable_change()->mutable_update_config()->set_division(gameController::Division::DIV_A);
            // automatically continue events without needing human input
            ciInput.add_api_inputs()->mutable_change()->mutable_update_config()->set_auto_continue(true);
            m_queuedInputs.append(ciInput);
        }

        auto prevReferee = m_lastReferee;
        m_lastReferee.Clear();
        handleRefereeUpdate(prevReferee, true);

        // trigger a re-send of the geometry
        m_geometryString.clear();
    }

    // find a free port for the ci connection
    int port = findFreePort(GC_CI_PORT_START);
    m_gcCIProtocolConnection.setPort(port);

    QString gameControllerExecutable(GAMECONTROLLER_EXECUTABLE_LOCATION);

    // the downloaded game controller file is not executable at first (relevant for linux and mac only)
    QFile::setPermissions(gameControllerExecutable, QFileDevice::ExeUser);

    QStringList arguments;
    arguments << "-timeAcquisitionMode" << "ci" << "-ciAddress" << QString("localhost:%1").arg(port) << "-backendOnly" << "True";

    m_gcProcess = new QProcess(this);
    m_gcProcess->setReadChannel(QProcess::StandardOutput);
    m_gcProcess->setProcessChannelMode(QProcess::MergedChannels);

    // set the GC working directory so that all produced files (config/state store) end up there and not scattered
    m_gcProcess->setWorkingDirectory(QString("%1/gamecontroller").arg(ERFORCE_CONFDIR));

    connect(m_gcProcess, &QProcess::readyReadStandardOutput, this, &SSLGameController::handleGCStdout);
    connect(m_gcProcess, QOverload<int, QProcess::ExitStatus>::of(&QProcess::finished), this, &SSLGameController::gcFinished);

    m_gcProcess->start(gameControllerExecutable, arguments, QIODevice::ReadOnly);
}
