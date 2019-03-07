#ifndef TESTTOOLS_H
#define TESTTOOLS_H

#include <QString>
#include "protobuf/status.h"

namespace TestTools {
    std::pair<int, bool> toExitCode(const QString &str);
    void dumpLog(const amun::DebugValues &debug, int &outExitCode);
    QString stripHTML(const QString &logText);
    void dumpProtobuf(const google::protobuf::Message &message);
    void dumpEntrypoints(const amun::StatusStrategy &strategy);
}

#endif // TESTTOOLS_H
