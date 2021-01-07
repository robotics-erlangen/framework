/***************************************************************************
 *   Copyright 2020 Tobias Heineken, Andreas Wendler                       *
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

#ifndef TIMEDSTATUSSOURCE_H
#define TIMEDSTATUSSOURCE_H

#include <QObject>
#include <QTimer>
#include <memory>

#include "statussource.h"
#include "bufferedstatussource.h"
#include "protobuf/status.h"
#include "protobuf/command.h"
#include "core/timer.h"

class TimedStatusSource : public QObject
{
    Q_OBJECT

public slots:
    void handleCommand(const Command& command);

public:
    TimedStatusSource(std::shared_ptr<StatusSource> source, QObject* parent = nullptr);
    // checks if this TimedStatusSource manages the supplied StatusSource source
    bool manages(const std::shared_ptr<StatusSource>& source) const {
        return m_statusSource.getStatusSource() == source;
    }
    const std::shared_ptr<StatusSource>& getStatusSource() const {
        return m_statusSource.getStatusSource();
    }
    // has to be called once and only once
    void start();
    void setPaused(bool pause);
    bool isPaused() const { return m_paused; }

private slots:
    void playNext();
    void handleNewData();

signals:
    void gotStatus(Status s);
    void jumped();

private:
    void indexLogFile();
    // Frame is timed, time in 0.1s (resolution for TimedStatusSource)
    void seekFrame(int time);
    // Packet is part of the log.
    void seekPacket(int frame);
    // seeks the frame by a given time, but moves backwards in time instead of forwards in case no packet with the supplied time could be found
    void seekFrameBackwards(int time);
    void handlePlaySpeed(int speed);
    void togglePaused();

private:
    QTimer m_timer;
    Timer m_playTimer;

    BufferedStatusSource m_statusSource;
    // time -> frame
    QList<int> m_frames;

    int m_nextPacket;
    int m_spoolCounter;

    int m_lastPacket;
    bool m_paused;
};

#endif
