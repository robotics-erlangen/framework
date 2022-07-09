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

#include "logcutter/logprocessor.h"
#include "seshat/logfilewriter.h"


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
    QCommandLineOption abortExecution({"d", "die-on-error"}, "Die when a problem occurs");
    QCommandLineOption noHash("no-hash", "Do not insert any hash into the resulting logfile");

    parser.addOption(outputLog);
    parser.addOption(abortExecution);
    parser.addOption(noHash);

    QCommandLineOption flags({"f", "flags"}, "Flags for the logprocessor. This overwrites the other cut options", "flags", "0");
    QCommandLineOption cutHalt("cut-halt", "Remove halt sections");
    QCommandLineOption cutNonGame("cut-non-game", "Remove non game sections");
    QCommandLineOption cutStop("cut-stop", "Remove stop sections");
    QCommandLineOption cutBallPlacement("cut-ball-placement", "Remove ball placement sections");
    QCommandLineOption cutSimulated("cut-simulated", "Remove simulated sections");
    QCommandLineOption cutDebugTree("cut-debug-tree", "Remove debug tree output");
    QCommandLineOption cutLogOutput("cut-log-output", "Remove log text output");
    QCommandLineOption cutVisualizations("cut-visualizations", "Remove visualizations");
    QCommandLineOption cutPlot("cut-plot", "Remove plotted values");
    QCommandLineOption removeDebugValues("remove-debug-values", "Remove all debug values. This is equivalent to setting cut-debug-tree, cut-visualizations, cut-plot and cut-log-output");
    QCommandLineOption cutGit("cut-git", "Remove the git information");

    parser.addOption(flags);
    parser.addOption(cutHalt);
    parser.addOption(cutNonGame);
    parser.addOption(cutStop);
    parser.addOption(cutBallPlacement);
    parser.addOption(cutSimulated);
    parser.addOption(cutDebugTree);
    parser.addOption(cutLogOutput);
    parser.addOption(cutVisualizations);
    parser.addOption(cutPlot);
    parser.addOption(removeDebugValues);
    parser.addOption(cutGit);

    // parse command line
    parser.process(app);

    int argCount = parser.positionalArguments().size();
    if (argCount == 0) {
        parser.showHelp(1);
    }

    LogProcessor::Options options = LogProcessor::Option::NoOptions;
    if (parser.isSet(flags)) {
        options = LogProcessor::Options(parser.value(flags).toInt());
    } else {
        using O = LogProcessor::Option;
        if (parser.isSet(cutHalt))
            options |= O::CutHalt;
        if (parser.isSet(cutNonGame))
            options |= O::CutNonGame;
        if (parser.isSet(cutStop))
            options |= O::CutStop;
        if (parser.isSet(cutBallPlacement))
            options |= O::CutBallplacement;
        if (parser.isSet(cutSimulated))
            options |= O::CutSimulated;
        if (parser.isSet(cutDebugTree))
            options |= O::CutDebugTree;
        if (parser.isSet(cutLogOutput))
            options |= O::CutLogOutput;
        if (parser.isSet(cutVisualizations))
            options |= O::CutVisualizations;
        if (parser.isSet(cutPlot))
            options |= O::CutPlot;
        if (parser.isSet(removeDebugValues))
            options |= O::CutDebugTree | O::CutLogOutput | O::CutVisualizations | O::CutPlot;
        if (parser.isSet(cutGit))
            options |= O::CutGit;
    }

    std::cout << "[ DEBUG] " << parser.value(outputLog).toStdString() << std::endl;
    LogProcessor lp(
        parser.positionalArguments(),
        parser.value(outputLog),
        options,
        nullptr,
        parser.isSet(noHash)
    );
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
