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

#include <QCoreApplication>
#include <QCommandLineParser>
#include <clocale>
#include <QtGlobal>
#include <iostream>

#include "logprocessor.h"
#include "logfile/logfilewriter.h"


int main(int argc, char* argv[])
{
    QCoreApplication app(argc, argv);
    app.setApplicationName("Logcutter-CLI");
    app.setOrganizationName("ER-Force");

    std::setlocale(LC_NUMERIC, "C");

    QCommandLineParser parser;
    parser.setApplicationDescription("Log cutter command line interface");
    parser.addHelpOption();
    parser.addVersionOption();
    parser.addPositionalArgument("logfile", "Log files to read (repeated)", "logfile ...");

    QCommandLineOption outputLog({"o", "output"}, "Location to output the resulting log file","outputFile", "lc_out.log");
    QCommandLineOption flags({"f", "flags"}, "Flags for the logprocessor", "flags", "0");
    QCommandLineOption abortExecution({"d", "die-on-error"}, "Die when a problem occurs");

    parser.addOption(outputLog);
    parser.addOption(abortExecution);
    parser.addOption(flags);

    // parse command line
    parser.process(app);

    int argCount = parser.positionalArguments().size();
    if (argCount == 0) {
        parser.showHelp(1);
    }

    std::cout << "[ DEBUG] " << parser.value(outputLog).toStdString() << std::endl;
    LogProcessor lp(parser.positionalArguments(), parser.value(outputLog), LogProcessor::Options(parser.value(flags).toInt()));
    QObject::connect(&lp, &LogProcessor::progressUpdate, [](const QString& progress){
            std::cout << "[STATUS] " << progress.toStdString() << std::endl;
    });
    bool abort = parser.isSet(abortExecution);
    QObject::connect(&lp, &LogProcessor::error, [abort](const QString& error){
            std::cerr << "[ ERROR] " << error.toStdString() << std::endl;
            if (abort) exit(1);
    });
    QObject::connect(&lp, &LogProcessor::outputSelected, [](const LogFileWriter* writer){
            std::cout << "[ INFO ] " << "Outputfile selected: " << writer->filename().toStdString() << std::endl;
    });

    lp.run();

    return 0;
}
