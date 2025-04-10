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

#include "gamecontrollerci.h"

#include "config/config.h"
#include "core/timer.h"
#include <QDir>
#include <QFile>
#include <QRegularExpression>
#include <QString>
#include <QStringList>
#include <QTcpServer>
#include <QtGlobal>

GameControllerCI::GameControllerCI(const Timer *timer, QObject *parent) :
    QObject(parent),
    m_timer(timer),
    m_gcCIProtocolConnection(GC_CI_PORT_START, this)
{
    m_gcCIProtocolConnection.setRefereeHost("127.0.0.1");
}

GameControllerCI::~GameControllerCI()
{
    stop();
}

void GameControllerCI::start()
{
    m_nonResponseCounter = 0;
    m_deliberatlyStopped = false;
    updateCurrentStatus(amun::StatusGameController::STARTING);

    const auto ports = allocatePorts();

    if (Q_UNLIKELY(!ports)) {
        // Not entirely accurate, but gets the point across
        updateCurrentStatus(amun::StatusGameController::CRASHED);
        return;
    }
    emit internalGCPortsUpdated(*ports);

    m_gcCIProtocolConnection.setPort(ports->ci);

    // Delete game controller data to ensure stale state-stores and configs by
    // previous runs (or GC versions) are removed
    //
    // Note that this removes the directory itself as well, not just its
    // contents. This is an important aspect to allowing multiple game
    // controllers to run in parallel - new instances will create a new
    // directory, while old instances keep open file handles to the contents of
    // the old directory. This way, the two instances don't share the same
    // state store.
    QDir gameControllerData { QString("%1/gamecontroller/data").arg(ERFORCE_CONFDIR) };
    gameControllerData.removeRecursively();

    QString gameControllerExecutable(GAMECONTROLLER_EXECUTABLE_LOCATION);

    // the downloaded game controller file is not executable at first (relevant for linux and mac only)
    QFile::setPermissions(gameControllerExecutable, QFileDevice::ExeUser | QFileDevice::ReadUser | QFileDevice::WriteUser);

    QStringList arguments;
    arguments << "-timeAcquisitionMode" << "ci"
        << "-backendOnly"
        << "-ciAddress" << QString("localhost:%1").arg(ports->ci)
        << "-autorefAddress" << QString("localhost:%1").arg(ports->autoref)
        << "-teamAddress" << QString("localhost:%1").arg(ports->team);

    m_gcProcess = new QProcess(this);
    m_gcProcess->setReadChannel(QProcess::StandardOutput);
    m_gcProcess->setProcessChannelMode(QProcess::MergedChannels);

    // set the GC working directory so that all produced files (config/state store) end up there and not scattered
    m_gcProcess->setWorkingDirectory(QString("%1/gamecontroller").arg(ERFORCE_CONFDIR));

    connect(m_gcProcess, &QProcess::readyReadStandardOutput, this, &GameControllerCI::handleGCStdout);
    connect(m_gcProcess, QOverload<int, QProcess::ExitStatus>::of(&QProcess::finished), this, &GameControllerCI::gcFinished);

    m_gcProcess->start(gameControllerExecutable, arguments, QIODevice::ReadOnly);
}

void GameControllerCI::stop()
{
    if (m_gcProcess) {
        m_deliberatlyStopped = true;
        m_gcCIProtocolConnection.closeConnection();
        m_gcProcess->close();
        m_gcProcess = nullptr;
    }
}

bool GameControllerCI::send(const gameController::CiInput &input)
{
    if (!m_queuedInputs.empty() && m_gcCIProtocolConnection.connectGameController()) {
        for (const auto &i : m_queuedInputs) {
            doSend(i);
        }

        m_queuedInputs.clear();
    }

    return doSend(input);
}

std::vector<gameController::CiOutput> GameControllerCI::clearQueuedOutputs()
{
    std::vector<gameController::CiOutput> outputs;
    outputs.swap(m_queuedOutputs);
    return outputs;
}

bool GameControllerCI::doSend(const gameController::CiInput &input)
{
    Q_ASSERT(input.IsInitialized());

    bool wentThrough = false;

    if ((wentThrough = m_gcCIProtocolConnection.sendGameControllerMessage(&input))) {
        gameController::CiOutput ciOutput;

        while (m_gcCIProtocolConnection.receiveGameControllerMessage(&ciOutput)) {
            m_nonResponseCounter = 0;
            if (m_currentState != amun::StatusGameController::RUNNING) {
                updateCurrentStatus(amun::StatusGameController::RUNNING);
            }

            m_queuedOutputs.emplace_back(std::move(ciOutput));
        }
    }

    // We either could not send the message, or we broke out of the loop
    // because we could not read any more messages.
    m_nonResponseCounter++;
    if (m_nonResponseCounter > 50) {
        updateCurrentStatus(amun::StatusGameController::NOT_RESPONDING);
    }

    return wentThrough;
}

void GameControllerCI::updateCurrentStatus(amun::StatusGameController::GameControllerState state)
{
    m_currentState = state;

    Status status(new amun::Status);
    status->mutable_amun_state()->mutable_game_controller()->set_current_state(m_currentState);
    emit sendStatus(status);
}

std::optional<int> GameControllerCI::findFreePort(int startingFrom)
{
    for (int i = 0; i < NUMBER_OF_TRIED_PORTS; ++i) {
        int port = startingFrom + i;
        QTcpServer server;
        bool success = server.listen(QHostAddress::LocalHost, port);
        server.close();
        if (success) {
            return port;
        }
    }

    return std::nullopt;
}

std::optional<GameControllerPorts> GameControllerCI::allocatePorts()
{
    const auto ci = findFreePort(GC_CI_PORT_START);
    if (!ci) {
        return std::nullopt;
    }

    const auto autoref = findFreePort(GC_AUTOREF_PORT_START);
    if (!autoref) {
        return std::nullopt;
    }

    const auto team = findFreePort(GC_TEAM_PORT_START);
    if (!team) {
        return std::nullopt;
    }

    return GameControllerPorts {
        .ci = *ci,
        .autoref = *autoref,
        .team = *team,
    };
}

void GameControllerCI::handleGCStdout()
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

void GameControllerCI::gcFinished(int, QProcess::ExitStatus)
{
    if (m_deliberatlyStopped) {
        updateCurrentStatus(amun::StatusGameController::STOPPED);
    } else {
        updateCurrentStatus(amun::StatusGameController::CRASHED);
    }
}
