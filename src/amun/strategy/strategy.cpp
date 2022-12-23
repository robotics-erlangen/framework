/***************************************************************************
 *   Copyright 2019 Paul Bergmann, Michael Eischer, Tobias Heineken,       *
 *   Philipp Nordhus, Andreas Wendler                                      *
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

#include "strategy/lua/lua.h"
#include "strategy.h"
#include "strategy/script/debughelper.h"
#include "strategy/script/compilerregistry.h"
#include "core/timer.h"
#include "config/config.h"
#include "protobuf/geometry.h"
#include "protobuf/ssl_game_controller_team.pb.h"
#include "protobuf/robot.h"
#include "google/protobuf/util/delimited_message_util.h"
#include <QCoreApplication>
#include <QDateTime>
#include <QFileInfo>
#include <QHostAddress>
#include <QTcpSocket>
#include <QTimer>
#include <QUdpSocket>
#include <QtEndian>
#include <QtGlobal>

#ifdef V8_FOUND
#include "strategy/typescript/typescript.h"
#include <v8.h>
#include <libplatform/libplatform.h>
#endif

/*!
 * \class Strategy
 * \ingroup strategy
 * \brief %Strategy script handling
 */

class StrategyPrivate {
public:
    QHostAddress mixedTeamHost;
    quint16 mixedTeamPort;
    QByteArray mixedTeamData;
};

#ifdef V8_FOUND
// default initialization
std::unique_ptr<v8::Platform> Strategy::static_platform;

void Strategy::initV8() {
    if (static_platform) {
        return;
    }

    v8::V8::InitializeICUDefaultLocation(QCoreApplication::applicationFilePath().toUtf8().data());
    v8::V8::InitializeExternalStartupData(QCoreApplication::applicationFilePath().toUtf8().data());
    static_platform = v8::platform::NewDefaultPlatform();
    v8::V8::InitializePlatform(static_platform.get());
    /* tsc_internal:InternalTypescriptCompiler and v8utility:embedToExternal
     * require this to be set.
     *
     * In recent V8 versions, flags need to be set before initializing V8
     */
    v8::V8::SetFlagsFromString("--expose_gc", 12);
    v8::V8::Initialize();
}
#else
void Strategy::initV8() { }
#endif

/*!
 * \brief Creates a Strategy instance
 * Automatically reloads the strategy when the field geometry or team robots change
 * \param timer Timer to be used for time scaling
 * \param type can be blue or yellow team or autoref
 */
Strategy::Strategy(const Timer *timer, StrategyType type, DebugHelper *helper, CompilerRegistry* registry,
                   std::shared_ptr<StrategyGameControllerMediator> &gameControllerConnection, bool internalAutoref,
                   bool isLogplayer, ProtobufFileSaver *pathInputSaver) :
    m_p(new StrategyPrivate),
    m_timer(timer),
    m_strategy(nullptr),
    m_debugStatus(Status::createArena()),
    m_type(type),
    m_autoReload(false),
    m_strategyFailed(true),
    m_isEnabled(!isLogplayer),
    m_compilerRegistry(registry),
    m_gameControllerConnection(gameControllerConnection)
{
    initV8();

    m_scriptState.debugHelper = helper;
    m_scriptState.isInternalAutoref = internalAutoref;
    m_scriptState.isDebugEnabled = type == StrategyType::AUTOREF;
    m_scriptState.isRunningInLogplayer = isLogplayer;
    m_scriptState.pathInputSaver = pathInputSaver;

    // used to delay processing until all status packets are processed
    m_idleTimer = new QTimer(this);
    m_idleTimer->setSingleShot(true);
    m_idleTimer->setInterval(0);
    connect(m_idleTimer, SIGNAL(timeout()), SLOT(process()));

    // delay automatic reload for 100 ms
    m_reloadTimer = new QTimer(this);
    m_reloadTimer->setSingleShot(true);
    m_reloadTimer->setInterval(100);
    connect(m_reloadTimer, SIGNAL(timeout()), SLOT(reload()));

    // initialize geometry
    geometrySetDefault(&m_geometry);
    m_geometryString = m_geometry.SerializeAsString();

    robotSetDefault(&m_anyRobotSpec);
}

Strategy::~Strategy()
{
    delete m_strategy;
    delete m_p;
}

void Strategy::handleStatus(const Status &status)
{
    emit startReadingStatus();
    if (status->has_geometry()) {
        const std::string str = status->geometry().SerializeAsString();
        // reload only if geometry has changed

        if (str != m_geometryString) {
            m_geometryString = str;
            m_geometry = status->geometry();
            reload();
        }
    }

    // copy team from status
    if (status->has_team_blue()) {
        updateTeam(status->team_blue(), StrategyType::BLUE, true);
    }
    if (status->has_team_yellow()) {
        updateTeam(status->team_yellow(), StrategyType::YELLOW, true);
    }

    if (!m_isEnabled) {
        return;
    }


    if (status->has_amun_state() && status->amun_state().options_size() > 0) {
        QStringList options;
        for (const auto &option : status->amun_state().options()) {
            if (option.value() == true) {
                options.append(QString::fromStdString(option.name()));
            }
        }
        options.sort();
        if (m_scriptState.selectedOptions != options) {
            m_scriptState.selectedOptions = options;
            reload();
        }
    }

    if (!m_scriptState.isRunningInLogplayer) {
        if (status->has_world_state() && status->has_game_state()) {
            m_scriptState.currentStatus = status;

            // This timer delays execution of the entrypoint (executeScript) until all currently
            // pending messages in the event loop have been processed.
            // Instead of processing each tracking packet, only the most recent one
            // will be used.
            // guarantees that the tracking packet used by the strategy is at most 10 ms old
            m_idleTimer->start();
        }
    } else {
        if ((status->has_blue_running() && status->blue_running() && m_type == StrategyType::BLUE)
                || (status->has_yellow_running() && status->yellow_running() && m_type == StrategyType::YELLOW)) {
            m_idleTimer->stop();
            if (!m_scriptState.isReplay) {
                reload();
            }

            m_scriptState.isReplay = true;
            m_scriptState.currentStatus = status;
            process();
        }
        if (!m_scriptState.isReplay && status->time() >= m_lastReplayTime + 10000000 &&
                status->has_world_state() && status->has_game_state()) {
            m_lastReplayTime = status->time();
            m_scriptState.currentStatus = status;
            process();
        }
    }
}

void Strategy::handleCommand(const Command &command)
{
    const amun::CommandStrategy *cmd = nullptr;

    // get commands for own team color
    if (m_scriptState.isRunningInLogplayer) {
        if (command->has_replay()) {
            const auto &replay = command->replay();
            if (m_type == StrategyType::BLUE && replay.has_blue_strategy()) {
                cmd = &replay.blue_strategy();
            } else if (m_type == StrategyType::YELLOW && replay.has_yellow_strategy()) {
                cmd = &replay.yellow_strategy();
            }
            if (m_type == StrategyType::BLUE && replay.has_enable_blue_strategy()) {
                m_isEnabled = replay.enable_blue_strategy();
            } else if (m_type == StrategyType::YELLOW && replay.has_enable_yellow_strategy()) {
                m_isEnabled = replay.enable_yellow_strategy();
            }
        }
    } else {
        if (m_type == StrategyType::BLUE && command->has_strategy_blue()) {
            cmd = &command->strategy_blue();
        } else if (m_type == StrategyType::YELLOW && command->has_strategy_yellow()) {
            cmd = &command->strategy_yellow();
        } else if (m_type == StrategyType::AUTOREF && command->has_strategy_autoref()) {
            cmd = &command->strategy_autoref();
        }
    }

    if (m_type == StrategyType::BLUE) {
        m_lastMoveCommand.mutable_move_command()->CopyFrom(command->robot_move_blue());
    } else if (m_type == StrategyType::YELLOW) {
        m_lastMoveCommand.mutable_move_command()->CopyFrom(command->robot_move_yellow());
    }

    bool reloadStrategy = false;

    // update team robots, but only if something has changed
    if (command->has_set_team_blue()) {
        reloadStrategy |= updateTeam(command->set_team_blue(), StrategyType::BLUE, false);
    }
    if (command->has_set_team_yellow()) {
        reloadStrategy |= updateTeam(command->set_team_yellow(), StrategyType::YELLOW, false);
    }
    // autoref has no robots

    if (cmd) {
        if (cmd->has_enable_debug()) {
            // only reload on change
            if (m_scriptState.isDebugEnabled != cmd->enable_debug()) {
                m_scriptState.isDebugEnabled = cmd->enable_debug();
                reloadStrategy = true;
            }
        }

        if (cmd->has_auto_reload()) {
            m_autoReload = cmd->auto_reload();
            // trigger reload if strategy has already crashed
            if (m_autoReload && m_strategyFailed) {
                reloadStrategy = true;
            }
        }

        if (cmd->reload()) {
            reloadStrategy = true;
        }

        if (cmd->has_performance_mode()) {
            if (m_scriptState.isPerformanceMode != cmd->performance_mode()) {
                m_scriptState.isPerformanceMode = cmd->performance_mode();
                reloadStrategy = true;
            }
        }

        if (cmd->has_tournament_mode() && m_scriptState.isTournamentMode != cmd->tournament_mode()) {
            m_scriptState.isTournamentMode = cmd->tournament_mode();
            reloadStrategy = true;
        }

        if (cmd->has_load()) {
            const QString filename = QString::fromStdString(cmd->load().filename());
            QString entryPoint;
            if (cmd->load().has_entry_point()) {
                entryPoint = QString::fromStdString(cmd->load().entry_point());
            }
            loadScript(filename, entryPoint);
            reloadStrategy = false; // already reloaded
        }

        if (cmd->has_close()) {
            close();
            reloadStrategy = false; // no strategy to reload
        }

        if (cmd->has_debug()) {
            triggerDebugger();
        }

        if (cmd->has_start_profiling() && m_strategy) {
            m_strategy->startProfiling();
        }

        if (cmd->has_finish_and_save_profile() && m_strategy) {
            m_strategy->endProfiling(cmd->finish_and_save_profile());
        }
    }

    if (command->has_mixed_team_destination()) {
        m_p->mixedTeamHost = QHostAddress(QString::fromStdString(command->mixed_team_destination().host()));
        m_p->mixedTeamPort = command->mixed_team_destination().port();
    }

    if (reloadStrategy && m_strategy) {
        reload();
    }
}

bool Strategy::updateTeam(const robot::Team &team, StrategyType teamType, bool isReplayTeam)
{
    if (team.robot_size() > 0) {
        m_anyRobotSpec.CopyFrom(team.robot(0));
    }
    if ((!m_scriptState.isRunningInLogplayer || team.robot_size() != 0)
            && (!m_scriptState.isRunningInLogplayer || isReplayTeam)
            && m_type == teamType
            && team.SerializeAsString() != m_team.SerializeAsString()) {
        m_team.CopyFrom(team);
        return true;
    }
    return false;
}

void Strategy::createDummyTeam()
{
    // when replaying a game that we played, there will always be robot specs for some team, so m_anyRobotSpec will be written properly
    m_team.clear_robot();
    for (unsigned int i = 0;i<22;i++) {
        robot::Specs * robot = m_team.add_robot();
        robot->CopyFrom(m_anyRobotSpec);
        robot->set_id(i);
    }
}

void Strategy::sendMixedTeamInfo(const QByteArray &data)
{
    m_p->mixedTeamData = data;
}

world::State Strategy::assembleWorldState()
{
    // assemble world state for this strategy
    // depending on the strategy type, the tracking with or without trajectory information is used for robots
    world::State worldState;
    if (m_scriptState.currentStatus->execution_state().IsInitialized()) {
        worldState = m_scriptState.currentStatus->execution_state();
    } else {
        worldState = m_scriptState.currentStatus->world_state();
        if (m_type != StrategyType::YELLOW && worldState.simple_tracking_yellow_size() > 0) {
            worldState.clear_yellow();
            worldState.mutable_yellow()->CopyFrom(worldState.simple_tracking_yellow());
        }
        if (m_type != StrategyType::BLUE && worldState.simple_tracking_blue_size() > 0) {
            worldState.clear_blue();
            worldState.mutable_blue()->CopyFrom(worldState.simple_tracking_blue());
        }
        if (m_type == StrategyType::AUTOREF && worldState.has_simple_tracking_ball()) {
            worldState.mutable_ball()->CopyFrom(worldState.simple_tracking_ball());
        }
    }
    return worldState;
}

void Strategy::tryProcess()
{
    if (!m_scriptState.currentStatus.isNull() && m_scriptState.currentStatus->game_state().IsInitialized()
            && m_scriptState.currentStatus->world_state().IsInitialized()) {
        process();
    }
}

static void addTimingInfos(Status& s, double pathPlanning, double totalTime, StrategyType type) {
    // publish timings and debug output
    amun::Timing *timing = s->mutable_timing();
    if (type == StrategyType::BLUE) {
        timing->set_blue_total(totalTime);
        timing->set_blue_path(pathPlanning);
        s->set_blue_running(true);
    } else if (type == StrategyType::YELLOW) {
        timing->set_yellow_total(totalTime);
        timing->set_yellow_path(pathPlanning);
        s->set_yellow_running(true);
    } else if (type == StrategyType::AUTOREF) {
        timing->set_autoref_total(totalTime);
        s->set_autoref_running(true);
    }
}

void Strategy::process()
{
    if (!m_strategy || m_strategyFailed) {
        return;
    }

    // create a dummy team with 22 robots if replaying with no team information
    if ((m_scriptState.isRunningInLogplayer || m_scriptState.isReplay) && m_team.robot_size() == 0) {
        createDummyTeam();
        reload();
    }

    Q_ASSERT(m_scriptState.currentStatus->game_state().IsInitialized()
            || m_scriptState.currentStatus->execution_game_state().IsInitialized());
    Q_ASSERT(m_scriptState.currentStatus->world_state().IsInitialized()
            || m_scriptState.currentStatus->execution_state().IsInitialized());

    double pathPlanning = 0;
    qint64 startTime = Timer::systemTime();

    amun::UserInput userInput;
    if (m_scriptState.currentStatus->has_execution_user_input()) {
        userInput.CopyFrom(m_scriptState.currentStatus->execution_user_input());
    } else {
        if (m_type == StrategyType::BLUE) {
            userInput.CopyFrom(m_scriptState.currentStatus->user_input_blue());
        } else if (m_type == StrategyType::YELLOW) {
            userInput.CopyFrom(m_scriptState.currentStatus->user_input_yellow());
        }
        // autoref has no user input
        userInput.mutable_move_command()->CopyFrom(m_lastMoveCommand.move_command());
    }

    // assemble world state for this strategy
    // depending on the strategy type, the tracking with or without trajectory information is used for robots
    world::State worldState = assembleWorldState();

    const auto &usedGameState = m_scriptState.currentStatus->execution_game_state().IsInitialized()
            ? m_scriptState.currentStatus->execution_game_state()
            : m_scriptState.currentStatus->game_state();

    if (usedGameState.has_goals_flipped()) {
        m_scriptState.isFlipped = usedGameState.goals_flipped();
    }

    if (m_strategy->process(pathPlanning, worldState, usedGameState, userInput)) {
        if (!m_p->mixedTeamData.isNull()) {
            int bytesSent = m_udpSenderSocket->writeDatagram(m_p->mixedTeamData, m_p->mixedTeamHost, m_p->mixedTeamPort);
            int origSize = m_p->mixedTeamData.size();
            m_p->mixedTeamData = QByteArray();

            if (bytesSent != origSize) {
                fail("Failed to send mixed team info");
                return;
            }
        }

        double totalTime = (Timer::systemTime() - startTime) * 1E-9;

        // publish timings and debug output
        Status status = takeStrategyDebugStatus();
        addTimingInfos(status, pathPlanning, totalTime, m_type);
        status->mutable_execution_state()->CopyFrom(worldState);
        status->mutable_execution_state()->clear_vision_frames();
        status->mutable_execution_game_state()->CopyFrom(m_scriptState.currentStatus->execution_game_state().IsInitialized()
                                                            ? m_scriptState.currentStatus->execution_game_state()
                                                            : m_scriptState.currentStatus->game_state());
        status->mutable_execution_user_input()->CopyFrom(userInput);
        emit sendStatus(status);
    } else {
        double totalTime = (Timer::systemTime() - startTime) * 1E-9;
        fail(m_strategy->errorMsg(), userInput, pathPlanning, totalTime);
    }
}

void Strategy::setFlipped(bool flipped)
{
    m_scriptState.isFlipped = flipped;
}

void Strategy::reload()
{
    if (!m_filename.isNull()) {
        loadScript(m_filename, m_entryPoint);
    }
}

void Strategy::sendCommand(const Command &command)
{
    if (m_scriptState.isDebugEnabled) {
        emit gotCommand(command);
    } else {
        fail("sendCommand is only allowed in debug mode!");
    }
}

void Strategy::compileIfNecessary(const QString &initFile)
{
    loadScript(initFile, "", false);
    m_strategy->compileIfNecessary();
}

void Strategy::loadStateChanged(amun::StatusStrategy::STATE state)
{
    if (state == amun::StatusStrategy::FAILED) {
        fail(m_strategy->errorMsg());
        return;
    }

    if (state == amun::StatusStrategy::RUNNING) {
        m_strategyFailed = false;
    }

    m_entryPoint = m_strategy->entryPoint(); // remember loaded entrypoint

    // prepare strategy status message
    Status status = takeStrategyDebugStatus();
    setStrategyStatus(status, state);

    // inform about successful load
    amun::StatusLog *log;
    if (status->debug_size() > 0) {
        Q_ASSERT(status->debug_size() == 1);
        //TODO: This assumes that there is at most one debug in this status
        log = status->mutable_debug(0)->add_log();
    } else {
        auto *debug = status->add_debug();
        debug->set_source(debugSource());
        log = debug->add_log();
    }
    log->set_timestamp(m_timer->currentTime());
    if (state == amun::StatusStrategy::COMPILING) {
        log->set_text(QString("<font color=\"teal\">Started compiling %1</font>").arg(m_filename).toStdString());
    } else if (state == amun::StatusStrategy::RUNNING) {
        log->set_text(QString("<font color=\"darkgreen\">Successfully loaded %1 with entry point %2!</font>").arg(m_filename, m_entryPoint).toStdString());
    }

    emit sendStatus(status);
}

void Strategy::loadScript(const QString &filename, const QString &entryPoint, bool loadUnderlying)
{
    Q_ASSERT(m_geometry.IsInitialized());
    Q_ASSERT(m_team.IsInitialized());

    if (m_type == StrategyType::BLUE || m_type == StrategyType::YELLOW) {
        emit sendHalt(m_type == StrategyType::BLUE);
    }

    m_reloadTimer->stop();

    m_filename = filename;

    bool createNewStrategy = !m_strategy || !m_strategy->canReloadInPlace() || !m_strategy->canHandleDynamic(filename);
    if (createNewStrategy) {
        // use a fresh strategy instance when strategy is started
        delete m_strategy;
        m_strategy = nullptr;

        // hardcoded factory pattern
        if (Lua::canHandle(filename)) {
            m_strategy = new Lua(m_timer, m_type, m_scriptState, m_scriptState.isDebugEnabled);
            // insert m_debugStatus into m_strategy
            takeStrategyDebugStatus();
#ifdef V8_FOUND
        } else if (Typescript::canHandle(filename)) {
            Typescript *t = new Typescript(m_timer, m_type, m_scriptState, m_compilerRegistry);
            m_strategy = t;
            // insert m_debugStatus into m_strategy
            // this has to happen before newDebuggagleStrategy is called
            takeStrategyDebugStatus();
#endif
        } else {
            fail(QString("No strategy handler for file %1").arg(filename));
            return;
        }
        connect(m_strategy, &AbstractStrategyScript::recordGitDiff, this, &Strategy::requestGitRecording);
    }

    if (m_scriptState.isDebugEnabled && m_scriptState.debugHelper) {
        m_scriptState.debugHelper->enableQueue();
    }
    m_strategyFailed = true;
    m_strategy->setGameControllerConnection(m_gameControllerConnection);

    if (createNewStrategy) {
        // delay reload until strategy is no longer running
        connect(m_strategy, SIGNAL(requestReload()), SLOT(reload()), Qt::QueuedConnection);
        // forward immediately
        connect(m_strategy, SIGNAL(sendStrategyCommands(bool,QList<RobotCommandInfo>,qint64)),
                SIGNAL(sendStrategyCommands(bool,QList<RobotCommandInfo>,qint64)));
        connect(m_strategy, SIGNAL(gotCommand(Command)), SLOT(sendCommand(Command)));
        connect(m_strategy, SIGNAL(sendMixedTeamInfo(QByteArray)), SLOT(sendMixedTeamInfo(QByteArray)));
        connect(m_strategy, &AbstractStrategyScript::changeLoadState, this, &Strategy::loadStateChanged);
    }

    m_strategy->loadScript(filename, entryPoint, m_geometry, m_team, loadUnderlying);
}

void Strategy::close()
{
    m_reloadTimer->stop();
    if (m_type == StrategyType::BLUE || m_type == StrategyType::YELLOW) {
        emit sendHalt(m_type == StrategyType::BLUE);
    }

    delete m_strategy;
    m_strategy = nullptr;

    m_filename.clear();

    Status status(new amun::Status);
    setStrategyStatus(status, amun::StatusStrategy::CLOSED);
    // clear debug output
    status->add_debug()->set_source(debugSource());

    emit sendStatus(status);
}

void Strategy::triggerDebugger()
{
    if (!m_strategy->triggerDebugger()) {
        fail("Failed to activate the debugger: " + m_strategy->errorMsg());
    }
}

void Strategy::fail(const QString &error, const amun::UserInput & userInput, double pathPlanning, double totalTime)
{
    if (m_type == StrategyType::BLUE || m_type == StrategyType::YELLOW) {
        emit sendHalt(m_type == StrategyType::BLUE);
    }

    // update status
    Status status = takeStrategyDebugStatus();
    addTimingInfos(status, pathPlanning, totalTime, m_type);
    setStrategyStatus(status, amun::StatusStrategy::FAILED);
    if (!m_scriptState.currentStatus.isNull()) {
        status->mutable_execution_game_state()->CopyFrom(m_scriptState.currentStatus->game_state());
        status->mutable_execution_state()->CopyFrom(assembleWorldState());
        status->mutable_execution_user_input()->CopyFrom(userInput);
    }

    // log error
    amun::StatusLog *log;
    if (status->debug_size() > 0) {
        Q_ASSERT(status->debug_size() == 1);
        //TODO: This assumes that there is at most one debug in this status
        log = status->mutable_debug(0)->add_log();
    } else {
        auto *debug = status->add_debug();
        debug->set_source(debugSource());
        log = debug->add_log();
    }
    log->set_timestamp(m_timer->currentTime());
    log->set_text(error.toStdString());

    emit sendStatus(status);

    // log errors to disk
    QFile errorLog("error.html");
    if (errorLog.open(QIODevice::Append | QIODevice::WriteOnly)) {
        errorLog.write(QString("<h4>Time: %1</h4>").arg(QDateTime::currentDateTime().toString()).toUtf8());
        errorLog.write(error.toUtf8());
        errorLog.write("<br /><br />");
        errorLog.close();
    }

    // keep strategy as we can't use reload on file modification otherwise
    m_strategyFailed = true;

    if (m_autoReload) {
        m_reloadTimer->start();
    }
}

void Strategy::setStrategyStatus(Status &status, amun::StatusStrategy::STATE state)
{
    Q_ASSERT(m_strategy != nullptr || state != amun::StatusStrategy::RUNNING);

    amun::StatusStrategy *strategy = status->mutable_status_strategy()->mutable_status();
    amun::StatusStrategyWrapper::StrategyType type = amun::StatusStrategyWrapper::BLUE;
    switch (m_type) {
    case StrategyType::BLUE:
        type = m_scriptState.isRunningInLogplayer ? amun::StatusStrategyWrapper::REPLAY_BLUE : amun::StatusStrategyWrapper::BLUE;
        break;
    case StrategyType::YELLOW:
        type = m_scriptState.isRunningInLogplayer ? amun::StatusStrategyWrapper::REPLAY_YELLOW : amun::StatusStrategyWrapper::YELLOW;
        break;
    case StrategyType::AUTOREF:
        type = amun::StatusStrategyWrapper::AUTOREF;
        break;
    }
    status->mutable_status_strategy()->set_type(type);
    strategy->set_state(state);

    if (m_strategy != nullptr && state != amun::StatusStrategy::CLOSED) {
        strategy->set_filename(m_filename.toStdString());
        strategy->set_name(m_strategy->name().toStdString());
        // copy entrypoints
        foreach (const QString name, m_strategy->entryPoints()) {
            std::string *ep = strategy->add_entry_point();
            *ep = name.toStdString();
        }
        strategy->set_current_entry_point(m_strategy->entryPoint().toStdString());

        QVector<QPair<std::string, bool>> options;
        options.push_back({ SAVE_PATHFINDING_INPUT_ALL, false });
        options.push_back({ SAVE_PATHFINDING_INPUT_STANDARDSAMPLER, false });
        options.push_back({ SAVE_PATHFINDING_INPUT_ENDINOBSTACLE, false });
        options.push_back({ SAVE_PATHFINDING_INPUT_ESCAPEOBSTACLE, false });
        const QMap<QString, bool> &strategyOptions = m_strategy->options();
        for (const QString &option: m_strategy->options().keys()) {
            options.push_back({ option.toStdString(), strategyOptions[option] });
        }
        for (const auto &option : options) {
            auto *opt = strategy->add_options();
            opt->set_name(option.first);
            opt->set_default_value(option.second);
        }

        if (m_strategy->hasDebugger()) {
            strategy->set_has_debugger(true);
        }
    }

    m_currentState = state;
}

Status Strategy::takeStrategyDebugStatus()
{
    if (m_strategy == nullptr) {
        return Status(new amun::Status);
    }
    Status status = Status::createArena();
    amun::DebugValues* debugValues = m_strategy->setDebugValues(status->add_debug());
    Status out = m_debugStatus;
    m_debugStatus = status;
    if (!debugValues) {
        return Status(new amun::Status);
    }
    debugValues->set_source(debugSource());
    if (!m_scriptState.currentStatus.isNull()) {
        out->set_time(m_scriptState.currentStatus->time());
        debugValues->set_time(m_scriptState.currentStatus->execution_state().IsInitialized()
                ? m_scriptState.currentStatus->execution_state().time()
                : m_scriptState.currentStatus->world_state().time());
    }
    return out;
}

amun::DebugSource Strategy::debugSource() const
{
    if (m_scriptState.isRunningInLogplayer && m_type == StrategyType::BLUE) {
        return amun::ReplayBlue;
    } else if (m_scriptState.isRunningInLogplayer && m_type == StrategyType::YELLOW) {
        return amun::ReplayYellow;
    }
    switch (m_type) {
    case StrategyType::BLUE:
        return amun::StrategyBlue;
    case StrategyType::YELLOW:
        return amun::StrategyYellow;
    case StrategyType::AUTOREF:
        return amun::Autoref;
    }
    qFatal("Internal error");
}

void Strategy::requestGitRecording(const QString& dir, bool changed) {
    emit recordGitDiff(dir, changed, static_cast<int>(m_type));
}
