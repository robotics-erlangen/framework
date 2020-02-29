/***************************************************************************
 *   Copyright 2016 Michael Eischer                                        *
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
#include "testtools/testtools.h"
#include "config/config.h"

#include <google/protobuf/text_format.h>
#include <QCoreApplication>
#include <QDir>
#include <QSet>
#include <iostream>

Connector::Connector(QObject *parent) :
    QObject(parent)
{
    connect(&m_referee, SIGNAL(sendCommand(Command)), this, SIGNAL(sendCommand(Command)));
}

Connector::~Connector()
{
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

void Connector::loadConfiguration(const QString &configFile, google::protobuf::Message *message, bool allowPartial)
{
    QString fullFilename = QString(ERFORCE_CONFDIR) + configFile + ".txt";
    QFile file(fullFilename);
    if (!file.open(QFile::ReadOnly)) {
        std::cout <<"Could not open configuration file "<<fullFilename.toStdString()<<std::endl;
        qApp->exit(1);
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
        blue.mutable_robot(i)->set_id(i);
    }

    Command command(new amun::Command);
    command->mutable_set_team_yellow()->CopyFrom(yellow);
    command->mutable_set_team_blue()->CopyFrom(blue);
    sendCommand(command);
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
        m_referee.changeBlueKeeper(0);
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
            qApp->exit(m_exitCode);
        } else {
            std::cout << "Rerunning with " << it->first <<" set to true"<< std::endl;
            it->second = true;
            sendOptions();
        }
    } else if (strategy.state() == amun::StatusStrategy::RUNNING) {
        if (m_entryPoint.isEmpty()) {
            TestTools::dumpEntrypoints(strategy);
            qApp->exit(0);
        } else {
            QString currentEntryPoint = QString::fromStdString(strategy.current_entry_point());
            if (currentEntryPoint != m_entryPoint && strategy.filename() != m_autorefInitScript.toStdString()) {
                std::cout << "Invalid entrypoint " << std::endl;
                qApp->exit(1);
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
    m_logfile.writeStatus(status);

    QSet<amun::DebugSource> expectedSources;
    if (m_runBlue) {
        expectedSources.insert(amun::StrategyBlue);
    }
    if (m_runYellow) {
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
        qApp->exit(0);
    }
}



/*
"simulator {
  vision_delay: 35000000
  vision_processing_time: 5000000
}
strategy_yellow {
  enable_refbox_control: false
}
transceiver {
  configuration {
    channel: 11
  }
  network_configuration {
    host: \"\"
    port: 10010
  }
  use_network: false
}
tracking {
  system_delay: 30000000
}
amun {
  vision_port: 10005
}
mixed_team_destination {
  host: \"\"
  port: 10012
}
"
"referee {
  command: \"\\010\\000\\020\\001\\030\\000 \\000(\\0000\\000:\\022\
\\000\\020\\000\\030\\000(\\0000\\0048\\200\\306\\206\\217\\001@\\005B\\022\
\\000\\020\\000\\030\\000(\\0000\\0048\\200\\306\\206\\217\\001@\\000\"
}
"
"referee {
  command: \"\\010\\000\\020\\001\\030\\000 \\000(\\0000\\000:\\022\
\\000\\020\\000\\030\\000(\\0000\\0048\\200\\306\\206\\217\\001@\\005B\\022\
\\000\\020\\000\\030\\000(\\0000\\0048\\200\\306\\206\\217\\001@\\007\"
}
"
*/
