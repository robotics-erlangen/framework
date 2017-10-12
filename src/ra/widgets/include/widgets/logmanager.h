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

#ifndef LOGMANAGER_H
#define LOGMANAGER_H

#include <QWidget>
#include <QQueue>
#include <QTimer>
#include "protobuf/status.h"
#include "core/timer.h"
#include "logfile/statussource.h"

class LogFileReader;
class Timer;

namespace Ui {
class LogManager;
}

class LogManager : public QWidget
{
    Q_OBJECT

public:
    explicit LogManager(QWidget *parent = 0);
    ~LogManager();
    void setStatusSource(StatusSource * source);
    Timer * getPlayTimer() { return &m_playTimer; }
    void setMinimalMode();
    void gotToEnd();
    void setPaused(bool p);

signals:
    void gotStatus(const Status &status);
    void gotPlayStatus(const Status &status);
    void triggerRead(int startFrame, int count);
    void clearPlayConsumers();
    void clearAll();
    void disableSkipping(bool disable);
    void resetBacklog();
    void setSpeed(int speed);
    void stepBackward();
    void stepForward();

private slots:
    void seekFrame(int frame);
    void seekPacket(int packet);
    void addStatus(int packet, const Status &status);
    void playNext();
    void togglePaused();
    void handlePlaySpeed(int value);
    void previousFrame();
    void nextFrame();

private:
    QString formatTime(qint64 time);
    void resetVariables();
    void initializeLabels();
    void connectStatusSource();
    void indexLogFile();

private:
    Ui::LogManager *ui;

    QThread *m_logthread;

    StatusSource *m_statusSource;

    QList<int> m_frames;
    qint64 m_startTime;
    qint64 m_duration;

    int m_exactSliderValue;
    bool m_scroll;

    QTimer m_timer;
    bool m_paused;
    Timer m_playTimer;

    int m_playEnd;

    QQueue<QPair<int,Status> > m_nextPackets;
    int m_nextPacket;
    int m_nextRequestPacket;
    int m_preloadedPackets;
    int m_spoolCounter;
};

#endif // LOGMANAGER_H
