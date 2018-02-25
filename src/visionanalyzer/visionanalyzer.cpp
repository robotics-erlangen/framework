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

#include "tracker.h"
#include "strategy/strategy.h"
#include "core/timer.h"
#include "logfile/logfilewriter.h"
#include "visionlogreader.h"
#include "miniprocessor.h"
#include "../amun/processor/referee.h"
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
    parser.addPositionalArgument("filename", "Path of the logfile");
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

    Tracker* tracker;
    if (argCount > 2) {
        tracker = new Tracker(receiveTimeNanos,
            parser.positionalArguments().at(1).toFloat(),
            parser.positionalArguments().at(2).toFloat());
    } else {
        tracker = new Tracker(receiveTimeNanos, 0, 0);
    }
    tracker->reset();

    Timer* timer = new Timer;
    timer->setTime(receiveTimeNanos, 1.0);

    qRegisterMetaType<Status>("Status");
    qRegisterMetaType<Command>("Command");

    Strategy* strategy = new Strategy(timer, StrategyType::AUTOREF, nullptr);
    MiniProcessor processor(strategy);
    QThread* processorThread = new QThread();
    processor.moveToThread(processorThread);
    processorThread->start();

    QThread* strategyThread = new QThread();
    strategy->moveToThread(strategyThread);
    strategyThread->start();

    Command command(new amun::Command);
    amun::CommandStrategyLoad *load =
            command->mutable_strategy_autoref()->mutable_load();

    load->set_filename("/home/alex/robotics/autoref/autoref/init.lua");
    emit processor.sendCommand(command);

    Referee ref(false);

    // every 10ms in system time, execute tracking
    for (qint64 systemTimeNanos = receiveTimeNanos; receiveTimeNanos != -1; systemTimeNanos += 10000000) {

        do {
            // collect all packets until current system time
            if (msg_type == MESSAGE_SSL_VISION_2014) {
                tracker->queuePacket(visionFrame, receiveTimeNanos);
            } else if (msg_type == MESSAGE_SSL_REFBOX_2013) {
                ref.handlePacket(visionFrame);
            }
            auto packet = logFileIn.nextVisionPacket(visionFrame);
            receiveTimeNanos = packet.first;
            msg_type = packet.second;
        } while(receiveTimeNanos < systemTimeNanos && receiveTimeNanos != -1);

        tracker->process(systemTimeNanos);

        timer->setTime(systemTimeNanos, 1.0); // update timer for strategy

        Status status = tracker->worldState(systemTimeNanos);
        status->set_time(systemTimeNanos);

        ref.process(status->world_state());
        status->mutable_game_state()->CopyFrom(ref.gameState());

        processor.setCurrentStatus(status);
        emit processor.sendStatus(status); // trigger strategy
    }

    QThread::msleep(50); // wait for strategy thread to finish its work
    strategyThread->quit();
    strategyThread->deleteLater();
    strategy->deleteLater();
    processorThread->quit();
    processorThread->deleteLater();
    delete tracker;
    delete timer;

    return 0;
}
