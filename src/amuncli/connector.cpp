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
#include "testtools/testtools.h"
#include "config/config.h"
#include "logfile/combinedlogwriter.h"

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
    connect(this, SIGNAL(saveBacklogFile(QString, Status, bool)), &m_backlogWriter, SLOT(saveBacklog(QString, Status, bool)));
    connect(this, SIGNAL(backlogStatus(Status)), &m_backlogWriter, SLOT(handleStatus(Status)));
    connect(&m_backlogWriter, SIGNAL(finishedBacklogSave()), this, SLOT(continueAmun()));
    connect(&m_referee, SIGNAL(sendCommand(Command)), this, SIGNAL(sendCommand(Command)));
}

Connector::~Connector()
{
}

void Connector::delayedExit(int exitCode) {
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

void Connector::setBacklogDirectory(const QString &directory) {
    QDir logdir(directory);
    if (!logdir.exists()) {
        QDir(".").mkdir(directory);
    }
    m_backlogDir = directory;
}

void Connector::setMaxBacklog(size_t newMax) {
    m_maxBacklogFiles = newMax;
}

void Connector::loadConfiguration(const QString &configFile, google::protobuf::Message *message, bool allowPartial)
{
    QString fullFilename = QString(ERFORCE_CONFDIR) + configFile + ".txt";
    QFile file(fullFilename);
    if (!file.open(QFile::ReadOnly)) {
        std::cout <<"Could not open configuration file "<<fullFilename.toStdString()<<std::endl;
        delayedExit(1);
    }
    QString str = file.readAll();
    file.close();
    std::string s = qPrintable(str);

    google::protobuf::TextFormat::Parser parser;
    parser.AllowPartialMessage(allowPartial);
    parser.ParseFromString(s, message);
}

void Connector::setSimulatorConfigFile(const QString &shortFile)
{
    Command command(new amun::Command);
    loadConfiguration("simulator/" + shortFile, command->mutable_simulator()->mutable_simulator_setup(), false);

    sendCommand(command);
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
    loadConfiguration("robots/" + generation, &gen, true);

    robot::Team yellow;
    robot::Team blue;
    for (int i = 0;i<numRobots;i++) {
        yellow.add_robot()->CopyFrom(gen.default_());
        yellow.mutable_robot(i)->set_id(i);
        blue.add_robot()->CopyFrom(gen.default_());
        // do not duplicate IDs, amun can not control two robots with the same id
        blue.mutable_robot(i)->set_id(i + numRobots);
    }

    Command command(new amun::Command);
    command->mutable_set_team_yellow()->CopyFrom(yellow);
    command->mutable_set_team_blue()->CopyFrom(blue);
    sendCommand(command);

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
    command->set_speed(m_simulationSpeed / 100.0f);

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
    sendCommand(command);
}

void Connector::handleStrategyStatus(const amun::StatusStrategy &strategy)
{
    for (const std::string &stdOption: strategy.option()) {
        m_options.insert({stdOption, false});
    }
    if (strategy.state() == amun::StatusStrategy::FAILED) {
        const auto& it = std::find_if_not(m_options.begin(), m_options.end(), [](const std::pair<std::string, bool>& p){ return p.second; });
        if (m_exitCode != 0 || it == m_options.end()) {
            delayedExit(m_exitCode);
        } else {
            std::cout << "Rerunning with " << it->first <<" set to true"<< std::endl;
            it->second = true;
            sendOptions();
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

void Connector::sendOptions()
{
    Command command(new amun::Command);
    amun::CommandStrategySetOptions *opts =
            command->mutable_strategy_yellow()->mutable_options();
    for (const auto &pair: m_options) {
        if (!pair.second) {
            continue;
        }
        const std::string& option = pair.first;
        std::string *stdopt = opts->add_option();
        *stdopt = option;
    }

    command->mutable_strategy_blue()->CopyFrom(command->strategy_yellow());
    command->mutable_strategy_autoref()->CopyFrom(command->strategy_yellow());
    emit sendCommand(command);
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

            TestTools::dumpLog(debug, m_exitCode);
        }
    }

    if (status->has_status_strategy()) {
        const auto& strategy = status->status_strategy().status();
        handleStrategyStatus(strategy);
    }

    if (m_simulationStartTime == 0) {
        m_simulationStartTime = status->time();
    }
    if (status->time() - m_simulationStartTime >= m_simulationRunningTime) {

        if (m_reportEvents) {
            std::cout <<std::endl<<"Events:"<<std::endl;
            auto eventTypeDesc = gameController::GameEventType_descriptor();
            for (auto el : m_eventCounter) {
                std::cout <<eventTypeDesc->FindValueByNumber(el.first)->name()<<": "<<el.second<<std::endl;
            }
            m_reportEvents = false;
        }

        delayedExit(0);
    }

    if (status->has_game_state() && status->game_state().has_game_event_2019()) {
        auto event = status->game_state().game_event_2019();
        if (!google::protobuf::util::MessageDifferencer::Equals(event, m_lastGameEvent)) {
            m_eventCounter[event.type()]++;
            m_lastGameEvent = event;

            const std::array<gameController::GameEventType, 4> excludedEvents = {gameController::PREPARED, gameController::PLACEMENT_SUCCEEDED, gameController::BALL_LEFT_FIELD_GOAL_LINE, gameController::BALL_LEFT_FIELD_TOUCH_LINE};
            if (m_backlogDir != "" && std::find(excludedEvents.begin(), excludedEvents.end(), event.type()) == excludedEvents.end()) {
                auto eventTypeDesc = gameController::GameEventType_descriptor();
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
    emit saveBacklogFile(pathName, m_teamStatus, false);
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
