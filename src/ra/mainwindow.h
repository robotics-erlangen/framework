/***************************************************************************
 *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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

#include "amun/amunclient.h"
#include "logfile/combinedlogwriter.h"
#include <QMainWindow>
#include <QSet>

class BacklogWriter;
class CombinedLogWriter;
class ConfigDialog;
class DebuggerConsole;
class InputManager;
class InternalReferee;
class LogFileWriter;
class Plotter;
class RefereeStatusWidget;
class RobotParametersDialog;
class QLabel;
class QModelIndex;
class QThread;
class QString;
namespace Ui {
    class MainWindow;
}

class MainWindow : public QMainWindow
{
    Q_OBJECT

public:
    explicit MainWindow(QWidget *parent = 0);
    ~MainWindow() override;

signals:
    void gotStatus(const Status &status);

protected:
    void closeEvent(QCloseEvent *e) override;

private slots:
    void handleCheckHaltStatus(const Status &status);
    void handleStatus(const Status &status);
    void sendCommand(const Command &command);
    void setSimulatorEnabled(bool enabled);
    void setInternalRefereeEnabled(bool enabled);
    void setTransceiver(bool enabled);
    void disableTransceiver();
    void toggleFlip();
    void setCharge(bool charge);
    void showConfigDialog();
    void liveMode();
    void showBacklogMode();

private:
    void sendFlip();
    void toggleInstantReplay(bool enable);

private:
    Ui::MainWindow *ui;
    AmunClient m_amun;
    Plotter *m_plotter;
    RefereeStatusWidget *m_refereeStatus;
    InputManager *m_inputManager;
    InternalReferee *m_internalReferee;
    RobotParametersDialog *m_robotParametersDialog;
    ConfigDialog *m_configDialog;
    bool m_flip;
    QLabel *m_transceiverStatus;
    bool m_transceiverActive;
    qint32 m_lastStageTime;
    QLabel *m_logTimeLabel;
    CombinedLogWriter m_logWriter;
    amun::GameState::State m_lastRefState;

    DebuggerConsole *m_console;
};

#endif // MAINWINDOW_H
