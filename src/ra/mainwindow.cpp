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

#include "configdialog.h"
#include "mainwindow.h"
#include "internalreferee.h"
#include "plotter/plotter.h"
#include "robotparametersdialog.h"
#include "refereestatuswidget.h"
#include "ui_mainwindow.h"
#include "logfile/logfilewriter.h"
#include "core/timer.h"
#include "input/inputmanager.h"
#include <QDateTime>
#include <QFile>
#include <QFileDialog>
#include <QLabel>
#include <QMetaType>
#include <QSettings>
#include <QThread>

MainWindow::MainWindow(quint16 visionPort, QWidget *parent) :
    QMainWindow(parent),
    ui(new Ui::MainWindow),
    m_transceiverActive(false),
    m_logFile(NULL),
    m_logFileThread(NULL)
{
    qRegisterMetaType<SSL_Referee::Command>("SSL_Referee::Command");
    qRegisterMetaType<SSL_Referee::Stage>("SSL_Referee::Stage");

    setWindowIcon(QIcon("icon:ra.svg"));
    ui->setupUi(this);

    // setup icons
    ui->actionEnableTransceiver->setIcon(QIcon("icon:32/network-wireless.png"));
    ui->actionFlipSides->setIcon(QIcon("icon:32/change-ends.png"));
    ui->actionRecord->setIcon(QIcon("icon:32/media-record.png"));
    ui->actionChargeKicker->setIcon(QIcon("icon:32/capacitor.png"));
    ui->actionSimulator->setIcon(QIcon("icon:32/computer.png"));
    ui->actionInternalReferee->setIcon(QIcon("icon:32/whistle.png"));
    ui->actionInputDevices->setIcon(QIcon("icon:32/input-gaming.png"));
    ui->actionPlotter->setIcon(QIcon("icon:32/plotter.png"));
    ui->actionConfiguration->setIcon(QIcon("icon:32/preferences-system.png"));

    ui->actionQuit->setShortcut(QKeySequence::Quit);

    // setup status bar
    m_transceiverStatus = new QLabel("Transceiver");
    QPalette p = m_transceiverStatus->palette();
    p.setColor(QPalette::WindowText, Qt::red);
    m_transceiverStatus->setPalette(p);
    statusBar()->addWidget(m_transceiverStatus);

    m_refereeStatus = new RefereeStatusWidget;
    statusBar()->addPermanentWidget(m_refereeStatus);

    // setup ui parts that send commands
    m_internalReferee = new InternalReferee(this);
    connect(m_internalReferee, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));
    connect(ui->referee, SIGNAL(changeCommand(SSL_Referee::Command)), m_internalReferee, SLOT(changeCommand(SSL_Referee::Command)));
    connect(ui->referee, SIGNAL(changeStage(SSL_Referee::Stage)), m_internalReferee, SLOT(changeStage(SSL_Referee::Stage)));
    connect(ui->referee, SIGNAL(changeYellowKeeper(uint)), m_internalReferee, SLOT(changeYellowKeeper(uint)));
    connect(ui->referee, SIGNAL(changeBlueKeeper(uint)), m_internalReferee, SLOT(changeBlueKeeper(uint)));

    m_inputManager = new InputManager(this);
    connect(m_inputManager, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));
    connect(m_inputManager, SIGNAL(toggleTransceiver()), ui->actionEnableTransceiver, SLOT(toggle()));
    connect(m_inputManager, SIGNAL(sendRefereeCommand(SSL_Referee::Command)), m_internalReferee, SLOT(changeCommand(SSL_Referee::Command)));
    ui->input->init(m_inputManager);

    connect(ui->robots, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));
    ui->robots->init(this, m_inputManager);

    connect(ui->simulator, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));

    m_robotParametersDialog = new RobotParametersDialog(this);
    connect(m_robotParametersDialog, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));

    connect(ui->field, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));

    m_configDialog = new ConfigDialog(this);
    connect(m_configDialog, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));

    // setup visualization only parts of the ui
    connect(ui->visualization, SIGNAL(itemsChanged(QStringList)), ui->field, SLOT(visualizationsChanged(QStringList)));

    m_plotter = new Plotter(this);

    // connect the menu actions
    connect(ui->actionEnableTransceiver, SIGNAL(toggled(bool)), SLOT(setTransceiver(bool)));
    connect(ui->actionDisableTransceiver, SIGNAL(triggered(bool)), SLOT(disableTransceiver()));
    addAction(ui->actionDisableTransceiver); // only actions that are used somewhere are triggered
    connect(ui->actionChargeKicker, SIGNAL(toggled(bool)), SLOT(setCharge(bool)));
    connect(ui->actionFlipSides, SIGNAL(triggered()), SLOT(toggleFlip()));

    connect(ui->actionSimulator, SIGNAL(toggled(bool)), SLOT(setSimulatorEnabled(bool)));
    connect(ui->actionInternalReferee, SIGNAL(toggled(bool)), SLOT(setInternalRefereeEnabled(bool)));
    connect(ui->actionInputDevices, SIGNAL(toggled(bool)), m_inputManager, SLOT(setEnabled(bool)));

    connect(ui->actionConfiguration, SIGNAL(triggered()), SLOT(showConfigDialog()));
    connect(ui->actionPlotter, SIGNAL(triggered()), m_plotter, SLOT(show()));
    connect(ui->actionRecord, SIGNAL(toggled(bool)), SLOT(setRecording(bool)));
    connect(ui->actionRobotParameters, SIGNAL(triggered()), m_robotParametersDialog, SLOT(exec()));

    // setup data distribution
    connect(this, SIGNAL(gotStatus(Status)), ui->field, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), m_plotter, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->visualization, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->debugTree, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), m_internalReferee, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->referee, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->timing, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), m_refereeStatus, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->log, SLOT(handleStatus(Status)));

    // start amun
    connect(&m_amun, SIGNAL(gotStatus(Status)), SLOT(handleStatus(Status)));
    m_amun.start(visionPort);

    // restore configuration and initialize everything
    ui->input->load();
    ui->robots->load();
    ui->visualization->load();
    m_configDialog->load();

    QSettings s;

    s.beginGroup("MainWindow");
    restoreGeometry(s.value("Geometry").toByteArray());
    restoreState(s.value("State").toByteArray());
    ui->splitterV->restoreState(s.value("SplitterV").toByteArray());
    ui->splitterH->restoreState(s.value("SplitterH").toByteArray());
    s.endGroup();

    ui->actionSimulator->setChecked(s.value("Simulator/Enabled").toBool());
    ui->actionInternalReferee->setChecked(s.value("Referee/Internal").toBool());
    if (!ui->actionInternalReferee->isChecked()) {
        // correctly handle disabled referee
        setInternalRefereeEnabled(false);
    }
    ui->actionInputDevices->setChecked(s.value("InputDevices/Enabled").toBool());

    m_flip = s.value("Flip").toBool();
    sendFlip();
}

MainWindow::~MainWindow()
{
    if (m_logFileThread) {
        m_logFileThread->quit();
        m_logFileThread->wait();
        delete m_logFileThread;
    }
    delete m_logFile;
    delete ui;
}

void MainWindow::closeEvent(QCloseEvent *e)
{
    QSettings s;

    s.beginGroup("MainWindow");
    s.setValue("Geometry", saveGeometry());
    s.setValue("State", saveState());
    s.setValue("SplitterH", ui->splitterH->saveState());
    s.setValue("SplitterV", ui->splitterV->saveState());
    s.endGroup();

    s.setValue("Simulator/Enabled", ui->actionSimulator->isChecked());
    s.setValue("Referee/Internal", ui->actionInternalReferee->isChecked());
    s.setValue("InputDevices/Enabled", ui->actionInputDevices->isChecked());

    // make sure the plotter gets a close event
    // as it has this MainWindow as parent, qt won't send it a close event
    // on application exit
    m_plotter->close();

    QMainWindow::closeEvent(e);
}

void MainWindow::handleStatus(const Status &status)
{
    if (status->has_transceiver()) {
        const amun::StatusTransceiver &t = status->transceiver();

        if (t.active() != m_transceiverActive) {
            m_transceiverActive = t.active();

            QPalette p = m_transceiverStatus->palette();
            if (m_transceiverActive) {
                p.setColor(QPalette::WindowText, Qt::darkGreen);
            } else {
                p.setColor(QPalette::WindowText, Qt::red);
            }
            m_transceiverStatus->setPalette(p);
        }

        m_transceiverStatus->setToolTip(QString::fromStdString(t.error()));
    }

    // keep team names for the logfile
    if (status->has_game_state()) {
        const amun::GameState &state = status->game_state();

        const SSL_Referee_TeamInfo &teamBlue = state.blue();
        m_blueTeamName = QString::fromStdString(teamBlue.name());

        const SSL_Referee_TeamInfo &teamYellow = state.yellow();
        m_yellowTeamName = QString::fromStdString(teamYellow.name());
    }

    // keep team configurations for the logfile
    if (status->has_team_yellow()) {
        m_yellowTeam.CopyFrom(status->team_yellow());
    }
    if (status->has_team_blue()) {
        m_blueTeam.CopyFrom(status->team_blue());
    }
    m_lastTime = status->time();

    emit gotStatus(status);
}

void MainWindow::sendCommand(const Command &command)
{
    m_amun.sendCommand(command);
}

void MainWindow::setSimulatorEnabled(bool enabled)
{
    m_transceiverStatus->setVisible(!enabled);

    Command command(new amun::Command);
    amun::CommandSimulator *sim = command->mutable_simulator();
    sim->set_enable(enabled);
    sendCommand(command);
}

void MainWindow::setInternalRefereeEnabled(bool enabled)
{
    Command command(new amun::Command);
    amun::CommandReferee *referee = command->mutable_referee();
    referee->set_active(enabled);
    sendCommand(command);
    // show internal referee when it's activated
    if (enabled) {
        ui->dockReferee->setVisible(true);
    }
    // force auto reload of strategies if external referee is used
    ui->robots->forceAutoReload(!enabled);
}

void MainWindow::setTransceiver(bool enabled)
{
    Command command(new amun::Command);
    amun::CommandTransceiver *transceiver = command->mutable_transceiver();
    transceiver->set_enable(enabled);
    sendCommand(command);
}

void MainWindow::disableTransceiver()
{
    ui->actionEnableTransceiver->setChecked(false);
}

void MainWindow::setCharge(bool charge)
{
    Command command(new amun::Command);
    amun::CommandTransceiver *t = command->mutable_transceiver();
    t->set_charge(charge);
    sendCommand(command);
}

void MainWindow::toggleFlip()
{
    m_flip = !m_flip;
    QSettings s;
    s.setValue("Flip", m_flip);
    sendFlip();
}

void MainWindow::sendFlip()
{
    Command command(new amun::Command);
    command->set_flip(m_flip);
    sendCommand(command);
}

static QString toString(const QDateTime& dt)
{
    const int utcOffset = dt.secsTo(QDateTime(dt.date(), dt.time(), Qt::UTC));

    int sign = utcOffset >= 0 ? 1: -1;
    const QString date = dt.toString(Qt::ISODate) + QString::fromLatin1("%1%2%3")
            .arg(sign == 1 ? QLatin1Char('+') : QLatin1Char('-'))
            .arg(utcOffset * sign / (60 * 60), 2, 10, QLatin1Char('0'))
            .arg((utcOffset / 60) % 60, 2, 10, QLatin1Char('0'));
    return date;
}

void MainWindow::setRecording(bool record)
{
    if (record) {
        Q_ASSERT(!m_logFile);

        QString teamnames;
        if (!m_yellowTeamName.isEmpty() && !m_blueTeamName.isEmpty()) {
            teamnames = QString("%1 vs %2").arg(m_yellowTeamName).arg(m_blueTeamName);
        } else if (!m_yellowTeamName.isEmpty()) {
            teamnames = m_yellowTeamName;
        } else  if (!m_blueTeamName.isEmpty()) {
            teamnames = m_blueTeamName;
        }

        const QString date = toString(QDateTime::currentDateTime()).replace(":", "");
        const QString filename = QString("%1%2.log").arg(date).arg(teamnames);

        // create log file and forward status
        m_logFile = new LogFileWriter();
        if (!m_logFile->open(filename)) {
            ui->actionRecord->setChecked(false);
            delete m_logFile;
            return;
        }
        connect(this, SIGNAL(gotStatus(Status)), m_logFile, SLOT(writeStatus(Status)));

        // create thread if not done yet and move to seperate thread
        if (m_logFileThread == NULL) {
            m_logFileThread = new QThread();
            m_logFileThread->start();
        }
        m_logFile->moveToThread(m_logFileThread);

        // add the current team settings to the logfile
        Status status(new amun::Status);
        status->set_time(m_lastTime);
        status->mutable_team_yellow()->CopyFrom(m_yellowTeam);
        status->mutable_team_blue()->CopyFrom(m_blueTeam);
        m_logFile->writeStatus(status);
    } else {
        // defer log file deletion to happen in its thread
        m_logFile->deleteLater();
        m_logFile = NULL;
    }
}

void MainWindow::showConfigDialog()
{
    m_configDialog->exec();
}
