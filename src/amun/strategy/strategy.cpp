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
#include "strategy.h"
#include "core/timer.h"
#include "protobuf/geometry.h"
#include <QDateTime>
#include <QFileInfo>
#include <QHostAddress>
#include <QTcpSocket>
#include <QTimer>
#include <QUdpSocket>

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

    QHostAddress autorefEventHost;
    quint16 autorefEventPort;
    QByteArray autorefEventData;
};

/*!
 * \brief Creates a Strategy instance
 * Automatically reloads the strategy when the field geometry or team robots change
 * \param timer Timer to be used for time scaling
 * \param type can be blue or yellow team or autoref
 */
Strategy::Strategy(const Timer *timer, StrategyType type) :
    m_p(new StrategyPrivate),
    m_timer(timer),
    m_strategy(nullptr),
    m_type(type),
    m_debugEnabled(type == StrategyType::AUTOREF),
    m_refboxControlEnabled(false),
    m_autoReload(false),
    m_strategyFailed(false)
{
    m_udpSenderSocket = new QUdpSocket(this);
    m_refboxSocket = new QTcpSocket(this);
    m_refboxSocket->setSocketOption(QAbstractSocket::LowDelayOption,1);

    m_p->autorefEventHost = QHostAddress("224.5.23.1");
    m_p->autorefEventPort = 10008;

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
}

Strategy::~Strategy()
{
    delete m_strategy;
    delete m_p;
}

void Strategy::handleStatus(const Status &status)
{
    if (status->has_geometry()) {
        const std::string str = status->geometry().SerializeAsString();
        // reload only if geometry has changed
        if (str != m_geometryString) {
            m_geometryString = str;
            m_geometry = status->geometry();
            reload();
        }
    }

    if (status->has_world_state() && status->has_game_state()) {
        m_status = status;

        // This timer delays execution of the entrypoint (executeScript) until all currently
        // pending messages in the event loop have been processed.
        // Instead of processing each tracking packet, only the most recent one
        // will be used.
        // guarantees that the tracking packet used by the strategy is at most 10 ms old
        m_idleTimer->start();
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

    bool reloadStrategy = false;

    // update team robots, but only if something has changed
    if (m_type == StrategyType::BLUE && command->has_set_team_blue()) {
        if (command->set_team_blue().SerializeAsString() != m_team.SerializeAsString()) {
            m_team.CopyFrom(command->set_team_blue());
            reloadStrategy = true;
        }
    } else if (m_type == StrategyType::YELLOW && command->has_set_team_yellow()) {
        if (command->set_team_yellow().SerializeAsString() != m_team.SerializeAsString()) {
            m_team.CopyFrom(command->set_team_yellow());
            reloadStrategy = true;
        }
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

    if (reloadStrategy && m_strategy) {
        reload();
    }
}

void Strategy::sendMixedTeamInfo(const QByteArray &data)
{
    m_p->mixedTeamData = data;
}

void Strategy::sendNetworkRefereeCommand(const QByteArray &data)
{
    m_networkRefereeCommand = data;
}

void Strategy::sendAutorefEvent(const QByteArray &data)
{
    m_p->autorefEventData = data;
}

void Strategy::process()
{
    if (!m_strategy || m_strategyFailed) {
        return;
    }

    Q_ASSERT(m_status->game_state().IsInitialized());
    Q_ASSERT(m_status->world_state().IsInitialized());

    double pathPlanning = 0;
    qint64 startTime = Timer::systemTime();

    const amun::UserInput& userInput = (m_type == StrategyType::BLUE) ? m_status->user_input_blue() :
                                    ((m_type == StrategyType::YELLOW) ? m_status->user_input_yellow() :
                                            amun::UserInput());

    if (m_strategy->process(pathPlanning, m_status->world_state(), m_status->game_state(), userInput)) {
        if (!m_p->mixedTeamData.isNull()) {
            int bytesSent = m_udpSenderSocket->writeDatagram(m_p->mixedTeamData, m_p->mixedTeamHost, m_p->mixedTeamPort);
            int origSize = m_p->mixedTeamData.size();
            m_p->mixedTeamData = QByteArray();

            if (bytesSent != origSize) {
                fail("Failed to send mixed team info");
                return;
            }
        }

        if (!m_p->autorefEventData.isNull()) {
            int bytesSent = m_udpSenderSocket->writeDatagram(m_p->autorefEventData, m_p->autorefEventHost, m_p->autorefEventPort);
            int origSize = m_p->autorefEventData.size();
            m_p->autorefEventData = QByteArray();

            if (bytesSent != origSize) {
                fail("Failed to send autoref event");
                return;
            }
        }

        if (!m_networkRefereeCommand.isNull()) {
            if (m_refboxSocket->state() != QAbstractSocket::ConnectedState) {
                m_refboxSocket->connectToHost(QHostAddress::LocalHost, 10007);
                if (!m_refboxSocket->waitForConnected(1000)) {
                    m_networkRefereeCommand = QByteArray(); // reset
                    fail("Failed to connect to refbox");
                    return;
                }
            }
            int origSize = m_networkRefereeCommand.size();
            int bytesSent = m_refboxSocket->write(m_networkRefereeCommand, origSize);

            // discard responses, so they don't occupy ressources or block communication
            // RefereeStatus is currently enough feedback for the autoref
            m_refboxSocket->readAll();

            m_networkRefereeCommand = QByteArray(); // reset
            if (bytesSent != origSize) {
                fail("Failed to send referee command over network");
                return;
            }
        }

        double totalTime = (Timer::systemTime() - startTime) / 1E9;

        // publish timings and debug output
        Status status = takeStrategyDebugStatus();
        amun::Timing *timing = status->mutable_timing();
        if (m_type == StrategyType::BLUE) {
            timing->set_blue_total(totalTime);
            timing->set_blue_path(pathPlanning);
        } else if (m_type == StrategyType::YELLOW) {
            timing->set_yellow_total(totalTime);
            timing->set_yellow_path(pathPlanning);
        }
        emit sendStatus(status);
    } else {
        fail(m_strategy->errorMsg());
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
        m_strategy = Lua::createStrategy(m_timer, m_type, m_debugEnabled, m_refboxControlEnabled);
    } else {
        fail(QString("No strategy handler for file %1").arg(filename));
        return;
    }

    // delay reload until strategy is no longer running
    connect(m_strategy, SIGNAL(requestReload()), SLOT(reload()), Qt::QueuedConnection);
    // forward immediately
    connect(m_strategy, SIGNAL(sendStrategyCommand(bool,unsigned int,unsigned int,QByteArray,qint64)),
            SIGNAL(sendStrategyCommand(bool,unsigned int,unsigned int,QByteArray,qint64)));
    connect(m_strategy, SIGNAL(gotCommand(Command)), SLOT(sendCommand(Command)));
    connect(m_strategy, SIGNAL(sendMixedTeamInfo(QByteArray)), SLOT(sendMixedTeamInfo(QByteArray)));
    connect(m_strategy, SIGNAL(sendNetworkRefereeCommand(QByteArray)), SLOT(sendNetworkRefereeCommand(QByteArray)));
    connect(m_strategy, SIGNAL(sendAutorefEvent(QByteArray)), SLOT(sendAutorefEvent(QByteArray)));

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

void Strategy::fail(const QString &error)
{
    if (m_type == StrategyType::BLUE || m_type == StrategyType::YELLOW) {
        emit sendHalt(m_type == StrategyType::BLUE);
    }

    // update status
    Status status = takeStrategyDebugStatus();
    setStrategyStatus(status, amun::StatusStrategy::FAILED);

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
    Q_ASSERT(m_strategy != NULL || state == amun::StatusStrategy::CLOSED);

    amun::StatusStrategy *strategy = (m_type == StrategyType::BLUE) ? status->mutable_strategy_blue() :
                                            (m_type == StrategyType::YELLOW) ? status->mutable_strategy_yellow() :
                                                    status->mutable_strategy_autoref();
    strategy->set_state(state);

    if (state != amun::StatusStrategy::CLOSED) {
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
    Q_ASSERT(m_strategy != NULL);
    Status status = m_strategy->takeDebugStatus();
    status->mutable_debug()->set_source(debugSource());
    if (!m_status.isNull()) {
        status->mutable_debug()->set_time(m_status->world_state().time());
    }
    return status;
}

amun::DebugSource Strategy::debugSource() const
{
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
