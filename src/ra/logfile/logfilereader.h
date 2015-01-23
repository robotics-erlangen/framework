/***************************************************************************
 *   Copyright 2015 Michael Eischer                                        *
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

#ifndef LOGFILEREADER_H
#define LOGFILEREADER_H

#include "protobuf/status.h"
#include <QObject>
#include <QString>
#include <QDataStream>
#include <QFile>
#include <QList>

class QMutex;

class LogFileReader : public QObject
{
    Q_OBJECT
public:
    explicit LogFileReader();
    ~LogFileReader();

    bool open(QString filename);
    void close();
    bool isOpen() const { return m_file.isOpen(); }

    QString filename() const { return m_file.fileName(); }
    QString errorMsg() const { return m_errorMsg; }

    const QList<qint64>& timings() const { return m_timings; }
    // equals timings().size()
    int packetCount() const { return m_packets.size(); }
    Status readStatus(int packet);

public slots:
    void readPackets(int startPacket, int count);

signals:
    void gotStatus(int packet, const Status &status);

private:
    bool readVersion();
    qint64 readTimestampVersion0();
    qint64 readTimestampVersion1();

    mutable QMutex *m_mutex;
    QString m_errorMsg;

    QFile m_file;
    QDataStream m_stream;

    enum Version { Version0, Version1 };
    Version m_version;
    QList<qint64> m_packets;
    QList<qint64> m_timings;
};

#endif // LOGFILEREADER_H
