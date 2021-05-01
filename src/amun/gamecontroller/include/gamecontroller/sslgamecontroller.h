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
#include <memory>
#include "externalgamecontroller.h"
#include "protobuf/status.h"
#include "protobuf/command.h"
#include "protobuf/ssl_gc_ci.pb.h"
#include "protobuf/ssl_game_controller_auto_ref.pb.h"

class Timer;
class SSLVisionTracked;

class SSLGameController : public QObject
{
    Q_OBJECT
public:
    SSLGameController(const Timer *timer, QObject *parent);
    ~SSLGameController();

    void start();
    void handleGameEvent(std::shared_ptr<gameController::AutoRefToController> message);

private:
    void connectToGC();
    void handleGuiCommand(const QByteArray &data);
    void sendCiInput(gameController::CiInput &input);
    static int findFreePort(int startingFrom);
    void handlePlacementFailure(const SSL_Referee &referee);
    static gameController::Command mapCommand(SSL_Referee::Command command);

signals:
    void sendStatus(const Status &status);
    void gotPacketForReferee(const QByteArray &data);
    void gotControllerReply(const gameController::ControllerReply &reply);
    void sendCommand(const Command &command);

public slots:
    void handleStatus(const Status &status);
    void handleCommand(const amun::CommandReferee &refereeCommand);

private slots:
    void handleGCStdout();
    void gcFinished(int exitCode, QProcess::ExitStatus exitStatus);

private:
    const Timer *m_timer;
    QProcess *m_gcProcess = nullptr;
    ExternalGameController m_gcCIProtocolConnection;
    std::unique_ptr<SSLVisionTracked> m_trackedVisionGenerator;
    SSL_Referee m_lastReferee;
    bool m_resetMatchSent = false;
    std::string m_geometryString;

    // for ball teleportation after placement failure
    bool m_ballIsTeleported = false;
    int m_continueFrameCounter = 0;
    SSL_Referee::Command m_nextCommand = SSL_Referee::HALT;

    // the first port that will be chosen for the connection if it is available
    static constexpr int GC_CI_PORT_START = 10209;
};
