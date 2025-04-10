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
#include <QVector>
#include <memory>
#include "protobuf/status.h"
#include "protobuf/command.h"
#include "protobuf/ssl_gc/ci/ssl_gc_ci.pb.h"
#include "protobuf/ssl_gc/rcon/ssl_gc_rcon_autoref.pb.h"
#include "core/vector.h"
#include "gamecontrollerci.h"
#include "humaninterventionsimulator.h"

class Timer;
class SSLVisionTracked;

class InternalGameController : public QObject
{
    Q_OBJECT
public:
    InternalGameController(const Timer *timer, QObject *parent = nullptr);
    ~InternalGameController();

private:
    void start();
    void stop();
    void handleGuiCommand(const QByteArray &data);
    bool sendCiInput(const gameController::CiInput &input);
    static gameController::Command mapCommand(SSL_Referee::Command command);
    void handleRefereeUpdate(const SSL_Referee &newState, bool delayedSending);

signals:
    void sendStatus(const Status &status);
    void gotPacketForReferee(const QByteArray &data, QString sender);
    void sendCommand(const Command &command);
    /*! \copydoc GameControllerCI::internalGCPortsUpdated */
    void internalGCPortsUpdated(const GameControllerPorts &ports);

public slots:
    void handleStatus(const Status &status);
    void handleCommand(const amun::CommandReferee &refereeCommand);
    void setEnabled(bool enabled);
    void setFlip(bool flip);

private:
    const Timer *m_timer;
    bool m_isEnabled = false;
    GameControllerCI m_gcCIProcess;
    std::unique_ptr<SSLVisionTracked> m_trackedVisionGenerator;
    SSL_Referee m_lastReferee;
    std::string m_geometryString;
    world::Geometry::Division m_currentDivision = world::Geometry::A;

    // for ball teleportation after placement failure
    int m_continueFrameCounter = 0;
    SSL_Referee::Command m_nextCommand = SSL_Referee::HALT;

    // for adding and removing robots
    bool m_enableRobotExchange = true;
    HumanInterventionSimulator m_humanInterventionSimulator;
};
