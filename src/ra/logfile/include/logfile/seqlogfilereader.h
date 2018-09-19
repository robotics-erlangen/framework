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

#ifndef SEQLOGFILEREADER_H
#define SEQLOGFILEREADER_H

#include "protobuf/status.h"
#include <QObject>
#include <QString>
#include <QDataStream>
#include <QFile>
#include <QList>

class QMutex;

class SeqLogFileReader
{
public:
    // checks if the format matches and opens the log file if it applies
    //static QPair<StatusSource*, QString> tryOpen(QString filename);
    SeqLogFileReader();
    ~SeqLogFileReader();
    SeqLogFileReader(const SeqLogFileReader&) = delete;
    SeqLogFileReader& operator=(const SeqLogFileReader&) = delete;

    bool open(const QString &filename);
    bool isOpen() const { return m_file.isOpen(); }

    QString fileName() const { return m_file.fileName(); }
    QString errorMsg() const { return m_errorMsg; }

    Status readStatus();
    QPair<qint64,int>  readTimestamp(int packetIndex);
    void seek(qint64 offset, int num) ; // { m_file.seek(offset); }
    bool atEnd() { return m_stream.atEnd() || (m_version == Version2 && m_currentGroupIndex >= m_currentGroupMaxIndex); }
    qint64 pos() {return m_file.pos(); }
    void close();

private:
//    bool indexFile();
    bool readVersion();
    qint64 readTimestampVersion0();
    qint64 readTimestampVersion1();
    QPair<qint64,int> readTimestampVersion2(int packetIndex);

    mutable QMutex *m_mutex;
    QString m_errorMsg;

    QFile m_file;
    QDataStream m_stream;

    enum Version { Version0, Version1, Version2 };
    Version m_version;
    // a group of Status packages and an array of offsets
    QByteArray m_currentGroup;
    QList<qint32> m_currentGroupOffsets;
    int m_currentGroupIndex;
    int m_currentGroupMaxIndex;
    // how many packets are one group
    qint32 m_packageGroupSize;
    qint64 m_baseOffset;
};

#endif // SEQLOGFILEREADER_H
