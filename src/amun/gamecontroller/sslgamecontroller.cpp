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
    start();
}

SSLGameController::~SSLGameController()
{
    if (m_gcProcess) {
        m_gcCIProtocolConnection.closeConnection();
        m_gcProcess->close();
        m_gcProcess = nullptr;
    }
}

void SSLGameController::handleGCStdout()
{
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

        if (simplified.contains("UI is available at")) {
            connectToGC();
        }
    }
    emit sendStatus(status);
}

void SSLGameController::connectToGC()
{
    m_gcCIProtocolConnection.connectGameController();
}

void SSLGameController::handleStatus(const Status &status)
{
    if (!m_trackedVisionGenerator) {
        return;
    }

    if (status->has_geometry()) {
        const std::string str = status->geometry().SerializeAsString();
        if (str != m_geometryString) {
            m_geometryString = str;

            gameController::CiInput input;
            input.set_timestamp(status->world_state().time());
            convertToSSlGeometry(status->geometry(), input.mutable_geometry()->mutable_field());
            sendCiInput(input);
        }
    }

    if (status->has_world_state()) {
        gameController::CiInput ciInput;
        ciInput.set_timestamp(status->world_state().time());
        m_trackedVisionGenerator->createTrackedFrame(status->world_state(), ciInput.mutable_tracker_packet());

        sendCiInput(ciInput);
    }
}

void SSLGameController::sendCiInput(gameController::CiInput &input)
{
    if (!m_resetMatchSent) {
        input.add_api_inputs()->set_reset_match(true);
    }
    if (!input.IsInitialized()) {
        qDebug() <<"Trying to send something that is not initialized";
    }
    if (m_gcCIProtocolConnection.sendGameControllerMessage(&input)) {
        m_resetMatchSent = true;

        // the game controller may send multiple messages
        while(true) {
            gameController::CiOutput ciOutput;
            if (!m_gcCIProtocolConnection.receiveGameControllerMessage(&ciOutput)) {
                return;
            }

            if (!ciOutput.has_referee_msg()) {
                continue;
            }

            const SSL_Referee &referee = ciOutput.referee_msg();

            if (!referee.IsInitialized()) {
                qDebug() <<"Not initialized! "<<referee.stage()<<referee.command();
                continue;
            }

            QByteArray packetData;
            packetData.resize(referee.ByteSize());
            if (referee.SerializeToArray(packetData.data(), packetData.size())) {
                emit gotPacketForReferee(packetData);
            }
        }
    }
}

void SSLGameController::handleGameEvent(std::shared_ptr<gameController::AutoRefToController> message)
{

}

static gameController::Command makeCommand(gameController::Command::Type type, bool teamIsBlue, bool commandIsNeutral) {
    gameController::Command command;
    command.set_type(type);
    if (!commandIsNeutral) {
        command.set_for_team(teamIsBlue ? gameController::Team::BLUE : gameController::Team::YELLOW);
    }
    return command;
}

void SSLGameController::handleGuiCommand(const QByteArray &data)
{
    SSL_Referee newState;
    newState.ParseFromArray(data.data(), data.size());

    gameController::CiInput ciInput;
    ciInput.set_timestamp(m_timer->currentTime());

    // the ui part of the internal referee will only change command, stage, goalie or cards
    if (!m_lastReferee.IsInitialized() || newState.command() != m_lastReferee.command()) {

        // must be before the referee state change, otherwise the GC might send out the referee state without the placement pos
        if (newState.command() == SSL_Referee::BALL_PLACEMENT_BLUE || newState.command() == SSL_Referee::BALL_PLACEMENT_YELLOW) {
            gameController::Change *placementChange = ciInput.add_api_inputs()->mutable_change();
            placementChange->mutable_set_ball_placement_pos()->mutable_pos()->set_x(newState.designated_position().x() / 1000.0f);
            placementChange->mutable_set_ball_placement_pos()->mutable_pos()->set_y(newState.designated_position().y() / 1000.0f);
        }

        gameController::Change *change = ciInput.add_api_inputs()->mutable_change();

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

        auto it = commandMap.find(newState.command());

        if (it == commandMap.end()) {
            qDebug() <<"Error in ssl game controller wrapper: could not map command "<<newState.command();
            return;
        }

        change->mutable_new_command()->mutable_command()->CopyFrom(it->second);
    }

    if (!m_lastReferee.IsInitialized() || newState.stage() != m_lastReferee.stage()) {
        gameController::Change *change = ciInput.add_api_inputs()->mutable_change();
        change->mutable_change_stage()->set_new_stage(newState.stage());
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

    // TODO: handle adding cards

    m_lastReferee = newState;

    if (ciInput.api_inputs_size() > 0) {
        sendCiInput(ciInput);
    }
}

void SSLGameController::handleCommand(const amun::CommandReferee &refereeCommand)
{
    if (refereeCommand.has_command()) {
        const std::string &c = refereeCommand.command();
        handleGuiCommand(QByteArray(c.data(), c.size()));
    }
}

void SSLGameController::gcFinished(int exitCode, QProcess::ExitStatus exitStatus)
{
    // TODO: report the game controller crashing
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

void SSLGameController::start()
{
    // TODO: show autoref version and running status in the UI
    if (!m_trackedVisionGenerator) {
        m_trackedVisionGenerator.reset(new SSLVisionTracked());
    }

    // find a free port for the ci connection
    int port = findFreePort(GC_CI_PORT_START);
    m_gcCIProtocolConnection.setPort(port);

    m_resetMatchSent = false;

    QString gameControllerExecutable(GAMECONTROLLER_EXECUTABLE_LOCATION);

    // the downloaded game controller file is not executable at first (relevant for linux and mac only)
    QFile::setPermissions(gameControllerExecutable, QFileDevice::ExeUser);

    QStringList arguments;
    arguments << "-timeAcquisitionMode" << "ci" << "-ciAddress" << QString("localhost:%1").arg(port) << "-backendOnly" << "True";

    m_gcProcess = new QProcess(this);
    m_gcProcess->setReadChannel(QProcess::StandardOutput);
    m_gcProcess->setProcessChannelMode(QProcess::MergedChannels);

    connect(m_gcProcess, &QProcess::readyReadStandardOutput, this, &SSLGameController::handleGCStdout);
    connect(m_gcProcess, QOverload<int, QProcess::ExitStatus>::of(&QProcess::finished), this, &SSLGameController::gcFinished);

    m_gcProcess->start(gameControllerExecutable, arguments, QIODevice::ReadOnly);
}
