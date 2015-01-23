/***************************************************************************
 *   Copyright 2014 Michael Eischer, Philipp Nordhus                       *
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

#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include <QMap>
#include <QFile>
#include <QTimer>
#include <QQueue>
#include <QPair>
#include <QList>
#include "core/timer.h"
#include "protobuf/status.h"

class LogFileReader;
class RefereeStatusWidget;
class QLabel;
class QThread;
class Plotter;

namespace Ui {
class MainWindow;
}

class MainWindow : public QMainWindow
{
    Q_OBJECT
    
public:
    explicit MainWindow(QWidget *parent = 0);
    ~MainWindow();
    void openFile(QString filename);

protected:
    void closeEvent(QCloseEvent *e);

signals:
    void gotStatus(const Status &status);
    void gotPlayStatus(const Status &status); // guarantees a continuous data stream
    void triggerRead(int startFrame, int count);

private slots:
    void openFile();
    void previousFrame();
    void nextFrame();
    void seekFrame(int frame);
    void seekPacket(int packet);
    void addStatus(int packet, const Status &status);
    void playNext();
    void togglePaused();
    void handlePlaySpeed(int value);

private:
    void closeFile();
    void clearPlayConsumers();
    void initializeLabels();
    void setPaused(bool p);
    QString formatTime(qint64 time);

private:
    Ui::MainWindow *ui;
    RefereeStatusWidget *m_refereeStatus;

    QThread *m_logthread;
    LogFileReader *m_logreader;

    QList<int> m_frames;
    qint64 m_startTime;
    qint64 m_duration;

    QQueue<QPair<int,Status> > m_nextPackets;
    int m_nextPacket;
    int m_nextRequestPacket;
    int m_preloadedPackets;
    int m_spoolCounter;

    int m_playEnd;

    QTimer m_timer;
    bool m_paused;
    Timer m_playTimer;

    int m_exactSliderValue;
    bool m_scroll;

    Plotter *m_plotter;
};

#endif // MAINWINDOW_H
