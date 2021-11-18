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

#include "logfilehasher.h"
#include "seqlogfilereader.h"
#include "logfilewriter.h"

#include <google/protobuf/util/json_util.h>
#include <QCryptographicHash>
#include <QTemporaryFile>
#ifndef Q_OS_WIN
#include <stdio.h>
#else
#include <windows.h>
#endif

static void collect(SeqLogFileReader& reader, LogFileHasher& hasher)
{
    for (int i=0; !reader.atEnd() && i < LogFileHasher::HASHED_PACKAGES; ++i) {
        Status current = reader.readStatus();
        hasher.add(current);
    }
}

static std::string hash(const Status& collected)
{
    google::protobuf::util::JsonPrintOptions jpo;
    jpo.add_whitespace = true;
    jpo.always_print_primitive_fields = true;
    jpo.always_print_enums_as_ints = false;
    jpo.preserve_proto_field_names = true;
    std::string s;
    google::protobuf::util::MessageToJsonString(*collected, &s, jpo);
    QByteArray res = QCryptographicHash::hash(QByteArray(s.c_str()), QCryptographicHash::Sha512).toHex();
    std::string out(res.constData());
    return out;
}

LogFileHasher::LogFileHasher()
{
    m_state->set_time(0);
}

void LogFileHasher::add(const Status& status)
{
    if (m_collected < HASHED_PACKAGES) {
        m_state->MergeFrom(*status);
        ++m_collected;
    }
}

void LogFileHasher::clear()
{
    m_collected = 0;
    m_state->Clear();
}

std::string LogFileHasher::takeResult() const
{
    return ::hash(m_state);
}

std::string LogFileHasher::hash(SeqLogFileReader& reader)
{
    SeqLogFileReader::Memento mem = reader.createMemento();
    LogFileHasher hasher;
    collect(reader, hasher);
    reader.applyMemento(mem);
    return hasher.takeResult();
}

QString LogFileHasher::replace(QString logname, QString output)
{
#ifndef Q_OS_WIN
    if (rename(logname.toUtf8().constData(), output.toUtf8().constData()) != 0) {
        return QString("Rename failed");
    }
#else
    QString tmpName = logname;
    QString windowsHeader = QString("\\\\?\\");
    tmpName.push_front(windowsHeader);
    output.push_front(windowsHeader);
    if (MoveFileExW((const wchar_t*) tmpName.utf16(), (const wchar_t*) output.utf16(), MOVEFILE_REPLACE_EXISTING) == 0) {
        return QString("Rename Windows failed");
    }
#endif
    return QString("");
}
