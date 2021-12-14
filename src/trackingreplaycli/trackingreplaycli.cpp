/***************************************************************************
 *   Copyright 2021 Andreas Wendler                                        *
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
#include <clocale>
#include <QtGlobal>
#include <iostream>

#include "processor/trackingreplay.h"
#include "protobuf/status.h"
#include "seshat/logfilereader.h"
#include "core/timer.h"

int main(int argc, char* argv[])
{
    QCoreApplication app(argc, argv);
    app.setApplicationName("Tracking-replay-CLI");
    app.setOrganizationName("ER-Force");

    std::setlocale(LC_NUMERIC, "C");

    QCommandLineParser parser;
    parser.setApplicationDescription("Command line interface for tracking replay on ER-Force logs");
    parser.addHelpOption();
    parser.addVersionOption();
    parser.addPositionalArgument("logfile", "Log file to read");

//    QCommandLineOption asBlueOption({"b", "as-blue"}, "Run as blue strategy, defaults to yellow");
//    parser.addOption(asBlueOption);

    // parse command line
    parser.process(app);

    int argCount = parser.positionalArguments().size();
    if (argCount != 1) {
        parser.showHelp(1);
    }

    qRegisterMetaType<Status>("Status");
    qRegisterMetaType<Command>("Command");

    Timer timer;
    timer.setTime(0, 0);
    TrackingReplay replay(&timer);

    bool wasFlying = false;
    int flyCount = 0;
    replay.connect(&replay, &TrackingReplay::gotStatus, [&wasFlying, &flyCount](const Status &status) {
        if (status->has_world_state() && status->world_state().has_ball()) {
            bool flying = status->world_state().ball().p_z() != 0.0f;
            if (flying && !wasFlying) {
                flyCount++;
            }
            wasFlying = flying;
        }
    });

    LogFileReader logfile;
    const QStringList arguments = parser.positionalArguments();
    if (!logfile.open(arguments.first())) {
        qFatal("Error: could not open logfile");
    }

    for (int i = 0;i<logfile.packetCount();i++) {
        const Status &status = logfile.readStatus(i);
        replay.handleStatus(status);
    }

    std::cout <<flyCount<<std::endl;

    return 0;
}
