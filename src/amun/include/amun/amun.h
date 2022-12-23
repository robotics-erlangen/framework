/***************************************************************************
 *   Copyright 2015 Michael Eischer, Philipp Nordhus, Paul Bergmann        *
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

#ifndef AMUN_H
#define AMUN_H

#include "strategy/script/compilerregistry.h"
#include "strategy/script/strategytype.h"
#include "gamecontroller/strategygamecontrollermediator.h"
#include "protobuf/command.h"
#include "protobuf/status.h"
#include <QObject>
#include <QSet>
#include <memory>

class DebugHelper;
class NetworkInterfaceWatcher;
class Processor;
class TrackingReplay;
class Receiver;
class Strategy;
class Timer;
class Transceiver;
class NetworkTransceiver;
class QHostAddress;
class Integrator;
class BlockingStrategyReplay;
class ProtobufFileSaver;
class OptionsManager;
class Seshat;
class CommandConverter;
class GitInfoRecorder;

namespace camun {
    namespace simulator {
        class Simulator;
    }
}

class Amun : public QObject
{
    Q_OBJECT

public:
    explicit Amun(bool simulatorOnly, QObject *parent = 0);
    ~Amun() override;
    Amun(const Amun&) = delete;
    Amun& operator=(const Amun&) = delete;

signals:
    void sendStatusForReplay(const Status &status);
    void sendStatus(const Status &status);
    void gotCommand(const Command &command);
    void updateVisionPort(quint16 port);
    void updateRefereePort(quint16 port);
    void useInternalGameController(bool useInternal);
    void gotCommandForGC(const amun::CommandReferee &command);

public:
    void start();
    void stop();

public slots:
    void handleCommand(const Command &command);

private slots:
    void handleStatus(const Status &status);
    void handleReplayStatus(const Status &status);
    void handleStatusForReplay(const Status &status);
    void handleCommandLocally(const Command& command);

private:
    void setupReceiver(Receiver *&receiver, const QHostAddress &address, quint16 port);
    void setSimulatorEnabled(bool enabled, bool useNetworkTransceiver);
    void updateScaling(float scaling);
    void createSimulator(const amun::SimulatorSetup &setup);
    void enableAutoref(bool enable);
    void pauseSimulator(const amun::PauseSimulatorCommand &pauseCommand);
    void enableTrackingReplay();

private:
    QThread *m_processorThread;
    QThread *m_transceiverThread;
    QThread *m_networkThread;
    QThread *m_simulatorThread;
    QThread *m_strategyThread[5];
    QThread *m_debugHelperThread;
    QThread *m_gitRecorderThread;

    Processor *m_processor;
    Transceiver *m_transceiver;
    NetworkTransceiver *m_networkTransceiver;
    camun::simulator::Simulator *m_simulator;
    Receiver *m_referee;
    Receiver *m_vision;
    Receiver *m_mixedTeam;
    Strategy *m_strategy[3];
    DebugHelper *m_debugHelper[3];
    std::shared_ptr<StrategyGameControllerMediator> m_gameControllerConnection[3];
    Strategy *m_replayStrategy[2];
    OptionsManager *m_optionsManager = nullptr;
    BlockingStrategyReplay *m_strategyBlocker[2];
    qint64 m_lastTime;
    Timer *m_timer;
    Timer *m_replayTimer;
    Integrator *m_integrator;
    bool m_simulatorEnabled;
    float m_scaling;
    bool m_useNetworkTransceiver;
    const bool m_simulatorOnly;
    bool m_useInternalReferee;
    bool m_useAutoref;
    bool m_enableTrackingReplay = false;
    std::unique_ptr<TrackingReplay> m_trackingReplay;

    QSet<amun::PauseSimulatorReason> m_activePauseReasons;
    float m_previousSpeed;

    NetworkInterfaceWatcher *m_networkInterfaceWatcher;

    CompilerRegistry m_compilerRegistry;

    std::unique_ptr<ProtobufFileSaver> m_pathInputSaver[2];
    Seshat *m_seshat;

    CommandConverter *m_commandConverter;
	GitInfoRecorder *m_gitInfoRecorder;
};

#endif // AMUN_H
