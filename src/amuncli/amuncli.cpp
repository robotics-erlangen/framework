/***************************************************************************
 *   Copyright 2016 Michael Eischer                                        *
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

#include "amun/amunclient.h"
#include "connector.h"
#include <clocale>
#include <QCoreApplication>
#include <QCommandLineParser>

int main(int argc, char* argv[])
{
    QCoreApplication app(argc, argv);
    app.setApplicationName("Amun-CLI");
    app.setOrganizationName("ER-Force");

    std::setlocale(LC_NUMERIC, "C");

    QCommandLineParser parser;
    parser.setApplicationDescription("Amun command line interface");
    parser.addHelpOption();
    parser.addPositionalArgument("strategy_file", "Strategy init script");
    parser.addPositionalArgument("entrypoint", "Entrypoint, optional. Prints all entrypoints if missing", "[entrypoint]");

    QCommandLineOption asBlueOption({"b", "as-blue"}, "Run as blue strategy, defaults to yellow");
    QCommandLineOption debugOption({"v", "verbose"}, "Dump raw strategy output");
    QCommandLineOption simulatorConfig({"s", "simulator-config"}, "Which simulator config to use (field size etc.), loaded from the config directory", "file");
    parser.addOption(asBlueOption);
    parser.addOption(debugOption);
    parser.addOption(simulatorConfig);
    // parse command line, handles --version
    parser.process(app);

    int argCount = parser.positionalArguments().size();
    if (argCount != 1 && argCount != 2) {
        parser.showHelp(1);
    }

    const QStringList args = parser.positionalArguments();
    const QString initScript = args.at(0);
    const QString entryPoint = (argCount > 1) ? args.at(1) : QString();

    bool asBlue = parser.isSet(asBlueOption);
    bool debug = parser.isSet(debugOption);

    AmunClient amun;
    amun.start(true);

    Connector connector;
    connector.connect(&connector, &Connector::sendCommand, &amun, &AmunClient::sendCommand);
    connector.connect(&amun, &AmunClient::gotStatus, &connector, &Connector::handleStatus);

    if (parser.isSet(simulatorConfig)) {
        connector.setSimulatorConfigFile(parser.value(simulatorConfig));
    }
    connector.setInitScript(initScript);
    connector.setEntryPoint(entryPoint);
    connector.setStrategyColor(asBlue);
    connector.setDebug(debug);
    connector.start();

    return app.exec();
}
