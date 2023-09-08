/***************************************************************************
 *   Copyright 2023 Andreas Wendler, Christoph Schmidtmeier                *
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

#include "seshat/logfilereader.h"
#include "seshat/seqlogfilereader.h"

int main(int argc, char* argv[]) {
    QCoreApplication app(argc, argv);
    app.setApplicationName("LogUIDReader");
    app.setOrganizationName("ER-Force");

    std::setlocale(LC_NUMERIC, "C");

    QCommandLineParser parser;
    parser.setApplicationDescription("Tool to read the log UIDs from ER-Force log files");
    parser.addHelpOption();
    parser.addVersionOption();
    parser.addPositionalArgument("logfiles", "Log files to read", "files...");
    parser.process(app);

    for (const QString filename : parser.positionalArguments()) {
        SeqLogFileReader logfile;
        if (!logfile.open(filename)){
            std::cerr << "Error reading logfile " << filename.toStdString() << ": " << logfile.errorMsg().toStdString() << std::endl;
            continue;
        }

        const auto status = logfile.readStatus();
        const auto maybeId = LogFileReader::logUIDFromStatus(status);
        const std::string id = maybeId
            ? maybeId.value().toStdString()
            : "MISSING (run this log through the logcutter)";
        std::cout << id << "  " << filename.toStdString() << std::endl;
    }

    return 0;
}
