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

#include "seshat/logfilereader.h"
#include "seshat/visionconverter.h"

int main(int argc, char* argv[])
{
    QCoreApplication app(argc, argv);
    app.setApplicationName("Vision Extractor");
    app.setOrganizationName("ER-Force");

    std::setlocale(LC_NUMERIC, "C");

    QCommandLineParser parser;
    parser.setApplicationDescription("Extracts a vision log from the ER-Force log format");
    parser.addHelpOption();
    parser.addPositionalArgument("source", "The log file to read");

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

    LogFileReader logfileIn;
    if (!logfileIn.open(arguments.first())) {
        std::cerr <<"Could not open file: "<<arguments.first().toStdString()<<std::endl;
        exit(1);
    }

    QString error = VisionExtractor::extractVision(logfileIn, parser.value(outputDirOption));

    if (!error.isEmpty()) {
        std::cerr <<error.toStdString()<<std::endl;
    }

    return 0;
}
