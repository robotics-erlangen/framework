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
#include "statussource.h"
#include "seqlogfilereader.h"
#include <QObject>
#include <QString>
#include <QDataStream>
#include <QFile>
#include <QList>

class QMutex;

class LogFileReader : public StatusSource
{
    Q_OBJECT
public:
    // checks if the format matches and opens the log file if it applies
    static QPair<std::shared_ptr<StatusSource>, QString> tryOpen(QString filename);
    explicit LogFileReader();
    explicit LogFileReader(const QList<qint64> &timings, const QList<qint64> &offsets, qint32 groupedPackages);
    explicit LogFileReader(SeqLogFileReader&& reader);
    ~LogFileReader() override;
    LogFileReader(const LogFileReader &) = delete;
    LogFileReader& operator= (const LogFileReader &) = delete;

    bool open(const QString &filename);
    bool isOpen() const override { return m_reader.isOpen(); }

    QString filename() const { return m_reader.fileName(); }
    QString errorMsg() const { return m_errorMsg; }

    const QList<qint64>& timings() const override { return m_timings; }
    // equals timings().size()
    int packetCount() const override { return m_packets.size(); }
    Status readStatus(int packet) override;

    qint32 groupSize() const { return m_reader.groupSize(); }

    QString logUID() override;

public slots:
    void readPackets(int startPacket, int count) override;

private:
    bool indexFile();
    void close();

    QString m_errorMsg;


    QList<SeqLogFileReader::Memento> m_packets;
    QList<qint64> m_timings;
    bool m_headerCorrect;
    SeqLogFileReader m_reader;
};

#endif // LOGFILEREADER_H
