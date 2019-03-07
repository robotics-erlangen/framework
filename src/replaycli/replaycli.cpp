/***************************************************************************
 *   Copyright 2018 Tobias Heineken, Andreas Wendler                       *
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

#include <QCoreApplication>
#include <QCommandLineParser>
#include <QDir>
#include <clocale>
#include <QtGlobal>
#include <iostream>
#include <fstream>

#include "logfile/logfilereader.h"
#include "strategy/strategy.h"
#include "timingstatistics.h"
#include "core/timer.h"
#include "replaytestrunner.h"

static std::ofstream fileStream;

void myMessageOutput(QtMsgType type, const QMessageLogContext &, const QString &msg)
{
    QByteArray localMsg = msg.toLocal8Bit();
    switch(type) {
        case QtDebugMsg:
            std::cout << localMsg.constData() << std::endl;
            fileStream << localMsg.constData()<< std::endl;
            break;
        case QtFatalMsg:
            std::cerr << localMsg.constData() << std::endl;
            abort();
        case QtWarningMsg:
        case QtCriticalMsg:
        default:
            std::cerr << localMsg.constData() << std::endl;
            break;
    }
}

static Command createLoadCommand(bool asBlue, QString initScript, QString entryPoint, bool disablePerformanceMode)
{
    Command command(new amun::Command);
    amun::CommandStrategyLoad *load;
    amun::CommandStrategy *strategyCommand;
    if (asBlue) {
        load = command->mutable_strategy_blue()->mutable_load();
        strategyCommand = command->mutable_strategy_blue();
    } else {
        load = command->mutable_strategy_yellow()->mutable_load();
        strategyCommand = command->mutable_strategy_yellow();
    }
    load->set_filename(initScript.toStdString());
    load->set_entry_point(entryPoint.toStdString());

    if (disablePerformanceMode) {
        strategyCommand->set_performance_mode(false);
    }
    return command;
}

int main(int argc, char* argv[])
{
    QCoreApplication app(argc, argv);
    app.setApplicationName("Replay-CLI");
    app.setOrganizationName("ER-Force");

    std::setlocale(LC_NUMERIC, "C");

    QCommandLineParser parser;
    parser.setApplicationDescription("Log replay command line interface");
    parser.addHelpOption();
    parser.addVersionOption();
    parser.addPositionalArgument("logfile", "Log file to read");
    parser.addPositionalArgument("strategy_file", "Strategy init script");
    parser.addPositionalArgument("entrypoint", "Entrypoint, optional. Uses main if missing.", "[entrypoint]");

    QCommandLineOption asBlueOption({"b", "as-blue"}, "Run as blue strategy, defaults to yellow");
    QCommandLineOption showHistogramOption("hist", "Show a histogram of the strategy timings");
    QCommandLineOption printAllTimings({"a", "all"}, "Print all timings for every frame");
    QCommandLineOption runs({"r", "runs"}, "Ammount of runs, optional. Uses 1 if missing", "numRuns", "1");
    QCommandLineOption prefix({"p", "prefix"}, "Prefix for outputFiles. Uses std::cout for output if missing", "prefix");
    QCommandLineOption disablePerformanceMode("disable-performance-mode", "Disable performance mode for the strategy.");
    QCommandLineOption profileFile("profileOutfile", "Perform profiling and output the the result to the specified file", "filename");
    QCommandLineOption profileStart("profileStart", "Only has effect together with profileOutfile: in which log frame to start profiling", "start frame", "0");
    QCommandLineOption profileLength("profileLength", "Only has effect together with profileOutfile: for how many log frames to profile", "end frame");
    QCommandLineOption showLogOption({"l", "show-log"}, "Print log output to std::cout");
    QCommandLineOption abortExecution({"d", "die-on-error"}, "Die when a strategy problem occurs");
    QCommandLineOption runTestScript({"t", "test-script"}, "A script to evaluate the test results", "script");


    parser.addOption(asBlueOption);
    parser.addOption(showHistogramOption);
    parser.addOption(runs);
    parser.addOption(prefix);
    parser.addOption(printAllTimings);
    parser.addOption(disablePerformanceMode);
    parser.addOption(profileFile);
    parser.addOption(profileStart);
    parser.addOption(profileLength);
    parser.addOption(showLogOption);
    parser.addOption(abortExecution);
    parser.addOption(runTestScript);

    // parse command line
    parser.process(app);

    int argCount = parser.positionalArguments().size();
    if (argCount != 2 && argCount != 3) {
        parser.showHelp(1);
    }

    const bool asBlue = parser.isSet(asBlueOption);
    const bool abortExec = parser.isSet(abortExecution);
    const bool showLog = parser.isSet(showLogOption);
    const bool runAsTest = parser.isSet(runTestScript);

    if (runAsTest && showLog) {
        qFatal("Options show-log and test-script can not be combined!");
    }

    qRegisterMetaType<Status>("Status");
    qRegisterMetaType<Command>("Command");

    LogFileReader logfile;
    QString logfileName = parser.positionalArguments().first();
    QByteArray lognameBytes = logfileName.toUtf8();
    if (!logfile.open(logfileName)){
        qFatal("Error reading logfile %s: %s",lognameBytes.constData(),logfile.errorMsg().toUtf8().constData());
    }

    const QStringList args = parser.positionalArguments();
    QDir currentDirectory(".");
    const QString initScript = currentDirectory.absoluteFilePath(args.at(1));
    const QString entryPoint = (argCount > 2) ? args.at(2) : QString();
    const unsigned int runsI = parser.value(runs).toInt();
    const bool redirect = parser.isSet(prefix);
    const QString prefixS = parser.value(prefix);


    for(unsigned int i=0; i < runsI; ++i){
        if (redirect){
            //keep the reference to filename bytes alive
            QByteArray filenameBytes = (prefixS + QString::number(i)).toUtf8();
            const char* filename = filenameBytes.constData();
            std::ifstream infile(filename);
            if (infile.good()){
                qFatal("Filename is in use: %s \n", filename);
            }
            fileStream.close();
            fileStream.clear();
            fileStream.open(filename);
            qInstallMessageHandler(myMessageOutput);
        }
        Timer timer;
        timer.setTime(logfile.readStatus(0)->time(), 1.0);
        std::unique_ptr<Strategy> strategy(new Strategy(&timer, asBlue ? StrategyType::BLUE : StrategyType::YELLOW, nullptr));

        TimingStatistics statistics(asBlue, parser.isSet(printAllTimings), logfile.packetCount() + 1);
        statistics.connect(strategy.get(), &Strategy::sendStatus, &statistics, &TimingStatistics::handleStatus);
        if (showLog) {
            strategy->connect(strategy.get(), &Strategy::sendStatus, [](const Status& s) {
                    for(const auto& debugValues : s->debug()) {
                        for(int i=0; i < debugValues.log_size(); ++i) {
                            const amun::StatusLog& log = debugValues.log(i);
                            std::cout << log.text() << std::endl;
                        }
                    }
                });
        }

        if (abortExec) {
            strategy->connect(strategy.get(), &Strategy::sendStatus, [] (const Status& s) {
                    const amun::StatusStrategy* replayStatus = nullptr;
                    if (s->has_status_strategy()) {
                        replayStatus = &s->status_strategy().status();
                    }
                    if (replayStatus && replayStatus->state() == amun::StatusStrategy::FAILED) {
                        exit(1);
                    }
                });
        }



        // load the strategy
        strategy->handleCommand(createLoadCommand(asBlue, initScript, entryPoint, parser.isSet(disablePerformanceMode)));

        int packetCount = logfile.packetCount();
        int startPosition = parser.value(profileStart).toInt();
        int endPosition = parser.isSet(profileLength) ? startPosition + parser.value(profileLength).toInt() : packetCount - 1;
        
        for (int i = 0; i<packetCount; i++) {
            Status status = logfile.readStatus(i);

            // give the team information to the strategy
            if (status->has_team_blue()) {
                Command command(new amun::Command);
                robot::Team * teamBlue = command->mutable_set_team_blue();
                teamBlue->CopyFrom(status->team_blue());
                strategy->handleCommand(command);
            }
            if (status->has_team_yellow()) {
                Command command(new amun::Command);
                robot::Team * teamYellow = command->mutable_set_team_yellow();
                teamYellow->CopyFrom(status->team_yellow());
                strategy->handleCommand(command);
            }

            if (parser.isSet(profileFile) && i == startPosition) {
                Command command(new amun::Command);
                if (asBlue) {
                    command->mutable_strategy_blue()->set_start_profiling(true);
                } else {
                    command->mutable_strategy_yellow()->set_start_profiling(true);
                }
                strategy->handleCommand(command);
            }

            strategy->handleStatus(status);
            app.processEvents();

            if (parser.isSet(profileFile) && i == endPosition) {
                Command command(new amun::Command);
                if (asBlue) {
                    command->mutable_strategy_blue()->set_finish_and_save_profile(parser.value(profileFile).toStdString());
                } else {
                    command->mutable_strategy_yellow()->set_finish_and_save_profile(parser.value(profileFile).toStdString());
                }
                strategy->handleCommand(command);
            }
        }

        statistics.printStatistics(parser.isSet(showHistogramOption));
    }
    return 0;
}
