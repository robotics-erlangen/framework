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

#pragma once

#include <QObject>
#include <QProcess>
#include <QVector>
#include <memory>
#include "gamecontrollersocket.h"
#include "protobuf/status.h"
#include "protobuf/command.h"
#include "protobuf/ssl_gc_ci.pb.h"
#include "protobuf/ssl_game_controller_auto_ref.pb.h"
#include "core/vector.h"

class Timer;
class SSLVisionTracked;

class InternalGameController : public QObject
{
    Q_OBJECT
public:
    InternalGameController(const Timer *timer, QObject *parent = nullptr);
    ~InternalGameController();

    void handleGameEvent(std::shared_ptr<gameController::AutoRefToController> message);

private:
    void start();
    void stop();
    void handleGuiCommand(const QByteArray &data);
    bool sendCiInput(const gameController::CiInput &input);
    static int findFreePort(int startingFrom);
    void handleBallTeleportation(const SSL_Referee &referee);
    static gameController::Command mapCommand(SSL_Referee::Command command);
    void handleRefereeUpdate(const SSL_Referee &newState, bool delayedSending);
    void updateCurrentStatus(amun::StatusGameController::GameControllerState state);
    void handleNumberOfRobots(const world::State &worldState);
    bool isPositionFreeToEnterRobot(Vector pos, const world::State &worldState);

signals:
    void sendStatus(const Status &status);
    void gotPacketForReferee(const QByteArray &data, QString sender);
    void gotControllerReply(const gameController::ControllerReply &reply);
    void sendCommand(const Command &command);

public slots:
    void handleStatus(const Status &status);
    void handleCommand(const amun::CommandReferee &refereeCommand);
    void setEnabled(bool enabled);
    void setFlip(bool flip);

private slots:
    void handleGCStdout();
    void gcFinished(int, QProcess::ExitStatus);

private:
    const Timer *m_timer;
    bool m_isEnabled = false;
    QProcess *m_gcProcess = nullptr;
    GameControllerSocket m_gcCIProtocolConnection;
    std::unique_ptr<SSLVisionTracked> m_trackedVisionGenerator;
    SSL_Referee m_lastReferee;
    std::string m_geometryString;
    // these inputs will be sent once the first packet goes through to the GC
    QVector<gameController::CiInput> m_queuedInputs;
    world::Geometry::Division m_currentDivision = world::Geometry::A;
    int m_nonResponseCounter = 0; // the number of missing responses
    amun::StatusGameController::GameControllerState m_currentState = amun::StatusGameController::STOPPED;
    bool m_deliberatlyStopped = false;

    // for ball teleportation after placement failure
    bool m_ballIsTeleported = false;
    int m_continueFrameCounter = 0;
    SSL_Referee::Command m_nextCommand = SSL_Referee::HALT;

    // for adding and removing robots
    bool m_enableRobotExchange = true;
    int m_allowedRobotsBlue = 11;
    int m_allowedRobotsYellow = 11;
    float m_fieldWidth = 1; // short side of the field
    qint64 m_lastExchangeTime = 0;
    QVector<int> m_blueTeamIds, m_yellowTeamIds;

    // the first port that will be chosen for the connection if it is available
    static constexpr int GC_CI_PORT_START = 10209;
};
