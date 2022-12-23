/***************************************************************************
 *   Copyright 2017 Alexander Danzer, Paul Bergmann                        *
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
#include "strategy/script/compilerregistry.h"
#include "core/timer.h"
#include "seshat/logfilewriter.h"
#include "visionlog/visionlogreader.h"
#include "visionlog/messagetype.h"
#include "processor/referee.h"
#include <QThread>
#include <QDebug>
#include <QString>

static const QString SENDER_NAME_FOR_REFEREE = "VisionAnalyzer";

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

    const QStringList arguments = parser.positionalArguments();
    int argCount = arguments.size();
    if (argCount < 1) {
        parser.showHelp(1);
        app.exit(1);
    }

    VisionLogReader logFileIn(arguments.first());
    if (!logFileIn.errorMessage().isEmpty()) {
        qDebug() <<logFileIn.errorMessage();
        app.exit(-1);
    }

    QByteArray visionFrame;
    auto packet = logFileIn.nextVisionPacket(visionFrame);
    qint64 receiveTimeNanos = packet.first;
    VisionLog::MessageType msg_type = packet.second;

    Tracker tracker(false, false);
    tracker.reset();

    Timer* timer = new Timer;
    timer->setTime(receiveTimeNanos, 1.0);

    CompilerRegistry compilerRegistry;

    qRegisterMetaType<Status>("Status");
    qRegisterMetaType<Command>("Command");

    Strategy* strategy = nullptr;
    FeedbackStrategyReplay * strategyReplay = nullptr;
    QThread* strategyThread = nullptr;
    bool lastFlipped = false;
    auto connection = std::make_shared<StrategyGameControllerMediator>(false);
    if (parser.isSet(autorefDirOption)) {
        strategy = new Strategy(timer, StrategyType::AUTOREF, nullptr, &compilerRegistry, connection);

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

    Referee ref;
    // if you want to execute the tracking only on a specific part of the visionlog,
    // you can set enabled to true, and insert the first and last frame that should be processed here
    int counter = 0;
    int first_frame = 36955;
    int last_frame = 39300;
    bool enabled = false;

    // every 10ms in system time, execute tracking
    for (qint64 systemTimeNanos = receiveTimeNanos; receiveTimeNanos != -1; systemTimeNanos += 10000000) {

        do {
            if (! enabled ||  (counter > first_frame && counter < last_frame)){
                //std::cerr << "enque packet" << counter << "(" << (counter-first_frame) << ")" <<std::endl;
                // collect all packets until current system time
                if (msg_type == VisionLog::MessageType::MESSAGE_SSL_VISION_2014) {
                    tracker.queuePacket(visionFrame, receiveTimeNanos, "logfile");
                } else if (msg_type == VisionLog::MessageType::MESSAGE_SSL_REFBOX_2013) {
                    ref.handlePacket(visionFrame, SENDER_NAME_FOR_REFEREE);
                    if (ref.getFlipped() != lastFlipped) {
                        tracker.setFlip(ref.getFlipped());
                        lastFlipped = ref.getFlipped();
                    }
                }
            }
            auto packet = logFileIn.nextVisionPacket(visionFrame);
            receiveTimeNanos = packet.first;
            msg_type = packet.second;
        } while(receiveTimeNanos <= systemTimeNanos && receiveTimeNanos != -1);

        if(!enabled || (counter > first_frame && counter < last_frame))
        {
            tracker.process(systemTimeNanos);
        }

        timer->setTime(systemTimeNanos, 1.0); // update timer for strategy

        Status status = tracker.worldState(systemTimeNanos, true);
        status->set_time(systemTimeNanos);

        ref.process(status->world_state());
        status->mutable_game_state()->CopyFrom(ref.gameState());

        if (strategy != nullptr) {
            if(! enabled || (counter > first_frame && counter < last_frame))
            logFile.writeStatus(strategyReplay->executeWithFeedback(status));
        } else {
            if(!enabled || (counter > first_frame && counter < last_frame))
            logFile.writeStatus(status);
        }
        counter++;
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
