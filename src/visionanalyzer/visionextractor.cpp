/***************************************************************************
 *   Copyright 2018 Tobias Heineken                                        *
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

#include "logfile/logfilereader.h"
#include "visionlog/visionlogwriter.h"
int main(int argc, char* argv[])
{
    QCoreApplication app(argc, argv);
    app.setApplicationName("Vision Extractor");
    app.setOrganizationName("ER-Force");

    std::setlocale(LC_NUMERIC, "C");

    QCommandLineParser parser;
    parser.setApplicationDescription("Analyzer for recorded vision data");
    parser.addHelpOption();
    parser.addPositionalArgument("source", "The log file to read");

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

    LogFileReader logfileIn;
    logfileIn.open(parser.positionalArguments().first());

    VisionLogWriter logfileOut(parser.value(outputDirOption));

    for(int i = 0; i < logfileIn.packetCount(); ++i){
        Status current = logfileIn.readStatus(i);
        SSL_DetectionFrame visionFrame;
        visionFrame.set_frame_number(i);
    }
}
