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
#include "core/timer.h"
#include "core/protobuffilesaver.h"
#include "processor/processor.h"
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
    m_seshat(new Seshat(20, this))
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

    m_pathInputSaver = new ProtobufFileSaver("pathinput.pathlog", "KHONSU PATHFINDING LOG", this);
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
    m_processor = new Processor(m_timer);
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

        m_gameControllerConnection[i].reset(new GameControllerConnection(m_processor->getInternalGameController(), i == 2));
        m_gameControllerConnection[i]->moveToThread(m_strategyThread[i]);
        connect(this, &Amun::gotRefereeHost, m_gameControllerConnection[i].get(), &GameControllerConnection::handleRefereeHost);
        connect(this, &Amun::useInternalGameController, m_gameControllerConnection[i].get(), &GameControllerConnection::switchInternalGameController);

        Q_ASSERT(m_strategy[i] == nullptr);
        m_strategy[i] = new Strategy(m_timer, strategy, m_debugHelper[i], &m_compilerRegistry, m_gameControllerConnection[i], i == 2, false, m_pathInputSaver);
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
    }

    if (!m_simulatorOnly) {
        // create referee
        setupReceiver(m_referee, QHostAddress("224.5.23.1"), 10003);
        connect(this, &Amun::updateRefereePort, m_referee, &Receiver::updatePort);
        // move referee packets to processor
        connect(m_referee, SIGNAL(gotPacket(QByteArray, qint64, QString)), m_processor, SLOT(handleRefereePacket(QByteArray, qint64)));
        connect(m_referee, SIGNAL(gotPacket(QByteArray,qint64,QString)), SLOT(handleRefereePacket(QByteArray,qint64,QString)));

        // create vision
        setupReceiver(m_vision, QHostAddress("224.5.23.2"), 10002);
        // allow updating the port used to listen for ssl vision
        connect(this, &Amun::updateVisionPort, m_vision, &Receiver::updatePort);
        // vision is connected in setSimulatorEnabled
        connect(m_vision, &Receiver::sendStatus, this, &Amun::handleStatus);

        // create mixed team information receiver
        setupReceiver(m_mixedTeam, QHostAddress(), 10012);
        // pass packets to processor
        connect(m_mixedTeam, SIGNAL(gotPacket(QByteArray, qint64, QString)), m_processor, SLOT(handleMixedTeamInfo(QByteArray, qint64)));
    }

    // create simulator
    Q_ASSERT(m_simulator == nullptr);
    amun::SimulatorSetup defaultSimulatorSetup;
    geometrySetDefault(defaultSimulatorSetup.mutable_geometry(), true);
    defaultSimulatorSetup.mutable_camera_setup()->set_num_cameras(2);
    defaultSimulatorSetup.mutable_camera_setup()->set_camera_height(4.5f);
    createSimulator(defaultSimulatorSetup);
    connect(m_processor, SIGNAL(setFlipped(bool)), m_simulator, SLOT(setFlipped(bool)));

    connect(m_processor->getInternalGameController(), SIGNAL(sendCommand(Command)), SLOT(handleCommand(Command)));

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
        m_networkTransceiver = new NetworkTransceiver();
        m_networkTransceiver->moveToThread(m_transceiverThread);
        connect(m_transceiverThread, SIGNAL(finished()), m_networkTransceiver, SLOT(deleteLater()));
        // route commands to transceiver
        connect(this, SIGNAL(gotCommand(Command)), m_networkTransceiver, SLOT(handleCommand(Command)));
        // relay transceiver status and timing
        connect(m_networkTransceiver, SIGNAL(sendStatus(Status)), SLOT(handleStatus(Status)));
    }

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
    }

    if (command->has_speed() && m_scaling != command->speed()) {
        if (m_scaling == 0.0f) {
            m_previousSpeed = command->speed();
        } else {
            m_scaling = command->speed();
            if (m_simulatorEnabled) {
                updateScaling(m_scaling);
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
            emit useInternalGameController(internalAutoref);
        }
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

void Amun::handleRefereePacket(QByteArray, qint64, QString host)
{
    emit gotRefereeHost(host);
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
    m_replayTimer->setTime(status->time(), 0);
    emit gotReplayStatus(status);
    emit sendStatusForReplay(status);
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
    // remove vision connections
    m_simulator->disconnect(m_processor);
    if (!m_simulatorOnly) {
        m_vision->disconnect(m_processor);
    }
    //remove radio command and response connections
    m_processor->disconnect(m_simulator);
    if (!m_simulatorOnly) {
        m_processor->disconnect(m_transceiver);
        m_processor->disconnect(m_networkTransceiver);
    }

    if (enabled) {
        connect(m_simulator, SIGNAL(gotPacket(QByteArray, qint64, QString)),
                m_processor, SLOT(handleVisionPacket(QByteArray, qint64, QString)));
        connect(m_simulator, SIGNAL(sendRadioResponses(QList<robot::RadioResponse>)),
                m_processor, SLOT(handleRadioResponses(QList<robot::RadioResponse>)));
        connect(m_processor, SIGNAL(sendRadioCommands(QList<robot::RadioCommand>,qint64)),
                m_simulator, SLOT(handleRadioCommands(QList<robot::RadioCommand>,qint64)));
        connect(m_simulator, &Simulator::sendRealData, m_processor, &Processor::handleSimulatorExtraVision);
    } else {
        connect(m_vision, SIGNAL(gotPacket(QByteArray, qint64, QString)),
                m_processor, SLOT(handleVisionPacket(QByteArray, qint64, QString)));
        if (!useNetworkTransceiver) {
            connect(m_transceiver, SIGNAL(sendRadioResponses(QList<robot::RadioResponse>)),
                    m_processor, SLOT(handleRadioResponses(QList<robot::RadioResponse>)));
            connect(m_processor, SIGNAL(sendRadioCommands(QList<robot::RadioCommand>,qint64)),
                    m_transceiver, SLOT(handleRadioCommands(QList<robot::RadioCommand>,qint64)));
        } else {
            connect(m_processor, SIGNAL(sendRadioCommands(QList<robot::RadioCommand>,qint64)),
                    m_networkTransceiver, SLOT(handleRadioCommands(QList<robot::RadioCommand>,qint64)));
        }
    }
}
