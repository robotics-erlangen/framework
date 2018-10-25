/***************************************************************************
 *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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

#include "lua.h"
#include "debughelper.h"
#include "strategy.h"
#include "core/timer.h"
#include "protobuf/geometry.h"
#include "protobuf/robot.h"
#include <QCoreApplication>
#include <QDateTime>
#include <QFileInfo>
#include <QHostAddress>
#include <QTcpSocket>
#include <QTimer>
#include <QUdpSocket>
#include <QtEndian>

#ifdef V8_FOUND
#include "typescript.h"
#include "inspectorserver.h"
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

    QHostAddress remoteControlHost;
    quint16 remoteControlPort;
    QByteArray remoteControlData;
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
Strategy::Strategy(const Timer *timer, StrategyType type, DebugHelper *helper, bool internalAutoref, bool isLogplayer) :
    m_p(new StrategyPrivate),
    m_timer(timer),
    m_strategy(nullptr),
    m_type(type),
    m_debugEnabled(type == StrategyType::AUTOREF),
    m_refboxControlEnabled(false),
    m_autoReload(false),
    m_strategyFailed(false),
    m_isEnabled(true),
    m_isReplay(false),
    m_debugHelper(helper),
    m_isInternalAutoref(internalAutoref),
    m_isPerformanceMode(true),
    m_isFlipped(false),
    m_refboxReplyLength(-1),
    m_isInLogplayer(isLogplayer)
{
    initV8();

#ifdef V8_FOUND
    int inspectorPort;
    switch (m_type) {
    case StrategyType::BLUE:
        inspectorPort = 3415;
        break;
    case StrategyType::YELLOW:
        inspectorPort = 3416;
        break;
    case StrategyType::AUTOREF:
        inspectorPort = 3417;
        break;
    }
    m_inspectorServer = std::unique_ptr<InspectorServer>(new InspectorServer(inspectorPort, this));
#endif

    m_udpSenderSocket = new QUdpSocket(this);
    m_refboxSocket = new QTcpSocket(this);
    m_refboxSocket->setSocketOption(QAbstractSocket::LowDelayOption,1);

    m_p->remoteControlHost = QHostAddress("localhost");
    m_p->remoteControlPort = 10007;

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

    if (!m_isEnabled) {
        return;
    }

    if (status->has_world_state() && status->has_game_state() && !m_isReplay) {
        m_status = status;

        // This timer delays execution of the entrypoint (executeScript) until all currently
        // pending messages in the event loop have been processed.
        // Instead of processing each tracking packet, only the most recent one
        // will be used.
        // guarantees that the tracking packet used by the strategy is at most 10 ms old
        m_idleTimer->start();
    }
    if ((status->has_blue_running() && status->blue_running() && m_type == StrategyType::BLUE)
            || (status->has_yellow_running() && status->yellow_running() && m_type == StrategyType::YELLOW)) {
        m_idleTimer->stop();
        m_isReplay = true;
        if (m_strategy){
            m_strategy->setIsReplay(true);
        }
        m_status = status;
        process();
    }
}

void Strategy::handleCommand(const Command &command)
{
    const amun::CommandStrategy *cmd = NULL;

    // get commands for own team color
    if (m_type == StrategyType::BLUE && command->has_strategy_blue()) {
        cmd = &command->strategy_blue();
    } else if (m_type == StrategyType::YELLOW && command->has_strategy_yellow()) {
        cmd = &command->strategy_yellow();
    } else if (m_type == StrategyType::AUTOREF && command->has_strategy_autoref()) {
        cmd = &command->strategy_autoref();
    }

    if (m_type == StrategyType::BLUE) {
        m_lastMoveCommand.mutable_move_command()->CopyFrom(command->robot_move_blue());
    } else if (m_type == StrategyType::YELLOW) {
        m_lastMoveCommand.mutable_move_command()->CopyFrom(command->robot_move_yellow());
    }

    bool reloadStrategy = false;

    // update team robots, but only if something has changed
    if (command->has_set_team_blue()) {
        reloadStrategy |= updateTeam(command->set_team_blue(), StrategyType::BLUE);
    }
    if (command->has_set_team_yellow()) {
        reloadStrategy |= updateTeam(command->set_team_yellow(), StrategyType::YELLOW);
    }
    // autoref has no robots

    if (cmd) {
        if (cmd->has_enable_debug()) {
            // only reload on change
            if (m_debugEnabled != cmd->enable_debug()) {
                m_debugEnabled = cmd->enable_debug();
                reloadStrategy = true;
            }
        }

        if (cmd->has_enable_refbox_control()) {
            // only reload on change
            if (m_refboxControlEnabled != cmd->enable_refbox_control()) {
                m_refboxControlEnabled = cmd->enable_refbox_control();
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

        if (cmd->has_options()) {
            QStringList options;
            for (const std::string &str: cmd->options().option()) {
                options.append(QString::fromStdString(str));
            }
            options.sort();
            if (m_selectedOptions != options) {
                m_selectedOptions = options;
                reloadStrategy = true;
            }
        }

        if (cmd->has_performance_mode()) {
            if (m_isPerformanceMode != cmd->performance_mode()) {
                m_isPerformanceMode = cmd->performance_mode();
                reloadStrategy = true;
            }
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
    }

    if (command->has_mixed_team_destination()) {
        m_p->mixedTeamHost = QHostAddress(QString::fromStdString(command->mixed_team_destination().host()));
        m_p->mixedTeamPort = command->mixed_team_destination().port();
    }

    if (command->has_remote_control_port()) {
        m_p->remoteControlPort = command->remote_control_port();
    }

    if (reloadStrategy && m_strategy) {
        reload();
    }
}

bool Strategy::updateTeam(const robot::Team &team, StrategyType teamType)
{
    if (team.robot_size() > 0) {
        m_anyRobotSpec.CopyFrom(team.robot(0));
    }
    if ((team.robot_size() != 0 || !m_isReplay) && m_type == teamType && team.SerializeAsString() != m_team.SerializeAsString()) {
        m_team.CopyFrom(team);
        return true;
    }
    return false;
}

void Strategy::createDummyTeam()
{
    // when replaying a game that we played, there will always be robot specs for some team, so m_anyRobotSpec will be written properly
    m_team.clear_robot();
    for (int i = 0;i<16;i++) {
        robot::Specs * robot = m_team.add_robot();
        robot->CopyFrom(m_anyRobotSpec);
        robot->set_id(i);
    }
}

void Strategy::handleRefereeHost(QString hostName)
{
    QHostAddress newAddress(hostName);
    if (newAddress != m_p->remoteControlHost) {
        m_p->remoteControlHost = hostName;
        m_refboxSocket->close();
    }
}

void Strategy::sendMixedTeamInfo(const QByteArray &data)
{
    m_p->mixedTeamData = data;
}

void Strategy::sendNetworkRefereeCommand(const QByteArray &data)
{
    m_p->remoteControlData = data;
}

void Strategy::process()
{
    if (!m_strategy || m_strategyFailed) {
        return;
    }

    // create a dummy team with 16 robots if replaying with no team information
    if ((m_isInLogplayer || m_isReplay) && m_team.robot_size() == 0) {
        createDummyTeam();
        reload();
    }

    Q_ASSERT(m_status->game_state().IsInitialized() || m_status->execution_state().IsInitialized());
    Q_ASSERT(m_status->world_state().IsInitialized() || m_status->execution_game_state().IsInitialized());

    double pathPlanning = 0;
    qint64 startTime = Timer::systemTime();

    amun::UserInput userInput;
    if (m_status->has_execution_user_input()) {
        userInput.CopyFrom(m_status->execution_user_input());
    } else {
        if (m_type == StrategyType::BLUE) {
            userInput.CopyFrom(m_status->user_input_blue());
        } else if (m_type == StrategyType::YELLOW) {
            userInput.CopyFrom(m_status->user_input_yellow());
        }
        // autoref has no user input
        userInput.mutable_move_command()->CopyFrom(m_lastMoveCommand.move_command());
    }

    if (m_strategy->process(pathPlanning, m_status->execution_state().IsInitialized() ? m_status->execution_state() : m_status->world_state(),
                            m_status->execution_game_state().IsInitialized() ? m_status->execution_game_state() : m_status->game_state(), userInput)) {
        if (!m_p->mixedTeamData.isNull()) {
            int bytesSent = m_udpSenderSocket->writeDatagram(m_p->mixedTeamData, m_p->mixedTeamHost, m_p->mixedTeamPort);
            int origSize = m_p->mixedTeamData.size();
            m_p->mixedTeamData = QByteArray();

            if (bytesSent != origSize) {
                fail("Failed to send mixed team info");
                return;
            }
        }

        if (!m_p->remoteControlData.isNull()) {
            if (m_refboxSocket->state() != QAbstractSocket::ConnectedState) {
                m_refboxSocket->connectToHost(m_p->remoteControlHost, m_p->remoteControlPort);
                if (!m_refboxSocket->waitForConnected(1000)) {
                    m_p->remoteControlData = QByteArray(); // reset
                    fail("Failed to connect to refbox");
                    return;
                }
            }
            int origSize = m_p->remoteControlData.size();
            int bytesSent = m_refboxSocket->write(m_p->remoteControlData, origSize);

            m_p->remoteControlData = QByteArray(); // reset
            if (bytesSent != origSize) {
                fail("Failed to send referee command over network");
                return;
            }
        }
        if (m_refboxSocket->state() == QAbstractSocket::ConnectedState) {
            handleRefboxReply(m_refboxSocket->readAll());
        }

        double totalTime = (Timer::systemTime() - startTime) / 1E9;

        // publish timings and debug output
        Status status = takeStrategyDebugStatus();
        amun::Timing *timing = status->mutable_timing();
        if (m_type == StrategyType::BLUE) {
            timing->set_blue_total(totalTime);
            timing->set_blue_path(pathPlanning);
            status->set_blue_running(true);
        } else if (m_type == StrategyType::YELLOW) {
            timing->set_yellow_total(totalTime);
            timing->set_yellow_path(pathPlanning);
            status->set_yellow_running(true);
        } else if (m_type == StrategyType::AUTOREF) {
            timing->set_autoref_total(totalTime);
            status->set_autoref_running(true);
        }
        status->mutable_execution_state()->CopyFrom(m_status->execution_state().IsInitialized() ?
                                                        m_status->execution_state() : m_status->world_state());
        status->mutable_execution_state()->clear_vision_frames();
        status->mutable_execution_game_state()->CopyFrom(m_status->execution_game_state().IsInitialized() ?
                                                             m_status->execution_game_state() : m_status->game_state());
        status->mutable_execution_user_input()->CopyFrom(userInput);
        emit sendStatus(status);
    } else {
        fail(m_strategy->errorMsg(), userInput);
    }
}

void Strategy::handleRefboxReply(const QByteArray &data)
{
    m_refboxReplyPartialPacket.append(data);
    if (m_refboxReplyLength == -1 && m_refboxReplyPartialPacket.size() >= 4) {
        m_refboxReplyLength = qFromBigEndian<qint32>((unsigned char*)m_refboxReplyPartialPacket.data());
        m_refboxReplyPartialPacket.remove(0, 4);
    }
    if (m_refboxReplyLength != -1 && m_refboxReplyPartialPacket.size() >= m_refboxReplyLength) {
        SSL_RefereeRemoteControlReply  packet;
        if (packet.ParseFromArray(m_refboxReplyPartialPacket.data(), m_refboxReplyLength)) {
            if (m_strategy) {
                m_strategy->addRefereeReply(packet);
            }
        }
        m_refboxReplyPartialPacket.remove(0, m_refboxReplyLength);
        m_refboxReplyLength = -1;
    }
}

void Strategy::setFlipped(bool flipped)
{
    m_isFlipped = flipped;
    if (m_strategy) {
        m_strategy->setFlipped(flipped);
    }
}

void Strategy::reload()
{
    if (!m_filename.isNull()) {
        loadScript(m_filename, m_entryPoint);
    }
}

void Strategy::sendCommand(const Command &command)
{
    if (m_debugEnabled) {
        emit gotCommand(command);
    } else {
        fail("sendCommand is only allowed in debug mode!");
    }
}

void Strategy::loadScript(const QString &filename, const QString &entryPoint)
{
    Q_ASSERT(m_geometry.IsInitialized());
    Q_ASSERT(m_team.IsInitialized());

    m_reloadTimer->stop();
    // use a fresh strategy instance when strategy is started
    delete m_strategy;
    m_strategy = NULL;
    m_strategyFailed = false;

    m_filename = filename;

    // hardcoded factory pattern
    if (Lua::canHandle(filename)) {
        m_strategy = new Lua(m_timer, m_type, m_debugEnabled, m_refboxControlEnabled);
#ifdef V8_FOUND
    } else if (Typescript::canHandle(filename)) {
        m_inspectorServer->clearHandlers();
        Typescript *t = new Typescript(m_timer, m_type, m_debugEnabled, m_refboxControlEnabled);
        m_strategy = t;
        if (m_debugEnabled) {
            m_inspectorServer->newDebuggagleStrategy(t);
        }
#endif
    } else {
        fail(QString("No strategy handler for file %1").arg(filename));
        return;
    }

    if (m_debugEnabled && m_debugHelper) {
        m_strategy->setDebugHelper(m_debugHelper);
        // the debug helper doesn't know the exact moment when the strategy gets reloaded
        m_debugHelper->enableQueue();
    }
    m_strategy->setIsInternalAutoref(m_isInternalAutoref);
    m_strategy->setIsPerformanceMode(m_isPerformanceMode);
    m_strategy->setIsReplay(m_isReplay);
    m_strategy->setFlipped(m_isFlipped);

    // delay reload until strategy is no longer running
    connect(m_strategy, SIGNAL(requestReload()), SLOT(reload()), Qt::QueuedConnection);
    // forward immediately
    connect(m_strategy, SIGNAL(sendStrategyCommand(bool,unsigned int,unsigned int,RobotCommand,qint64)),
            SIGNAL(sendStrategyCommand(bool,unsigned int,unsigned int,RobotCommand,qint64)));
    connect(m_strategy, SIGNAL(gotCommand(Command)), SLOT(sendCommand(Command)));
    connect(m_strategy, SIGNAL(sendMixedTeamInfo(QByteArray)), SLOT(sendMixedTeamInfo(QByteArray)));
    connect(m_strategy, SIGNAL(sendNetworkRefereeCommand(QByteArray)), SLOT(sendNetworkRefereeCommand(QByteArray)));

    if (m_strategy->loadScript(filename, entryPoint, m_geometry, m_team)) {
        m_entryPoint = m_strategy->entryPoint(); // remember loaded entrypoint
        m_strategy->setSelectedOptions(m_selectedOptions);

        // prepare strategy status message
        Status status = takeStrategyDebugStatus();
        setStrategyStatus(status, amun::StatusStrategy::RUNNING);

        // inform about successful load
        amun::StatusLog *log = status->mutable_debug()->add_log();
        log->set_timestamp(m_timer->currentTime());
        log->set_text(QString("<font color=\"darkgreen\">Successfully loaded %1 with entry point %2!</font>").arg(m_filename, m_entryPoint).toStdString());

        emit sendStatus(status);
    } else {
        fail(m_strategy->errorMsg());
    }
}

void Strategy::close()
{
    m_reloadTimer->stop();
    if (m_type == StrategyType::BLUE || m_type == StrategyType::YELLOW) {
        emit sendHalt(m_type == StrategyType::BLUE);
    }

    delete m_strategy;
    m_strategy = NULL;

    Status status(new amun::Status);
    setStrategyStatus(status, amun::StatusStrategy::CLOSED);
    // clear debug output
    status->mutable_debug()->set_source(debugSource());

    emit sendStatus(status);
}

void Strategy::triggerDebugger()
{
    if (!m_strategy->triggerDebugger()) {
        fail("Failed to activate the debugger: " + m_strategy->errorMsg());
    }
}

void Strategy::fail(const QString &error, const amun::UserInput & userInput)
{
    if (m_type == StrategyType::BLUE || m_type == StrategyType::YELLOW) {
        emit sendHalt(m_type == StrategyType::BLUE);
    }

    // update status
    Status status = takeStrategyDebugStatus();
    setStrategyStatus(status, amun::StatusStrategy::FAILED);
    if (!m_status.isNull()) {
        status->mutable_execution_game_state()->CopyFrom(m_status->game_state());
        status->mutable_execution_state()->CopyFrom(m_status->world_state());
        status->mutable_execution_user_input()->CopyFrom(userInput);
    }

    // log error
    amun::StatusLog *log = status->mutable_debug()->add_log();
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

    amun::StatusStrategy *strategy = (m_type == StrategyType::BLUE) ? status->mutable_strategy_blue() :
                                            (m_type == StrategyType::YELLOW) ? status->mutable_strategy_yellow() :
                                                    status->mutable_strategy_autoref();
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
        for (const QString &option: m_strategy->options()) {
            std::string *opt = strategy->add_option();
            *opt = option.toStdString();
        }
        if (m_strategy->hasDebugger()) {
            strategy->set_has_debugger(true);
        }
    }
}

Status Strategy::takeStrategyDebugStatus()
{
    if (m_strategy == nullptr) {
        return Status(new amun::Status);
    }
    Status status = m_strategy->takeDebugStatus();
    status->mutable_debug()->set_source(debugSource());
    if (!m_status.isNull()) {
        status->set_time(m_status->time());
        auto &worldState = m_status->execution_state().IsInitialized() ? m_status->execution_state() : m_status->world_state();
        status->mutable_debug()->set_time(worldState.time());
    }
    return status;
}

amun::DebugSource Strategy::debugSource() const
{
    if (m_isReplay && m_type == StrategyType::BLUE) {
        return amun::ReplayBlue;
    } else if (m_isReplay && m_type == StrategyType::YELLOW) {
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
