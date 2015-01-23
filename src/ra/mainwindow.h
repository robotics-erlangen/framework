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

#include "amunclient.h"
#include "protobuf/robot.pb.h"
#include <QMainWindow>
#include <QSet>

class ConfigDialog;
class InputManager;
class InternalReferee;
class LogFileWriter;
class Plotter;
class RefereeStatusWidget;
class RobotParametersDialog;
class QLabel;
class QModelIndex;
class QThread;
namespace Ui {
    class MainWindow;
}

class MainWindow : public QMainWindow
{
    Q_OBJECT

public:
    explicit MainWindow(quint16 visionPort, QWidget *parent = 0);
    ~MainWindow();

signals:
    void gotStatus(const Status &status);

protected:
    void closeEvent(QCloseEvent *e);

private slots:
    void handleStatus(const Status &status);
    void sendCommand(const Command &command);
    void setSimulatorEnabled(bool enabled);
    void setInternalRefereeEnabled(bool enabled);
    void setTransceiver(bool enabled);
    void disableTransceiver();
    void toggleFlip();
    void setRecording(bool record);
    void setCharge(bool charge);
    void showConfigDialog();

private:
    void sendFlip();

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

    LogFileWriter *m_logFile;
    QThread *m_logFileThread;
    qint64 m_lastTime;
    SSL_Referee::Stage m_lastStage;
    robot::Team m_yellowTeam;
    robot::Team m_blueTeam;
    QString m_yellowTeamName;
    QString m_blueTeamName;
};

#endif // MAINWINDOW_H
