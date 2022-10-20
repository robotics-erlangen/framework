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
#include "aboutus.h"
#include "gitinfodialog.h"
#include "loggingsuite.h"
#include <QMainWindow>
#include <QSet>
#include <QList>

class BacklogWriter;
class CombinedLogWriter;
class ConfigDialog;
class DebuggerConsole;
class InputManager;
class InternalReferee;
class LogFileWriter;
class Plotter;
class RefereeStatusWidget;
class QActionGroup;
class QLabel;
class QModelIndex;
class QThread;
class QString;
class Timer;
class LogOpener;
class RobotUIAction;
class LogLabel;
namespace Ui {
    class MainWindow;
}

class MainWindow : public QMainWindow
{
    Q_OBJECT

public:
    explicit MainWindow(bool tournamentMode, bool isRa, QWidget *parent = 0);
    ~MainWindow() override;
    MainWindow(const MainWindow&) = delete;
    MainWindow& operator=(const MainWindow&) = delete;
    void selectFrame(int amm);
    void openFile(QString fileName);

signals:
    void gotStatus(const Status &status);

protected:
    void closeEvent(QCloseEvent *e) override;
    void dragEnterEvent(QDragEnterEvent *event) override;
    void dragMoveEvent(QDragMoveEvent *event) override;
    void dragLeaveEvent(QDragLeaveEvent *event) override;
    void dropEvent(QDropEvent *event) override;

private slots:
    void handleStatus(const Status &status);
    void sendCommand(const Command &command);
    void setSimulatorEnabled(bool enabled);
    void setInternalRefereeEnabled(bool enabled);
    void setTransceiver(bool enabled);
    void disableTransceiver();
    void setCharge(bool charge);
    void showConfigDialog();
    void liveMode();
    void showBacklogMode();
    void simulatorSetupChanged(QAction * action);
    void saveConfig();
    void switchToWidgetConfiguration(int configId, bool forceUpdate = false);
    void showDirectoryDialog();
    void logOpened(QString name, bool errorOccurred);
    void togglePause();
    void showPlotter();
    void setSpeed(int speed);
    void udpateSpeedActionsEnabled();
    void useLogfileLocation(bool enable);
    void exportVisionLog();
    void requestLogUid();
    void searchUid(QString uid);
    void requestUidInsertWindow();
    void changeDivision(world::Geometry::Division division);
    void updatePalette(QPalette palette);
    void pauseAll();

private:
    void toggleHorusModeWidgets(bool enable);
    void loadConfig(bool doRestoreGeometry, uint configId);
    void raMode();
    void horusMode();
    void createLogWriterConnections(Logsuite *suite);
    void updateSimulatorSetup(QString setupFile);

private:
    Ui::MainWindow *ui;
    AmunClient m_amun;
    Plotter *m_plotter;
    RefereeStatusWidget *m_refereeStatus;
    InputManager *m_inputManager;
    InternalReferee *m_internalReferee;
    ConfigDialog *m_configDialog;
    AboutUs *m_aboutUs;
	GitInfoDialog *m_gitInfo;
    QLabel *m_transceiverStatus;
    bool m_transceiverActive;
    qint32 m_lastStageTime;
    LogLabel *m_logTimeLabel;
    Logsuite *m_loggingUiRa, *m_loggingUiHorus;
    amun::GameState::State m_lastRefState;
    DebuggerConsole *m_console;
    bool m_isTournamentMode;
    uint m_currentWidgetConfiguration;
    LogOpener * m_logOpener;
    QString m_horusTitleString;
    QActionGroup* m_simulatorSetupGroup;
    RobotUIAction *m_robotDoubleClickAction;
    RobotUIAction *m_robotCtrlClickAction;

    bool m_transceiverRealWorld = false, m_transceiverSimulator = true;
    bool m_chargeRealWorld = false, m_chargeSimulator = true;

    const std::string TEAM_NAME = "Replace with your own team name!";
};

#endif // MAINWINDOW_H
