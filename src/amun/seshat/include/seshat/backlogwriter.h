/***************************************************************************
 *   Copyright 2017 Andreas Wendler                                        *
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

#ifndef BACKLOGWRITER_H
#define BACKLOGWRITER_H

#include "protobuf/status.h"
#include "statussource.h"
#include <QContiguousCache>
#include <QObject>

class QString;
class QByteArray;
class LongLivingStatusCache;

class BacklogStatusSource : public StatusSource
{
    Q_OBJECT
public:
    BacklogStatusSource(const QContiguousCache<QByteArray> &backlog, const QContiguousCache<qint64> &timings);
    ~BacklogStatusSource() override {}
    bool isOpen() const override { return true; }

    const QList<qint64>& timings() const override { return m_timings; }
    // equals timings().size()
    int packetCount() const override { return m_timings.size(); }
    Status readStatus(int packet) override;
    QString logUID() override { return "Backlogs don't have a UID yet."; }

public slots:
    void readPackets(int startPacket, int count) override;

private:
    QContiguousCache<QByteArray> m_packets;
    QList<qint64> m_timings;
};


class BacklogWriter : public QObject
{
    Q_OBJECT
public:
    BacklogWriter(unsigned seconds);
    std::shared_ptr<StatusSource> makeStatusSource();

signals:
    void enableBacklogSave(bool enabled);
    void clearData();
    void finishedBacklogSave();

public slots:
    // these slots must be called in the same thread
    void clear();
    void handleStatus(const Status &status);
    void saveBacklog(QString filename/*, Status teamStatus*/, bool processEvents);

private:
    Status packetFromByteArray(QByteArray packetData);

private:
    // approximately, with both strategys running
    const int BACKLOG_SIZE_PER_SECOND = 570;

    QContiguousCache<QByteArray> m_packets;
    QContiguousCache<qint64> m_timings;
    LongLivingStatusCache *m_cache;

};

#endif // BACKLOGWRITER_H
