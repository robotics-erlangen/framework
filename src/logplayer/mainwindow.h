/***************************************************************************
 *   Copyright 2017 Michael Eischer, Philipp Nordhus, Andreas Wendler      *
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
#include <QList>
#include "logfile/combinedlogwriter.h"
#include "core/timer.h"
#include "protobuf/status.h"
#include "protobuf/command.h"

class LogOpener;
class RefereeStatusWidget;
class QThread;
class Plotter;
class Strategy;
class BlockingStrategyReplay;

namespace Ui {
class MainWindow;
}

class MainWindow : public QMainWindow
{
    Q_OBJECT

public:
    explicit MainWindow(QWidget *parent = 0);
    ~MainWindow() override;
    MainWindow(const MainWindow&) = delete;
    MainWindow& operator=(const MainWindow&) = delete;
    void selectFrame(int frame);

protected:
    void closeEvent(QCloseEvent *e) override;
    void dragEnterEvent(QDragEnterEvent *event) override;
    void dragMoveEvent(QDragMoveEvent *event) override;
    void dragLeaveEvent(QDragLeaveEvent *event) override;
    void dropEvent(QDropEvent *event) override;

public slots:
    void handleStatus(const Status &status);
    void handleReplayStatus(const Status &status);
    void logOpened();
    void openFile(const QString &filename);

signals:
    void gotStatus(const Status &status);
    void gotPlayStatus(const Status &status); // guarantees a continuous data stream
    void gotReplayStatus(const Status &status); // any status coming from the strategy
    void sendCommand(const Command &command);
    void enableStrategyCheckboxBlue(bool enable);
    void enableStrategyCheckboxYellow(bool enable);
    void reloadStrategy();
    void gotBacklogData(QList<Status> backlogData);
    void showPlotter();

private slots:
    void enableStrategyBlue(bool enable);
    void enableStrategyYellow(bool enable);
    void clearPlayConsumers();
    void clearAll();
    void openPlotter();

private:
    QString formatTime(qint64 time);
    void closeStrategy(int index);
    void createStrategy(int index);
    void sendResetDebugPacket(bool blue);

private:
    Ui::MainWindow *ui;
    RefereeStatusWidget *m_refereeStatus;

    QThread *m_strategyThreads[2];

    Command m_lastTeamInfo;
    bool m_lastTeamInfoUpdated;

    Plotter *m_plotter;

    Strategy *m_strategys[2];
    BlockingStrategyReplay *m_strategyBlocker[2];
    CombinedLogWriter m_logWriter;

    Timer *m_playTimer;

    LogOpener * m_logOpener;
};

#endif // MAINWINDOW_H
