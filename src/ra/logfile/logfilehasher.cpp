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
#include <Windows.h>
#endif

static Status collect(SeqLogFileReader& reader)
{
    Status merged(new amun::Status);
    merged->set_time(0);
    for(int i=0; !reader.atEnd() && i < 100; ++i){
        Status current = reader.readStatus();
        merged->MergeFrom(*current);
    }
    return merged;
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


std::string LogFileHasher::hash(SeqLogFileReader& reader)
{
    SeqLogFileReader::Memento mem = reader.createMemento();
    Status collected = collect(reader);
    reader.applyMemento(mem);
    return hash(collected);
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
    if (MoveFileEx(tmpName.utf16(), output.utf16(), MOVEFILE_REPLACE_EXISTING) == 0) {
        return QString("Rename Windows failed");
    }
#endif
	return QString("");
}
