/***************************************************************************
 *   Copyright 2019 Andreas Wendler                                        *
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

#include "path/standardsampler.h"
#include "core/rng.h"
#include "core/protobuffilereader.h"
#include "protobuf/pathfinding.pb.h"


int main(int argc, char* argv[])
{
    QCoreApplication app(argc, argv);
    app.setApplicationName("Trajectory-CLI");
    app.setOrganizationName("ER-Force");

    std::setlocale(LC_NUMERIC, "C");

    QCommandLineParser parser;
    parser.setApplicationDescription("Trajectory preprocessing");
    parser.addHelpOption();
    parser.addVersionOption();
    parser.addPositionalArgument("file", "Pathfinding input file to read");
    parser.addPositionalArgument("output", "File to output the result to");

    // parse command line
    parser.process(app);

    int argCount = parser.positionalArguments().size();
    if (argCount != 2) {
        parser.showHelp(1);
        return 0;
    }

    QString path = parser.positionalArguments().first();

    QList<pathfinding::PathFindingTask> situations;

    ProtobufFileReader reader;
    if (!reader.open(path, "KHONSU PATHFINDING LOG")) {
        qDebug() <<"Could not open file:"<<path;
        exit(1);
    }

    pathfinding::PathFindingTask situation;
    while (reader.readNext(situation)) {
        situations.append(situation);
        situation.Clear();
    }

    qDebug() <<"Situations: "<<situations.size();

    return 0;
}
