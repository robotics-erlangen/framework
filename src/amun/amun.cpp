/***************************************************************************
 *   Copyright 2016 Michael Eischer, Philipp Nordhus, Paul Bergmann        *
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

#include "amun.h"
#include "receiver.h"
#include "optionsmanager.h"
#include "commandconverter.h"
#include "core/timer.h"
#include "core/protobuffilesaver.h"
#include "core/sslprotocols.h"
#include "processor/processor.h"
#include "processor/trackingreplay.h"
#include "processor/transceiver.h"
#include "processor/networktransceiver.h"
#include "processor/integrator.h"
#include "protobuf/geometry.h"
#include "simulator/simulator.h"
#include "strategy/script/debughelper.h"
#include "strategy/strategyreplayhelper.h"
#include "strategy/strategy.h"
#include "networkinterfacewatcher.h"
#include "seshat/seshat.h"
#include "gitinforecorder.h"
#include <QMetaType>
#include <QThread>
#include <QList>

using namespace camun::simulator;

/*!
 * \class Amun
 * \ingroup amun
 * \brief Core class of Amun architecture
 *
 * Creates a processor thread, a simulator thread, a networking thread and two
 * strategy threads.
 */

/*!
 * \fn void Amun::gotCommand(const Command &command)
 * \brief Passes a \ref Command
 */

/*!
 * \brief Creates an Amun instance
 * \param simulatorOnly Only enable the simulator (for amun-cli + unittests)
 * \param parent Parent object
 */
Amun::Amun(bool simulatorOnly, QObject *parent) :
    QObject(parent),
    m_processor(nullptr),
    m_transceiver(nullptr),
    m_networkTransceiver(nullptr),
    m_simulator(nullptr),
    m_referee(nullptr),
    m_vision(nullptr),
    m_mixedTeam(nullptr),
    m_simulatorEnabled(false),
    m_scaling(1.0f),
    m_useNetworkTransceiver(false),
    m_simulatorOnly(simulatorOnly),
    m_useInternalReferee(true),
    m_useAutoref(true),
    m_networkInterfaceWatcher(nullptr),
    m_seshat(new Seshat(20, this)),
    m_commandConverter(nullptr),
    m_gitInfoRecorder(nullptr)
{
    qRegisterMetaType<QNetworkInterface>("QNetworkInterface");
    qRegisterMetaType<Command>("Command");
    qRegisterMetaType<QList<RobotCommandInfo>>("QList<RobotCommandInfo>");
    qRegisterMetaType< QList<robot::RadioCommand> >("QList<robot::RadioCommand>");
    qRegisterMetaType< QList<robot::RadioResponse> >("QList<robot::RadioResponse>");
    qRegisterMetaType<Status>("Status");
    qRegisterMetaType<std::shared_ptr<gameController::AutoRefToController>>("std::shared_ptr<gameController::AutoRefToController>");
    qRegisterMetaType<amun::DebugValue>("amun::DebugValue");
    qRegisterMetaType<amun::Visualization>("amun::Visualization");
    qRegisterMetaType<SSLSimRobotControl>("SSLSimRobotControl");
    qRegisterMetaType<SSLSimError>("SSLSimError");
    qRegisterMetaType<QList<SSLSimError>>("QList<SSLSimError>");
    qRegisterMetaType<camun::simulator::ErrorSource>("ErrorSource");
    qRegisterMetaType<camun::simulator::ErrorSource>("camun::simulator::ErrorSource");
    qRegisterMetaType<amun::CommandReferee>("amun::CommandReferee");

    for (int i = 0; i < 3; ++i) {
        m_strategy[i] = nullptr;
        m_debugHelper[i] = nullptr;
    }
    for (int i = 0;i < 2; i++) {
        m_replayStrategy[i] = nullptr;
    }

    // global timer, which can be slowed down / sped up
    m_timer = new Timer;
    m_replayTimer = new Timer;
    m_replayTimer->setScaling(0);

    m_commandConverter = new CommandConverter(m_timer, this);
    connect(m_commandConverter, &CommandConverter::sendStatus, this, &Amun::handleStatus);
    // these threads just run an event loop
    // using the signal-slot mechanism the objects in these can be called
    m_processorThread = new QThread(this);
    m_transceiverThread = new QThread(this);
    m_networkThread = new QThread(this);
    m_simulatorThread = new QThread(this);
    for (int i = 0;i<5;i++) {
        m_strategyThread[i] = new QThread(this);
    }
    m_debugHelperThread = new QThread(this);

    m_networkInterfaceWatcher = (!m_simulatorOnly) ? new NetworkInterfaceWatcher(this) : nullptr;

    m_pathInputSaver[0].reset(new ProtobufFileSaver("pathinput-blue.pathlog", "KHONSU PATHFINDING LOG", this));
    m_pathInputSaver[1].reset(new ProtobufFileSaver("pathinput-yellow.pathlog", "KHONSU PATHFINDING LOG", this));

    m_gitRecorderThread = new QThread(this);
}

/*!
 * \brief Destroys the Amun instance
 */
Amun::~Amun()
{
    stop();
    delete m_timer;
    delete m_replayTimer;
}

/*!
 * \brief Start processing
 *
 * This method starts all threads.
 */
void Amun::start()
{
    // create processor
    Q_ASSERT(m_processor == nullptr);
    m_processor = new Processor(m_timer, false);
    m_processor->moveToThread(m_processorThread);
    connect(m_processorThread, SIGNAL(finished()), m_processor, SLOT(deleteLater()));

    // route commands and replay status to processor and integrator
    connect(this, SIGNAL(gotCommand(Command)), m_processor, SLOT(handleCommand(Command)));

    // relay tracking, geometry, referee, controller and accelerator information
    connect(m_processor, SIGNAL(sendStatus(Status)), SLOT(handleStatus(Status)));

    m_optionsManager = new OptionsManager;
    m_optionsManager->moveToThread(thread());
    connect(this, SIGNAL(gotCommand(Command)), m_optionsManager, SLOT(handleCommand(Command)));
    connect(m_optionsManager, SIGNAL(sendStatus(Status)), SLOT(handleStatus(Status)));

    m_gitInfoRecorder = new GitInfoRecorder;
    m_gitInfoRecorder->moveToThread(m_gitRecorderThread);
    connect(m_gitRecorderThread, SIGNAL(finished()), m_gitInfoRecorder, SLOT(deleteLater()));
    connect(m_gitInfoRecorder, &GitInfoRecorder::sendStatus, this, &Amun::handleStatus);
    {
        QObject signalSource;
        connect(&signalSource, &QObject::destroyed, m_gitInfoRecorder, &GitInfoRecorder::recordRaGitDiff);
    }

    connect(this, SIGNAL(gotCommand(Command)), m_seshat, SLOT(handleCommand(Command)));
    connect(m_seshat, &Seshat::sendUi, this, &Amun::sendStatus);
    connect(m_seshat, &Seshat::sendReplayStrategy, this, &Amun::handleStatusForReplay);
    connect(m_seshat, &Seshat::simPauseCommand, this, &Amun::handleCommandLocally);
    // start strategy threads
    for (int i = 0; i < 3; i++) {
        StrategyType strategy = StrategyType::BLUE;
        if (i == 1) {
            strategy = StrategyType::YELLOW;
        } else if (i == 2) {
            strategy = StrategyType::AUTOREF;
        }

        Q_ASSERT(m_debugHelper[i] == nullptr);
        m_debugHelper[i] = new DebugHelper(strategy);
        m_debugHelper[i]->moveToThread(m_debugHelperThread);
        connect(this, SIGNAL(gotCommand(Command)),
                m_debugHelper[i], SLOT(handleCommand(Command)));
        connect(m_debugHelper[i], SIGNAL(sendStatus(Status)), SLOT(handleStatus(Status)));
        connect(m_debugHelperThread, SIGNAL(finished()), m_debugHelper[i], SLOT(deleteLater()));

        m_gameControllerConnection[i].reset(new StrategyGameControllerMediator(m_processor->getInternalGameController(), i == 2));
        m_gameControllerConnection[i]->moveToThread(m_strategyThread[i]);
        connect(m_processor, &Processor::refereeHostChanged, m_gameControllerConnection[i].get(), &StrategyGameControllerMediator::handleRefereeHost);
        connect(this, &Amun::useInternalGameController, m_gameControllerConnection[i].get(), &StrategyGameControllerMediator::switchInternalGameController);
        connect(this, &Amun::useInternalGameController, m_processor->getInternalGameController(), &InternalGameController::setEnabled);
        connect(this, &Amun::gotCommandForGC, m_processor->getInternalGameController(), &InternalGameController::handleCommand);

        Q_ASSERT(m_strategy[i] == nullptr);
        ProtobufFileSaver *pathInput = m_pathInputSaver[std::min(1, i)].get();
        m_strategy[i] = new Strategy(m_timer, strategy, m_debugHelper[i], &m_compilerRegistry, m_gameControllerConnection[i], i == 2, false, pathInput);
        m_strategy[i]->moveToThread(m_strategyThread[i]);
        connect(m_strategyThread[i], SIGNAL(finished()), m_strategy[i], SLOT(deleteLater()));

        // send tracking, geometry and referee to strategy
        connect(m_processor, SIGNAL(sendStrategyStatus(Status)), m_strategy[i], SLOT(handleStatus(Status)));
        connect(m_optionsManager, SIGNAL(sendStatus(Status)), m_strategy[i], SLOT(handleStatus(Status)));
        // forward robot commands to processor
        connect(m_strategy[i], SIGNAL(sendStrategyCommands(bool, QList<RobotCommandInfo>, qint64)),
                m_processor, SLOT(handleStrategyCommands(bool, QList<RobotCommandInfo>, qint64)));
        connect(m_strategy[i], SIGNAL(sendHalt(bool)), m_processor, SLOT(handleStrategyHalt(bool)));
        connect(m_processor, SIGNAL(setFlipped(bool)), m_strategy[i], SLOT(setFlipped(bool)));

        // route commands from and to strategy
        connect(m_strategy[i], SIGNAL(gotCommand(Command)), SLOT(handleCommand(Command)));
        connect(this, SIGNAL(gotCommand(Command)),
                m_strategy[i], SLOT(handleCommand(Command)));
        // relay status and debug information of strategy
        connect(m_strategy[i], SIGNAL(sendStatus(Status)), SLOT(handleStatus(Status)));
        connect(m_strategy[i], SIGNAL(sendStatus(Status)), m_optionsManager, SLOT(handleStatus(Status)));
        connect(m_strategy[i], &Strategy::recordGitDiff, m_gitInfoRecorder, &GitInfoRecorder::startGitDiffStrategy);
    }

    // replay strategies and connections
    m_integrator = new Integrator();
    m_integrator->moveToThread(m_processorThread);
    connect(this, SIGNAL(gotCommand(Command)), m_integrator, SLOT(handleCommand(Command)));
    connect(this, SIGNAL(sendStatusForReplay(Status)), m_integrator, SLOT(handleReplayStatus(Status)));
    connect(m_processorThread, SIGNAL(finished()), m_integrator, SLOT(deleteLater()));
    // relay tracking, geometry, referee, controller and accelerator information
    connect(m_processor, SIGNAL(sendStrategyStatus(Status)), m_integrator, SLOT(handleStatus(Status)));
    for (int i = 0;i<2;i++) {
        StrategyType strategy = i == 0 ? StrategyType::BLUE : StrategyType::YELLOW;
        Q_ASSERT(m_replayStrategy[i] == nullptr);
        m_replayStrategy[i] = new Strategy(m_replayTimer, strategy, nullptr, &m_compilerRegistry, m_gameControllerConnection[i], false, true);
        // re-use thread for regular and replay strategy
        m_replayStrategy[i]->moveToThread(m_strategyThread[i + 3]);
        connect(m_strategyThread[i + 3], SIGNAL(finished()), m_replayStrategy[i], SLOT(deleteLater()));

        // use a rather large queue to make replay faster
        m_strategyBlocker[i] = new BlockingStrategyReplay(m_replayStrategy[i], 20);

        connect(m_integrator, SIGNAL(sendReplayStatus(Status)), m_strategyBlocker[i], SLOT(handleStatus(Status)));
        connect(m_optionsManager, SIGNAL(sendStatus(Status)), m_strategyBlocker[i], SLOT(handleStatus(Status)));

        connect(this, SIGNAL(gotCommand(Command)), m_replayStrategy[i], SLOT(handleCommand(Command)));
        connect(m_replayStrategy[i], SIGNAL(sendStatus(Status)), SLOT(handleReplayStatus(Status)));
        connect(m_replayStrategy[i], SIGNAL(sendStatus(Status)), m_optionsManager, SLOT(handleStatus(Status)));

        connect(m_seshat, &Seshat::changeStatusSource, m_replayStrategy[i], &Strategy::resetIsReplay);
    }

    if (!m_simulatorOnly) {
        // create referee
        setupReceiver(m_referee, QHostAddress(SSL_GAME_CONTROLLER_ADDRESS), SSL_GAME_CONTROLLER_PORT);
        connect(this, &Amun::updateRefereePort, m_referee, &Receiver::updatePort);
        // move referee packets to processor
        connect(m_referee, &Receiver::gotPacket, m_processor, &Processor::handleRefereePacket);

        // create vision
        setupReceiver(m_vision, QHostAddress(SSL_VISION_ADDRESS), SSL_VISION_PORT);
        // allow updating the port used to listen for ssl vision
        connect(this, &Amun::updateVisionPort, m_vision, &Receiver::updatePort);
        // vision is connected in setSimulatorEnabled
        connect(m_vision, &Receiver::sendStatus, this, &Amun::handleStatus);

        // create mixed team information receiver
        setupReceiver(m_mixedTeam, QHostAddress(), SSL_MIXED_TEAM_PORT);
        // pass packets to processor
        connect(m_mixedTeam, SIGNAL(gotPacket(QByteArray, qint64, QString)), m_processor, SLOT(handleMixedTeamInfo(QByteArray, qint64)));
    }

    // create simulator
    Q_ASSERT(m_simulator == nullptr);
    amun::SimulatorSetup defaultSimulatorSetup;
    simulatorSetupSetDefault(defaultSimulatorSetup);
    createSimulator(defaultSimulatorSetup);
    connect(m_processor, SIGNAL(setFlipped(bool)), m_simulator, SLOT(setFlipped(bool)));

    connect(m_processor->getInternalGameController(), &InternalGameController::sendCommand, this, &Amun::handleCommand);

    if (!m_simulatorOnly) {
        Q_ASSERT(m_transceiver == nullptr);
        m_transceiver = new Transceiver(m_timer);
        m_transceiver->moveToThread(m_transceiverThread);
        connect(m_transceiverThread, SIGNAL(finished()), m_transceiver, SLOT(deleteLater()));
        // route commands to transceiver
        connect(this, SIGNAL(gotCommand(Command)), m_transceiver, SLOT(handleCommand(Command)));
        // relay transceiver status and timing
        connect(m_transceiver, SIGNAL(sendStatus(Status)), SLOT(handleStatus(Status)));

        Q_ASSERT(m_networkTransceiver == nullptr);
        m_networkTransceiver = new NetworkTransceiver(m_timer);
        m_networkTransceiver->moveToThread(m_transceiverThread);
        connect(m_transceiverThread, SIGNAL(finished()), m_networkTransceiver, SLOT(deleteLater()));
        // route commands to transceiver
        connect(this, SIGNAL(gotCommand(Command)), m_networkTransceiver, SLOT(handleCommand(Command)));
        // relay transceiver status and timing
        connect(m_networkTransceiver, SIGNAL(sendStatus(Status)), SLOT(handleStatus(Status)));
    }

    connect (this, &Amun::gotCommand, m_commandConverter, &CommandConverter::handleCommand);

    // connect transceiver
    setSimulatorEnabled(m_simulatorOnly, false);

    // start threads
    m_processorThread->start();
    m_transceiverThread->start();
    m_networkThread->start();
    m_simulatorThread->start();
    for (int i = 0;i<5;i++) {
        m_strategyThread[i]->start();
    }
    m_debugHelperThread->start();
    m_gitRecorderThread->start();
}

/*!
 * \brief Stop processing
 *
 * All threads are stopped.
 */
void Amun::stop()
{
    // stop threads
    m_processorThread->quit();
    m_transceiverThread->quit();
    m_networkThread->quit();
    m_simulatorThread->quit();
    for (int i = 0;i<5;i++) {
        m_strategyThread[i]->quit();
    }
    m_gitRecorderThread->quit();

    // wait for threads
    m_processorThread->wait();
    m_transceiverThread->wait();
    m_networkThread->wait();
    m_simulatorThread->wait();
    for (int i = 0;i<3;i++) {
        m_strategyThread[i]->wait();
    }

    // As the strategy may still be writing to debugHelper, we can only start quitting as soon as the starategy is dead for sure.
    m_debugHelperThread->quit();
    m_debugHelperThread->wait();
    m_gitRecorderThread->wait();

    delete m_optionsManager;

    // worker objects are destroyed on thread shutdown
    m_transceiver = nullptr;
    m_networkTransceiver = nullptr;
    m_simulator = nullptr;
    m_vision = nullptr;
    m_referee = nullptr;
    m_mixedTeam = nullptr;
    m_optionsManager = nullptr;
    for (int i = 0; i < 3; i++) {
        m_strategy[i] = nullptr;
        m_debugHelper[i] = nullptr;
    }
    for (int i = 0; i < 2; i++) {
        m_replayStrategy[i] = nullptr;
        delete m_strategyBlocker[i];
        m_strategyBlocker[i] = nullptr;
    }
    m_processor = nullptr;
    m_integrator = nullptr;
    m_gitInfoRecorder = nullptr;
}

void Amun::setupReceiver(Receiver *&receiver, const QHostAddress &address, quint16 port)
{
    Q_ASSERT(receiver == nullptr);
    receiver = new Receiver(address, port, m_timer);
    receiver->moveToThread(m_networkThread);
    connect(m_networkThread, SIGNAL(finished()), receiver, SLOT(deleteLater()));
    // start and stop socket
    connect(m_networkThread, SIGNAL(started()), receiver, SLOT(startListen()));
    // pass packets to processor
    connect(m_networkInterfaceWatcher, &NetworkInterfaceWatcher::interfaceUpdated, receiver, &Receiver::updateInterface);
}

void Amun::createSimulator(const amun::SimulatorSetup &setup)
{
    m_simulator = new Simulator(m_timer, setup);
    m_simulator->moveToThread(m_simulatorThread);
    connect(m_simulatorThread, SIGNAL(finished()), m_simulator, SLOT(deleteLater()));
    // pass on simulator and team settings
    connect(this, SIGNAL(gotCommand(Command)), m_simulator, SLOT(handleCommand(Command)));
    // pass simulator timing
    connect(m_simulator, SIGNAL(sendStatus(Status)), SLOT(handleStatus(Status)));
}

/*!
 * \brief Process a command
 * \param command Command to process
 */
void Amun::handleCommand(const Command &command)
{
    handleCommandLocally(command);

    emit gotCommand(command);
}

void Amun::handleCommandLocally(const Command &command)
{
    if (command->has_simulator()) {
        const amun::CommandSimulator &sim = command->simulator();
        if (sim.has_enable()) {
            setSimulatorEnabled(sim.enable(), m_useNetworkTransceiver);

            // time scaling can only be used with the simulator
            if (m_simulatorEnabled) {
                updateScaling(m_scaling);
            } else {
                // reset timer to realtime
                m_timer->reset();
                updateScaling(1.0);
            }
        }

        if (sim.has_simulator_setup()) {
            m_simulator->blockSignals(true);
            m_simulator->deleteLater();
            m_timer->reset();
            createSimulator(sim.simulator_setup());
            setSimulatorEnabled(m_simulatorEnabled, m_useNetworkTransceiver);
        }

        if (sim.has_ssl_control() && sim.ssl_control().has_simulation_speed()) {
            float newSpeed = sim.ssl_control().simulation_speed();
            if (newSpeed != m_scaling) {
                if (m_scaling == 0.0f) {
                    m_previousSpeed = newSpeed;
                } else {
                    m_scaling = newSpeed;
                    if (m_simulatorEnabled) {
                        updateScaling(m_scaling);
                    }
                }
            }
        }
    }

    if (command->has_pause_simulator()) {
        pauseSimulator(command->pause_simulator());
    }

    if (command->has_amun()) {
        if (command->amun().has_vision_port()) {
            emit updateVisionPort(command->amun().vision_port());
        }
        if (command->amun().has_referee_port()) {
            emit updateRefereePort(command->amun().referee_port());
        }
    }

    if (command->has_transceiver()) {
        if (command->transceiver().has_use_network()) {
            setSimulatorEnabled(m_simulatorEnabled, command->transceiver().use_network());
        }
    }

    if (command->has_referee()) {
        const amun::CommandReferee &referee = command->referee();
        bool internalAutorefBefore = m_useInternalReferee && m_useAutoref;
        if (referee.has_active()) {
            m_useInternalReferee = referee.active();
        }
        if (referee.has_use_internal_autoref()) {
            m_useAutoref = referee.use_internal_autoref();
        }
        bool internalAutoref = m_useInternalReferee && m_useAutoref;
        if (internalAutoref != internalAutorefBefore) {
            enableAutoref(internalAutoref);
        }
        // send out even if it does not change, since the default value may vary between objects (GC)
        emit useInternalGameController(internalAutoref);

        emit gotCommandForGC(referee);
    }

    if (command->has_replay()) {
        const amun::CommandReplay &replay = command->replay();
        if (replay.has_enable()) {
            amun::PauseSimulatorCommand pause;
            pause.set_pause(replay.enable());
            pause.set_reason(amun::Replay);
            pauseSimulator(pause);
        }
    }

    if (command->has_tracking()) {
        if (command->tracking().has_tracking_replay_enabled()) {
            bool enable = command->tracking().tracking_replay_enabled();
            if (enable != m_enableTrackingReplay) {
                m_enableTrackingReplay = enable;
                if (enable) {
                    enableTrackingReplay();
                }
            }
        }
    }
}

void Amun::enableTrackingReplay()
{
    m_trackingReplay.reset(new TrackingReplay(m_replayTimer));
    connect(m_trackingReplay.get(), &TrackingReplay::gotStatus, this, &Amun::handleReplayStatus);
}

void Amun::pauseSimulator(const amun::PauseSimulatorCommand &pauseCommand)
{
    auto reason = pauseCommand.reason();
    int reasonsSizeBefore = m_activePauseReasons.size();
    if (pauseCommand.has_pause()) {
        if (pauseCommand.pause()) {
            m_activePauseReasons.insert(reason);
        } else {
            m_activePauseReasons.remove(reason);
        }
    }
    if (pauseCommand.has_toggle() && pauseCommand.toggle()) {
        if (!m_activePauseReasons.contains(reason)) {
            m_activePauseReasons.insert(reason);
        } else {
            m_activePauseReasons.remove(reason);
        }
    }
    if (reasonsSizeBefore > 0 && m_activePauseReasons.size() == 0) {
        m_scaling = m_previousSpeed;
        if (m_simulatorEnabled) {
            updateScaling(m_scaling);
        }
    } else if (reasonsSizeBefore == 0 && m_activePauseReasons.size() > 0) {
        m_previousSpeed = m_scaling;
        m_scaling = 0.0f;
        if (m_simulatorEnabled) {
            updateScaling(m_scaling);
        }
    }
}

void Amun::enableAutoref(bool enable)
{
    m_strategy[2]->blockSignals(!enable);
    m_strategy[2]->setEnabled(enable);
}

/*!
 * \brief Set time scaling
 * \param scaling Scaling factor for time
 */
void Amun::updateScaling(float scaling)
{
    m_timer->setScaling(scaling);

    Status status(new amun::Status);
    status->set_timer_scaling(scaling);
    handleStatus(status);
}

/*!
 * \brief Add timestamp and emit \ref sendStatus
 * \param status Status to send
 */
void Amun::handleStatus(const Status &status)
{
    status->set_time(m_timer->currentTime());
    m_seshat->handleStatus(status);
}

void Amun::handleStatusForReplay(const Status &status)
{
    if (m_enableTrackingReplay) {
        m_trackingReplay->handleStatus(status);
    } else {
        m_replayTimer->setTime(status->time(), 0);
        emit sendStatusForReplay(status);
    }
}

void Amun::handleReplayStatus(const Status &status)
{
    status->set_time(m_replayTimer->currentTime());
    m_seshat->handleReplayStatus(status);
}

/*!
 * \brief Toggle simulator mode
 *
 * Switches vision input of \ref Processor to either SSLVision or
 * \ref Simulator and output of \ref Processor to either \ref Transceiver or \ref Simulator.
 *
 * \param enabled Whether to enable or disable the simulator
 * \param useNetworkTransceiver Whether to send commands over network or using the transceiver
 */
void Amun::setSimulatorEnabled(bool enabled, bool useNetworkTransceiver)
{
    if (m_simulatorOnly) {
        enabled = true;
    }
    m_simulatorEnabled = enabled;
    m_useNetworkTransceiver = useNetworkTransceiver;

    // remove vision and response connections
    m_simulator->disconnect(m_processor);
    if (!m_simulatorOnly) {
        m_vision->disconnect(m_processor);
        m_networkTransceiver->disconnect(m_processor);
        m_transceiver->disconnect(m_processor);
    }

    // remove radio command connections
    m_processor->disconnect(m_commandConverter);
    m_commandConverter->disconnect(m_simulator);
    if (!m_simulatorOnly) {
        m_processor->disconnect(m_transceiver);
        m_commandConverter->disconnect(m_networkTransceiver);
        m_networkTransceiver->setSendCommands(false);
    }

    // remove errors connections
    m_simulator->disconnect(m_commandConverter);
    if (!m_simulatorOnly) {
        m_networkTransceiver->disconnect(m_commandConverter);
    }

    // setup connection for radio commands
    if (enabled || useNetworkTransceiver) {
        connect(m_processor, &Processor::sendRadioCommands, m_commandConverter, &CommandConverter::handleRadioCommands);
        if (enabled) {
            // simulator setup
            connect(m_commandConverter, &CommandConverter::sendSSLSim, m_simulator, &Simulator::handleRadioCommands);
        } else {
            // network transceiver setup
            connect(m_commandConverter, &CommandConverter::sendSSLSim, m_networkTransceiver, &NetworkTransceiver::handleSSLSimCommand);
            m_networkTransceiver->setSendCommands(true);
        }
    } else {
        // field setup
        connect(m_processor, SIGNAL(sendRadioCommands(QList<robot::RadioCommand>,qint64)),
                m_transceiver, SLOT(handleRadioCommands(QList<robot::RadioCommand>,qint64)));
    }

    // setup connection for simulator errors
    if (enabled) {
        connect(m_simulator, &Simulator::sendSSLSimError, m_commandConverter, &CommandConverter::handleSimulatorErrors);
    } else if (useNetworkTransceiver) {
        connect(m_networkTransceiver, &NetworkTransceiver::sendSSLSimError, m_commandConverter, &CommandConverter::handleSimulatorErrors);
    }

    // setup connections for vision
    if (enabled) {
        connect(m_simulator, SIGNAL(gotPacket(QByteArray, qint64, QString)),
                m_processor, SLOT(handleVisionPacket(QByteArray, qint64, QString)));
        connect(m_simulator, &Simulator::sendRealData, m_processor, &Processor::handleSimulatorExtraVision);

    } else {
        connect(m_vision, SIGNAL(gotPacket(QByteArray, qint64, QString)),
                m_processor, SLOT(handleVisionPacket(QByteArray, qint64, QString)));
    }

    // setup connections for robot responses
    if (enabled) {
        connect(m_simulator, SIGNAL(sendRadioResponses(QList<robot::RadioResponse>)),
                m_processor, SLOT(handleRadioResponses(QList<robot::RadioResponse>)));
    } else {
        QObject* transceiver = m_transceiver;
        if (useNetworkTransceiver) {
            transceiver = m_networkTransceiver;
        }
        connect(transceiver, SIGNAL(sendRadioResponses(QList<robot::RadioResponse>)),
                m_processor, SLOT(handleRadioResponses(QList<robot::RadioResponse>)));
    }
}
