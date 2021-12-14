/***************************************************************************
 *   Copyright 2020 Andreas Wendler                                        *
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
#include <QDebug>

#include "visionlog/visionlogreader.h"
#include "visionlog/visionlogwriter.h"


int main(int argc, char* argv[])
{
    QCoreApplication app(argc, argv);
    app.setApplicationName("Visionlogcutter-CLI");
    app.setOrganizationName("ER-Force");

    std::setlocale(LC_NUMERIC, "C");

    QCommandLineParser parser;
    parser.setApplicationDescription("Vision log cutter command line interface");
    parser.addHelpOption();
    parser.addVersionOption();
    parser.addPositionalArgument("logfile in", "Log files to read");
    parser.addPositionalArgument("logfile out", "Logfile to write conatining parts of original log");

    QCommandLineOption packetStart({"s", "start-packet"}, "First packet in the input log to use", "first packet");
    QCommandLineOption packetEnd({"l", "e", "last-packet"}, "Last packet in the input log to use (inclusive)", "last packet");

    parser.addOption(packetStart);
    parser.addOption(packetEnd);

    // parse command line
    parser.process(app);

    const QStringList arguments = parser.positionalArguments();
    int argCount = arguments.size();
    if (argCount != 2) {
        parser.showHelp(1);
    }

    VisionLogReader reader(arguments[0]);
    if (!reader.errorMessage().isEmpty()) {
        qDebug() <<"Could not read input log: "<<reader.errorMessage();
        exit(1);
    }

    VisionLogWriter writer(arguments[1]);
    if (!writer.isOpen()) {
        qDebug() <<"Could not open output log";
        exit(1);
    }

    int startPacket = parser.isSet(packetStart) ? parser.value(packetStart).toInt() : 0;
    int packetCount = reader.indexFile().size();
    int endPacket = parser.isSet(packetEnd) ? parser.value(packetEnd).toInt() : packetCount - 1;

    if (startPacket >= endPacket || startPacket < 0 || endPacket >= packetCount) {
        qDebug() <<"Invalid start or end packet number";
        exit(1);
    }

    for (int i = startPacket;i<=endPacket;i++) {
        QByteArray data;
        auto info = reader.visionPacketByIndex(i, data);
        if (info.second == VisionLog::MessageType::MESSAGE_SSL_REFBOX_2013) {
            SSL_Referee referee;
            if (!referee.ParseFromArray(data.data(), data.size())) {
                qDebug() <<"Could not parse referee packet";
                exit(1);
            }
            writer.addRefereePacket(referee, info.first);
        } else if (info.second == VisionLog::MessageType::MESSAGE_SSL_VISION_2014) {
            SSL_WrapperPacket vision;
            if (!vision.ParseFromArray(data.data(), data.size())) {
                qDebug() <<"Could not parse vision packet";
                exit(1);
            }
            writer.addVisionPacket(vision, info.first);
        }
    }

    return 0;
}
