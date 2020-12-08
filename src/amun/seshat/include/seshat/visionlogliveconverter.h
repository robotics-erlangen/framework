/***************************************************************************
 *   Copyright 2018 Andreas Wendler                                        *
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

#ifndef VISIONLOGLIVECONVERTER_H
#define VISIONLOGLIVECONVERTER_H

#include "statussource.h"
#include "processor/referee.h"
#include "tracking/tracker.h"

#include <QObject>
#include <QString>
#include <QMap>
#include <QByteArray>
#include <QCache>

class VisionLogReader;

class VisionLogLiveConverter : public StatusSource
{
private:
    VisionLogLiveConverter(VisionLogReader *file);
public:
    ~VisionLogLiveConverter() override;
    // checks if the format matches and opens the log file if it applies
    static QPair<std::shared_ptr<StatusSource>, QString> tryOpen(QString filename);

    bool isOpen() const override { return true; }
    const QList<qint64>& timings() const override { return m_timings; }
    int packetCount() const override { return m_timings.size(); }
    Status readStatus(int packet) override;
    QString logUID() override { return "Visionlogs don't contain a UID"; }

public slots:
    void readPackets(int startPacket, int count) override;

private:
    qint64 processPacket(int packet, qint64 nextProcess); // in logfile packets, return the time of the read packet

private:
    VisionLogReader *m_logFile;
    Referee m_referee;
    Tracker m_tracker;
    // uniform times between the start and end of the logfile
    QList<qint64> m_timings;
    // index in m_timings to the packet number in the logfile with the first time that is larger than the index time
    QMap<int, int> m_timeIndex;
    int m_lastPacket;
    QByteArray m_visionFrame;
    bool m_lastFlipped;
    QString m_indexError;

    QCache<int, Status> m_packetCache;
};

#endif // VISIONLOGLIVECONVERTER_H
