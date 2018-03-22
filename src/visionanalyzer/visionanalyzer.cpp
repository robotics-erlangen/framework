/***************************************************************************
 *   Copyright 2017 Alexander Danzer                                       *
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

#include <clocale>
#include <QCoreApplication>
#include <QCommandLineParser>
#include "protobuf/status.h"
#include "protobuf/ssl_wrapper.pb.h"

#include "tracking/tracker.h"
#include "strategy/strategy.h"
#include "strategy/strategyreplayhelper.h"
#include "core/timer.h"
#include "logfile/logfilewriter.h"
#include "visionlogreader.h"
#include "processor/referee.h"
#include <QThread>
#include <QDebug>

int main(int argc, char* argv[])
{
    QCoreApplication app(argc, argv);
    app.setApplicationName("Vision Analyzer");
    app.setOrganizationName("ER-Force");

    std::setlocale(LC_NUMERIC, "C");

    QCommandLineParser parser;
    parser.setApplicationDescription("Analyzer for recorded vision data");
    parser.addHelpOption();
    parser.addPositionalArgument("source", "The log file to read");
    QCommandLineOption autorefDirOption(QStringList() << "a" << "autoref",
                                        "Path to the autorefs init.lua file",
                                        "autorefDir");
    parser.addOption(autorefDirOption);
    QCommandLineOption outputDirOption(QStringList() << "o" << "output",
                                       "Location to output the resulting log file",
                                       "outputFile", "va_out.log");
    parser.addOption(outputDirOption);
    parser.process(app);

    int argCount = parser.positionalArguments().size();
    if (argCount < 1) {
        parser.showHelp(1);
        app.exit(1);
    }

    VisionLogReader logFileIn(parser.positionalArguments().first());

    QByteArray visionFrame;
    auto packet = logFileIn.nextVisionPacket(visionFrame);
    qint64 receiveTimeNanos = packet.first;
    int msg_type = packet.second;

    Tracker tracker;
    tracker.reset();

    Timer* timer = new Timer;
    timer->setTime(receiveTimeNanos, 1.0);

    qRegisterMetaType<Status>("Status");
    qRegisterMetaType<Command>("Command");

    Strategy* strategy = nullptr;
    FeedbackStrategyReplay * strategyReplay = nullptr;
    QThread* strategyThread = nullptr;
    if (parser.isSet(autorefDirOption)) {
        strategy = new Strategy(timer, StrategyType::AUTOREF, nullptr);

        strategyThread = new QThread();
        strategy->moveToThread(strategyThread);
        strategyThread->start();

        strategyReplay = new FeedbackStrategyReplay(strategy);

        // load the autoref strategy
        Command command(new amun::Command);
        amun::CommandStrategyLoad *load =
                command->mutable_strategy_autoref()->mutable_load();

        load->set_filename(parser.value(autorefDirOption).toStdString());
        strategy->handleCommand(command);
    }

    LogFileWriter logFile;
    logFile.open(parser.value(outputDirOption));

    Referee ref(false);

    // every 10ms in system time, execute tracking
    for (qint64 systemTimeNanos = receiveTimeNanos; receiveTimeNanos != -1; systemTimeNanos += 10000000) {

        do {
            // collect all packets until current system time
            if (msg_type == MESSAGE_SSL_VISION_2014) {
                tracker.queuePacket(visionFrame, receiveTimeNanos);
            } else if (msg_type == MESSAGE_SSL_REFBOX_2013) {
                ref.handlePacket(visionFrame);
            }
            auto packet = logFileIn.nextVisionPacket(visionFrame);
            receiveTimeNanos = packet.first;
            msg_type = packet.second;
        } while(receiveTimeNanos <= systemTimeNanos && receiveTimeNanos != -1);

        tracker.process(systemTimeNanos);

        timer->setTime(systemTimeNanos, 1.0); // update timer for strategy

        Status status = tracker.worldState(systemTimeNanos);
        status->set_time(systemTimeNanos);

        ref.process(status->world_state());
        status->mutable_game_state()->CopyFrom(ref.gameState());

        if (strategy != nullptr) {
            logFile.writeStatus(strategyReplay->executeWithFeedback(status));
        } else {
            logFile.writeStatus(status);
        }
    }

    QThread::msleep(50); // wait for strategy thread to finish its work
    if (strategy != nullptr) {
        strategyThread->quit();
        strategyThread->deleteLater();
        strategy->deleteLater();
        strategyReplay->deleteLater();
    }
    delete timer;

    return 0;
}
