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

#include "testtools.h"

#include <QRegExp>
#include <QStringList>
#include <iostream>
#include <google/protobuf/text_format.h>

std::pair<int, bool> TestTools::toExitCode(const QString &str)
{
    auto parts = str.split("\n");
    const QString &firstLine = parts.at(0);
    QRegExp regex("os\\.exit\\((\\d+)\\)$");
    if (regex.indexIn(firstLine) != -1) {
        const QString exitCodeStr = regex.capturedTexts().at(1);
        bool ok = false;
        int exitCode = exitCodeStr.toInt(&ok);
        return std::make_pair(exitCode, ok);
    }
    return std::make_pair(-1, false);
}

void TestTools::dumpLog(const amun::DebugValues &debug, int &outExitCode)
{
    for (const amun::StatusLog &entry: debug.log()) {
        QString text = stripHTML(QString::fromStdString(entry.text()));
        std::pair<int, bool> exitCodeOpt = toExitCode(text);
        if (exitCodeOpt.second) {
            // don't print exit codes
            outExitCode = exitCodeOpt.first;
        } else {
            std::cout << text.toStdString() << std::endl;
        }
    }
}

void TestTools::dumpProtobuf(const google::protobuf::Message &message)
{
    std::string s;
    google::protobuf::TextFormat::PrintToString(message, &s);
    std::cout << s << std::endl;
}

QString TestTools::stripHTML(const QString &logText)
{
    QString text = logText;
    return text
            .replace("&nbsp;", " ").replace("&gt;", ">")
            .replace("\n", "").replace("<br>", "\n")
            .remove(QRegExp("<[^>]*>"));
}

void TestTools::dumpEntrypoints(const amun::StatusStrategy &strategy)
{
    for (const auto& entrypoint: strategy.entry_point()) {
        std::cout << "Entrypoint: '" << entrypoint << "'" << std::endl;
    }
}
