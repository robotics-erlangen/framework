/***************************************************************************
 *   Copyright 2016 Michael Eischer, 2020 Andreas Wendler                  *
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

#include "connector.h"
#include "protobuf/command.pb.h"
#include "protobuf/gamestate.pb.h"
#include "protobuf/ssl_game_event_2019.pb.h"
#include "testtools.h"
#include "config/config.h"
#include "seshat/combinedlogwriter.h"
#include "core/timer.h"
#include "core/configuration.h"
#include "strategy/strategy.h"
#include "strategy/script/compilerregistry.h"

#include <google/protobuf/text_format.h>
#include <google/protobuf/util/message_differencer.h>
#include <QCoreApplication>
#include <QDir>
#include <QTimer>
#include <QSet>
#include <QTimer>
#include <QDateTime>
#include <QDebug>
#include <iostream>
#include <memory>
#include <array>

Connector::Connector(QObject *parent) :
    QObject(parent),
    m_backlogWriter(20)
{
    connect(this, SIGNAL(saveBacklogFile(QString, bool)), &m_backlogWriter, SLOT(saveBacklog(QString, bool)));
    connect(this, SIGNAL(backlogStatus(Status)), &m_backlogWriter, SLOT(handleStatus(Status)));
    connect(&m_backlogWriter, SIGNAL(finishedBacklogSave()), this, SLOT(continueAmun()));
    connect(&m_referee, SIGNAL(sendCommand(Command)), this, SIGNAL(sendCommand(Command)));
}

Connector::~Connector()
{
}

void Connector::compileStrategy(QCoreApplication &app, QString initScript)
{
    setIsInCompileMode(true);
    Timer timer;
    timer.setTime(0, 1.0);
    auto connection = std::make_shared<StrategyGameControllerMediator>(false);
    CompilerRegistry compilerRegistry;
    Strategy strategy(&timer, StrategyType::YELLOW, nullptr, &compilerRegistry, connection);

    connect(&strategy, &Strategy::sendStatus, this, &Connector::handleStatus);

    strategy.compileIfNecessary(initScript);
    // process all outstanding events before executing the strategy to avoid race conditions (otherwise, the compiler output may not be visible)
    app.processEvents();

    setIsInCompileMode(false);
}

void Connector::delayedExit(int exitCode)
{
    QTimer::singleShot(0, qApp, [exitCode, this]{performExit(exitCode);});
}

void Connector::performExit(int exitCode) {
    qApp->exit(exitCode);
}

void Connector::setAutorefInitScript(const QString &initScript)
{
    if (!initScript.isEmpty()) {
        QDir currentDirectory(".");
        m_autorefInitScript = currentDirectory.absoluteFilePath(initScript);
    }
}

void Connector::setInitScript(const QString &initScript)
{
    QDir currentDirectory(".");
    m_initScript = currentDirectory.absoluteFilePath(initScript);
}

void Connector::setEntryPoint(const QString &entryPoint)
{
    m_entryPoint = entryPoint;
}

void Connector::setStrategyColors(bool runBlue, bool runYellow)
{
    m_runBlue = runBlue;
    m_runYellow = runYellow;
}

void Connector::setDebug(bool debug)
{
    m_debug = debug;
}

void Connector::setSimulationRunningTime(int seconds)
{
    m_simulationRunningTime = seconds * 1E9;
}

void Connector::setRecordLogfile(const QString &filename)
{
    m_logfile.open(filename);
    m_recordLogfile = true;
}

void Connector::setBacklogDirectory(const QString &directory)
{
    QDir logdir(directory);
    if (!logdir.exists()) {
        QDir(".").mkdir(directory);
    }
    m_backlogDir = directory;
}

void Connector::setMaxBacklog(size_t newMax)
{
    m_maxBacklogFiles = newMax;
}

void Connector::setSimulatorConfigFile(const QString &shortFile)
{
    Command command(new amun::Command);
    if (!loadConfiguration("simulator/" + shortFile, command->mutable_simulator()->mutable_simulator_setup(), false)) {
        delayedExit(1);
    }

    emit sendCommand(command);
}

void Connector::setRealismConfig(const QString &shortFile)
{
    Command command(new amun::Command);
    if (!loadConfiguration("simulator-realism/" + shortFile, command->mutable_simulator()->mutable_realism_config(), true)) {
        delayedExit(1);
    }

    emit sendCommand(command);
}

void Connector::addStrategyLoad(amun::CommandStrategy *strategy, const QString &initScript, const QString &entryPoint)
{
    strategy->set_enable_debug(true);
    auto *load = strategy->mutable_load();
    load->set_filename(initScript.toStdString());
    if (!entryPoint.isEmpty()) {
        load->set_entry_point(entryPoint.toStdString());
    }
}

void Connector::setRobotConfiguration(int numRobots, const QString &generation)
{
    m_numRobots = numRobots;
    if (numRobots == 0) {
        return;
    }
    robot::Generation gen;
    if (!loadConfiguration("robots/" + generation, &gen, true)) {
        delayedExit(1);
    }

    robot::Team yellow;
    robot::Team blue;
    for (int i = 0;i<numRobots;i++) {
        yellow.add_robot()->CopyFrom(gen.default_());
        yellow.mutable_robot(i)->set_id(i);
        blue.add_robot()->CopyFrom(gen.default_());
        blue.mutable_robot(i)->set_id(i > 15 ? i : (15 - i));
    }

    Command command(new amun::Command);
    command->mutable_set_team_yellow()->CopyFrom(yellow);
    command->mutable_set_team_blue()->CopyFrom(blue);
    emit sendCommand(command);

    m_teamStatus = Status(new amun::Status);
    m_teamStatus->mutable_team_yellow()->CopyFrom(yellow);
    m_teamStatus->mutable_team_blue()->CopyFrom(blue);
}

void Connector::start()
{
    // FIXME: send config

    Command command(new amun::Command);
    command->mutable_simulator()->set_enable(true);
    command->mutable_referee()->set_active(true);

    // enable transceiver in the simulator
    command->mutable_transceiver()->set_enable(true);
    command->mutable_transceiver()->set_charge(true);

    // set simulation speed
    command->mutable_simulator()->mutable_ssl_control()->set_simulation_speed(m_simulationSpeed / 100.0f);

    if (m_runBlue) {
        addStrategyLoad(command->mutable_strategy_blue(), m_initScript, m_entryPoint);
    }
    if (m_runYellow) {
        addStrategyLoad(command->mutable_strategy_yellow(), m_initScript, m_entryPoint);
    }
    if (!m_autorefInitScript.isEmpty()) {
        addStrategyLoad(command->mutable_strategy_autoref(), m_autorefInitScript, {});

        command->mutable_referee()->set_active(true);

        m_referee.changeStage(SSL_Referee::NORMAL_FIRST_HALF);
        m_referee.changeBlueKeeper(m_numRobots);
        m_referee.changeYellowKeeper(0);
        m_referee.enableInternalAutoref(true);
        if (m_runBlue) {
            m_referee.changeCommand(SSL_Referee::PREPARE_KICKOFF_BLUE);
        } else if (m_runYellow) {
            m_referee.changeCommand(SSL_Referee::PREPARE_KICKOFF_YELLOW);
        }

    }
    if (m_forceStart) {
        m_referee.changeCommand(SSL_Referee::FORCE_START);
    }
    emit sendCommand(command);
}

void Connector::handleStrategyStatus(const amun::StatusStrategy &strategy, qint64 time)
{
    if (strategy.state() == amun::StatusStrategy::FAILED) {
        const auto& it = std::find_if_not(m_options.begin(), m_options.end(), [](const std::pair<std::string, OptionInfo>& p){ return p.second.hasBeenFlipped; });
        if (m_exitCode != 0 || it == m_options.end()) {
            if (m_backlogDir != "") {
                m_backlogList.push_back({time, "STRATEGY_CRASH"});
            } else {
                delayedExit(m_exitCode);
            }
        } else {
            std::cout << "Rerunning with option \"" << it->first <<"\" set to "<<(!it->second.value ? "true" : "false")<< std::endl;
            it->second.hasBeenFlipped = true;
            sendFlipOption(it->first);
        }
    } else if (strategy.state() == amun::StatusStrategy::RUNNING && !m_isInCompileMode) {
        if (m_entryPoint.isEmpty()) {
            TestTools::dumpEntrypoints(strategy);
            delayedExit(0);
        } else {
            QString currentEntryPoint = QString::fromStdString(strategy.current_entry_point());
            if (currentEntryPoint != m_entryPoint && strategy.filename() != m_autorefInitScript.toStdString()) {
                std::cout << "Invalid entrypoint " << std::endl;
                delayedExit(1);
            }
        }
    }
}

void Connector::sendFlipOption(const std::string &name)
{
    Command command(new amun::Command);
    auto *optionChange = command->mutable_amun()->mutable_change_option();
    optionChange->set_name(name);
    optionChange->set_value(!m_options[name].value);

    emit sendCommand(command);
}

void Connector::reportEvents()
{
    if (m_reportEvents) {
        std::cout <<std::endl<<"Events:"<<std::endl;
        auto eventTypeDesc = gameController::GameEvent::Type_descriptor();
        for (auto el : m_eventCounter) {
            std::cout <<eventTypeDesc->FindValueByNumber(el.first)->name()<<": "<<el.second<<std::endl;
        }
        m_reportEvents = false;
    }
}

void Connector::handleStatus(const Status &status)
{
    emit backlogStatus(status);

    m_logfile.writeStatus(status);

    QSet<amun::DebugSource> expectedSources;
    if (m_runBlue || m_isInCompileMode) {
        expectedSources.insert(amun::StrategyBlue);
    }
    if (m_runYellow || m_isInCompileMode) {
        expectedSources.insert(amun::StrategyYellow);
    }
    if (!m_autorefInitScript.isEmpty()) {
        expectedSources.insert(amun::Autoref);
    }
    for (const auto& debug: status->debug()) {
        if (expectedSources.contains(debug.source())) {
            if (m_debug) {
                TestTools::dumpProtobuf(*status);
            }
            if (!m_isSilent) {
                TestTools::dumpLog(debug, m_exitCode);

                // allow the strategy/autoref/pathfinding... to create backlogs by printing logging a string like "amun.requestBacklog(INTERNAL_ERROR)"
                for (const amun::StatusLog &entry: debug.log()) {
                    const QString line = QString::fromStdString(entry.text());
                    const QRegExp regex("amuncli\\.requestBacklog\\((.*)\\)$");
                    if (regex.indexIn(line) != -1) {
                        const QString errorName = regex.capturedTexts().at(1);
                        m_backlogList.push_back({status->time(), errorName});
                    }
                }
            }
        }
    }

    if (status->has_amun_state()) {
        for (const auto &option : status->amun_state().options()) {
            auto it = m_options.find(option.name());
            if (it == m_options.end()) {
                m_options.insert({option.name(), {option.value(), false}});
            } else {
                it->second.value = option.value();
            }
        }
    }

    if (status->has_status_strategy()) {
        const auto& strategy = status->status_strategy().status();
        handleStrategyStatus(strategy, status->time());
    }

    if (m_simulationStartTime == 0) {
        m_simulationStartTime = status->time();
    }
    if (status->time() - m_simulationStartTime >= m_simulationRunningTime) {
        reportEvents();
        delayedExit(0);
    }

    // TODO: look at more than just the last game event, thismight miss some when multiple are issued in the same frame
    if (status->has_game_state() && status->game_state().game_event_2019_size() > 0) {
        auto event = status->game_state().game_event_2019(status->game_state().game_event_2019_size() - 1);
        if (!google::protobuf::util::MessageDifferencer::Equals(event, m_lastGameEvent)) {
            m_eventCounter[event.type()]++;
            m_lastGameEvent = event;

            const std::array<gameController::GameEvent::Type, 4> excludedEvents = {gameController::GameEvent::PREPARED,
                                                                                   gameController::GameEvent::PLACEMENT_SUCCEEDED,
                                                                                   gameController::GameEvent::BALL_LEFT_FIELD_GOAL_LINE,
                                                                                   gameController::GameEvent::BALL_LEFT_FIELD_TOUCH_LINE};
            if (m_backlogDir != "" && std::find(excludedEvents.begin(), excludedEvents.end(), event.type()) == excludedEvents.end()) {
                auto eventTypeDesc = gameController::GameEvent::Type_descriptor();
                QString eventName = QString::fromStdString(eventTypeDesc->FindValueByNumber(event.type())->name());
                m_backlogList.push_back({status->time(), eventName});
            }
        }
    }

    // triggers saving the backlog when 1s (=1E9) passed since the event
    while (!m_backlogList.empty() && (status->time() - m_backlogList.first().first) >= 1E9) {
        auto p = m_backlogList.first();
        m_backlogList.pop_front();
        stopAmunAndSaveBacklog(p.second);

        if (p.second == "STRATEGY_CRASH") {
            reportEvents();
            delayedExit(m_exitCode);
        }
    }
}

void Connector::stopAmunAndSaveBacklog(QString directory) {
    QDir logdir(m_backlogDir);
    if (!logdir.exists(directory)) {
        logdir.mkdir(directory);
    }

    const QDir fullDir(logdir.path() + "/" + directory);
    if (m_maxBacklogFiles > 0 && fullDir.count() >= m_maxBacklogFiles + 2) {
        qDebug() << "Maximum backlogs reached in directory: " + directory;
        return;
    }

    Command command(new amun::Command);
    amun::PauseSimulatorReason reason = amun::Logging;
    command->mutable_pause_simulator()->set_reason(reason);
    command->mutable_pause_simulator()->set_pause(true);
    emit sendCommand(command);

    const QString date = CombinedLogWriter::dateTimeToString(QDateTime::currentDateTime()).replace(":", "");
    QString pathName = fullDir.path() + QString("/backlog%1.log").arg(date);
    emit saveBacklogFile(pathName/*, m_teamStatus*/, false);
}

void Connector::continueAmun()
{
    Command command(new amun::Command);
    amun::PauseSimulatorReason reason = amun::Logging;
    command->mutable_pause_simulator()->set_reason(reason);
    command->mutable_pause_simulator()->set_pause(false);
    emit sendCommand(command);
}


/*
tracking {
  system_delay: 30000000
}
*/
