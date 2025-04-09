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

#pragma once

#include "gamecontrollersocket.h"
#include "protobuf/ssl_gc/ci/ssl_gc_ci.pb.h"
#include "protobuf/status.h"
#include <QObject>
#include <QProcess>
#include <optional>
#include <vector>

class Timer;

/*! \brief The ports allocated for the game controller CI instance. */
struct GameControllerPorts
{
    /*! \brief The port allocated for the CI protocol. */
    int ci;
};

/*! \brief Connection to a local game controller instance using the CI
 * protocol.
 *
 * Handles the process lifecycle of a locally executed game controller instance
 * and communication via the Game Controller CI protocol.
 */
class GameControllerCI : public QObject
{
    Q_OBJECT
public:
    explicit GameControllerCI(const Timer *timer, QObject *parent = nullptr);
    ~GameControllerCI();

    void start();
    void stop();

    bool hasQueuedInputs() const {
        return !m_queuedInputs.empty();
    }
    void enqueueInput(const gameController::CiInput &input) {
        m_queuedInputs.push_back(input);
    }
    bool send(const gameController::CiInput &input);

    std::vector<gameController::CiOutput> clearQueuedOutputs();

signals:
    void sendStatus(const Status &status);

private:
    bool doSend(const gameController::CiInput &input);
    void updateCurrentStatus(amun::StatusGameController::GameControllerState state);

    static std::optional<int> findFreePort(int startingFrom);
    static std::optional<GameControllerPorts> allocatePorts();

private slots:
    void handleGCStdout();
    void gcFinished(int, QProcess::ExitStatus);

private:
    const Timer *m_timer;

    QProcess *m_gcProcess;
    GameControllerSocket m_gcCIProtocolConnection;

    std::vector<gameController::CiInput> m_queuedInputs;
    std::vector<gameController::CiOutput> m_queuedOutputs;

    // the number of missing responses
    int m_nonResponseCounter = 0;
    amun::StatusGameController::GameControllerState m_currentState = amun::StatusGameController::STOPPED;
    bool m_deliberatlyStopped = false;

    // the first port that will be chosen for the connection if it is available
    static constexpr int GC_CI_PORT_START = 10209;
};
