/***************************************************************************
 *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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

#include "config/config.h"
#include "mainwindow.h"
#include <clocale>
#include <QApplication>
#include <QDir>
#include <QIcon>
#include <QCommandLineParser>

#include "v8.h"
#include "libplatform/libplatform.h"

int main(int argc, char* argv[])
{
    // TODO: use data directory
    v8::V8::InitializeICUDefaultLocation(argv[0]);
    v8::V8::InitializeExternalStartupData(argv[0]);
    std::unique_ptr<v8::Platform> platform = v8::platform::NewDefaultPlatform();
    v8::V8::InitializePlatform(platform.get());
    v8::V8::Initialize();

    QApplication app(argc, argv);
    app.setApplicationName("Ra");
    app.setOrganizationName("ER-Force");
// available starting with Qt 5.1
#if (QT_VERSION >= QT_VERSION_CHECK(5, 1, 0))
    qApp->setAttribute(Qt::AA_UseHighDpiPixmaps);
#endif
#ifdef Q_OS_OSX
    if (QDir::currentPath() == "/") {
        QDir::setCurrent(QDir::homePath());
    }
#endif

    std::setlocale(LC_NUMERIC, "C");

    QDir::addSearchPath("icon", QString(ERFORCE_DATADIR) + "/icons");

    QCommandLineParser parser;
    parser.setApplicationDescription("Ra");
    parser.addHelpOption();
    QCommandLineOption tournamentOption({"t", "game", "tournament"}, "Tournament mode");
    parser.addOption(tournamentOption);
    parser.process(app);

    MainWindow window(parser.isSet(tournamentOption));
    window.show();

    return app.exec();
}
