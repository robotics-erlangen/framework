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
