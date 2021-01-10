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

#include "amun/amunclient.h"
#include "testtools/connector.h"

#include <clocale>
#include <QCoreApplication>
#include <QCommandLineParser>
#include <QProcessEnvironment>

int main(int argc, char* argv[])
{
    QCoreApplication app(argc, argv);
    app.setApplicationName("Amun-CLI");
    app.setOrganizationName("ER-Force");

    std::setlocale(LC_NUMERIC, "C");

    QCommandLineParser parser;
    parser.setApplicationDescription("Amun command line interface");
    parser.addHelpOption();
    parser.addPositionalArgument("strategy_file", "Strategy init script");
    parser.addPositionalArgument("entrypoint", "Entrypoint, optional. Prints all entrypoints if missing", "[entrypoint]");

    QCommandLineOption strategyColorConfig({"c", "strategy-color"}, "Color(s) of the strategy to run, either yellow, blue or both, defaults to yellow", "color", "yellow");
    QCommandLineOption debugOption({"v", "verbose"}, "Dump raw strategy output");
    QCommandLineOption simulatorConfig({"s", "simulator-config"}, "Which simulator config to use (field size etc.), loaded from the config directory", "file");
    QCommandLineOption simulationTime({"t", "simulation-time"}, "Number of seconds to simulator, infinite running if missing", "seconds", "-1");
    QCommandLineOption numberOfRobots({"n", "num-robots"}, "Number of robots to load per team. Defaults to zero", "num-robots", "0");
    QCommandLineOption robotGenerationFile("robot-generation", "Robot generation to create the robots of", "generation");
    QCommandLineOption autorefInitScript({"a", "autoref"}, "Autoref init script (not executed when missing)", "file");
    QCommandLineOption recordLog({"r", "record"}, "Record the game to the specified log file", "file");
    QCommandLineOption recordEnv("env", "Only record a logfile if the given environment variable is set. Only changes any behavior is -r is also set", "environment-variable");
    QCommandLineOption reportEvents({"e", "report-events"}, "Report the number of events (fouls, goals etc.)");
    QCommandLineOption simulationSpeed("simulation-speed", "Speed in percent to run the simulator at. Defaults to 100%", "speed", "100");
    QCommandLineOption backlog({"b", "backlog-directory"}, "Directory for backlogging of events.", "directory");
    QCommandLineOption maxBacklog("max-backlog", "Maximum of backlog files in a category. 0 removes limit. Default 20.", "count");
    QCommandLineOption realismConfig("realism", "Simulator realism configuration (short file name without the .txt)", "realism");
    QCommandLineOption silent("silent", "Do not print any messages");
    QCommandLineOption forceStart({"f", "force-start"}, "Force start the game immediately (Kickoff will be used otherwise)");
    parser.addOption(strategyColorConfig);
    parser.addOption(debugOption);
    parser.addOption(simulatorConfig);
    parser.addOption(simulationTime);
    parser.addOption(numberOfRobots);
    parser.addOption(robotGenerationFile);
    parser.addOption(autorefInitScript);
    parser.addOption(recordLog);
    parser.addOption(recordEnv);
    parser.addOption(reportEvents);
    parser.addOption(simulationSpeed);
    parser.addOption(backlog);
    parser.addOption(maxBacklog);
    parser.addOption(realismConfig);
    parser.addOption(silent);
    parser.addOption(forceStart);

    // parse command line, handles --version
    parser.process(app);

    int argCount = parser.positionalArguments().size();
    if (argCount != 1 && argCount != 2) {
        parser.showHelp(1);
    }

    const QStringList args = parser.positionalArguments();
    const QString initScript = args.at(0);
    const QString entryPoint = (argCount > 1) ? args.at(1) : QString();
    const QString strategyColor = parser.value(strategyColorConfig);

    if (strategyColor != "yellow" && strategyColor != "blue" && strategyColor != "both") {
        std::cerr <<"Invalid strategy color configuration "<<strategyColor.toStdString()<<std::endl;
        exit(1);
    }

    bool runBlueStrategy = strategyColor == "blue" || strategyColor == "both";
    bool runYellowStrategy = strategyColor == "yellow" || strategyColor == "both";
    bool debug = parser.isSet(debugOption);
    int simulationRunningTime = parser.value(simulationTime).toInt();
    int numRobots = parser.value(numberOfRobots).toInt();

    Connector connector;

    // compile the strategy beforehand to avoid using old compiles
    connector.compileStrategy(app, initScript);

    AmunClient amun;
    amun.start(true);

    connector.connect(&connector, &Connector::sendCommand, &amun, &AmunClient::sendCommand);
    connector.connect(&amun, &AmunClient::gotStatus, &connector, &Connector::handleStatus);

    if (parser.isSet(recordLog)) {
        bool record = true;
        if (parser.isSet(recordEnv)) {
            QProcessEnvironment env{QProcessEnvironment::systemEnvironment()};
            if (!env.contains(parser.value(recordEnv))) {
                record = false;
            }
        }
        if (record) {
            connector.setRecordLogfile(parser.value(recordLog));
        }
    }
    if (parser.isSet(simulatorConfig)) {
        connector.setSimulatorConfigFile(parser.value(simulatorConfig));
    }
    if (parser.isSet(robotGenerationFile)) {
        connector.setRobotConfiguration(numRobots, parser.value(robotGenerationFile));
    } else if (numRobots > 0) {
        std::cerr <<"Option robot-generation must be specified with a non-zero robot count"<<std::endl;
        exit(1);
    }
    if (parser.isSet(realismConfig)) {
        connector.setRealismConfig(parser.value(realismConfig));
    }
    if (parser.isSet(simulationSpeed)) {
        int speed = parser.value(simulationSpeed).toInt();
        if (speed <= 0) {
            std::cerr <<"Simulation speed must be positive!"<<std::endl;
            exit(1);
        }
        connector.setSimulationSpeed(speed);
    }
    connector.setAutorefInitScript(parser.value(autorefInitScript));
    connector.setInitScript(initScript);
    connector.setEntryPoint(entryPoint);
    connector.setStrategyColors(runBlueStrategy, runYellowStrategy);
    connector.setDebug(debug);
    connector.setSimulationRunningTime(simulationRunningTime < 0 ? std::numeric_limits<int>::max() : simulationRunningTime);
    connector.setReportEvents(parser.isSet(reportEvents));
    connector.setSilent(parser.isSet(silent));
    connector.setForceStartGame(parser.isSet(forceStart));

    if (parser.isSet(backlog)) {
        connector.setBacklogDirectory(parser.value(backlog));
    }
    if (parser.isSet(maxBacklog)) {
        bool conversionSucceeded;
        size_t maxBl = parser.value(maxBacklog).toUInt(&conversionSucceeded);
        if (!conversionSucceeded) {
            std::cerr <<"Maximum of backlog files must be a positive integer!"<<std::endl;
            exit(1);
        }
        connector.setMaxBacklog(maxBl);
    }

    connector.start();

    return app.exec();
}
