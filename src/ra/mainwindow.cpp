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

#include "mainwindow.h"
#include "ui_mainwindow.h"
#include "configdialog.h"
#include "input/inputmanager.h"
#include "internalreferee.h"
#include "plotter/plotter.h"
#include "widgets/debuggerconsole.h"
#include "widgets/refereestatuswidget.h"
#include <QFile>
#include <QFileDialog>
#include <QLabel>
#include <QMetaType>
#include <QSettings>
#include <QThread>
#include <QSignalMapper>

MainWindow::MainWindow(bool tournamentMode, QWidget *parent) :
    QMainWindow(parent),
    ui(new Ui::MainWindow),
    m_transceiverActive(false),
    m_lastStageTime(0),
    m_logWriter(false, 20),
    m_isTournamentMode(tournamentMode)
{
    qRegisterMetaType<SSL_Referee::Command>("SSL_Referee::Command");
    qRegisterMetaType<SSL_Referee::Stage>("SSL_Referee::Stage");
    qRegisterMetaType<Status>("Status");

    setWindowIcon(QIcon("icon:ra.svg"));
    ui->setupUi(this);

    ui->logManager->setMinimalMode();
    ui->logManager->hide();

    // setup icons
    ui->actionEnableTransceiver->setIcon(QIcon("icon:32/network-wireless.png"));
    ui->actionSidesFlipped->setIcon(QIcon("icon:32/change-ends.png"));
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

    m_logTimeLabel = new QLabel();
    statusBar()->addPermanentWidget(m_logTimeLabel);
    m_logTimeLabel->hide();

    m_refereeStatus = new RefereeStatusWidget;
    statusBar()->addPermanentWidget(m_refereeStatus);

    // setup ui parts that send commands
    m_internalReferee = new InternalReferee(this);
    connect(m_internalReferee, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));
    connect(ui->referee, SIGNAL(changeCommand(SSL_Referee::Command)), m_internalReferee, SLOT(changeCommand(SSL_Referee::Command)));
    connect(ui->referee, SIGNAL(changeStage(SSL_Referee::Stage)), m_internalReferee, SLOT(changeStage(SSL_Referee::Stage)));
    connect(ui->referee, SIGNAL(changeYellowKeeper(uint)), m_internalReferee, SLOT(changeYellowKeeper(uint)));
    connect(ui->referee, SIGNAL(changeBlueKeeper(uint)), m_internalReferee, SLOT(changeBlueKeeper(uint)));
    connect(ui->referee, SIGNAL(enableInternalAutoref(bool)), m_internalReferee, SLOT(enableInternalAutoref(bool)));

    m_inputManager = new InputManager(this);
    connect(m_inputManager, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));
    connect(m_inputManager, SIGNAL(toggleTransceiver()), ui->actionEnableTransceiver, SLOT(toggle()));
    connect(m_inputManager, SIGNAL(sendRefereeCommand(SSL_Referee::Command)), m_internalReferee, SLOT(changeCommand(SSL_Referee::Command)));
    ui->input->init(m_inputManager);

    connect(ui->robots, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));
    ui->robots->init(this, m_inputManager);

    connect(ui->simulator, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));
    connect(ui->field, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));

    m_configDialog = new ConfigDialog(this);
    connect(m_configDialog, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));

    connect(ui->options, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));

    ui->blueDebugger->setStrategy(amun::DebugSource::StrategyBlue);
    connect(ui->blueDebugger, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));

    ui->yellowDebugger->setStrategy(amun::DebugSource::StrategyYellow);
    connect(ui->yellowDebugger, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));

    // setup visualization only parts of the ui
    connect(ui->visualization, SIGNAL(itemsChanged(QStringList)), ui->field, SLOT(visualizationsChanged(QStringList)));

    m_plotter = new Plotter();

    // connect the menu actions
    connect(ui->actionEnableTransceiver, SIGNAL(toggled(bool)), SLOT(setTransceiver(bool)));
    connect(ui->actionDisableTransceiver, SIGNAL(triggered(bool)), SLOT(disableTransceiver()));
    addAction(ui->actionDisableTransceiver); // only actions that are used somewhere are triggered
    connect(ui->actionChargeKicker, SIGNAL(toggled(bool)), SLOT(setCharge(bool)));
    connect(ui->actionSidesFlipped, SIGNAL(toggled(bool)), SLOT(setFlipped(bool)));

    connect(ui->actionSimulator, SIGNAL(toggled(bool)), SLOT(setSimulatorEnabled(bool)));
    connect(ui->actionInternalReferee, SIGNAL(toggled(bool)), SLOT(setInternalRefereeEnabled(bool)));
    connect(ui->actionInputDevices, SIGNAL(toggled(bool)), m_inputManager, SLOT(setEnabled(bool)));

    connect(ui->actionConfiguration, SIGNAL(triggered()), SLOT(showConfigDialog()));
    connect(ui->actionPlotter, SIGNAL(triggered()), m_plotter, SLOT(show()));
    connect(ui->actionAutoPause, SIGNAL(toggled(bool)), ui->simulator, SLOT(setEnableAutoPause(bool)));

    connect(ui->actionGoLive, SIGNAL(triggered()), SLOT(liveMode()));
    connect(ui->actionShowBacklog, SIGNAL(triggered()), SLOT(showBacklogMode()));
    connect(ui->actionFrameBack, SIGNAL(triggered()), ui->logManager, SLOT(previousFrame()));
    connect(ui->actionFrameForward, SIGNAL(triggered()), ui->logManager, SLOT(nextFrame()));
    connect(ui->actionStepBack, SIGNAL(triggered()), ui->logManager, SIGNAL(stepBackward()));
    connect(ui->actionStepForward, SIGNAL(triggered()), ui->logManager, SIGNAL(stepForward()));
    connect(ui->actionTogglePause, SIGNAL(triggered()), ui->logManager, SLOT(togglePaused()));

    connect(ui->referee, SIGNAL(enableInternalAutoref(bool)), ui->robots, SIGNAL(enableInternalAutoref(bool)));

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
    connect(this, SIGNAL(gotStatus(Status)), ui->options, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->blueDebugger, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->yellowDebugger, SLOT(handleStatus(Status)));

    // set up log connections
    connect(this, SIGNAL(gotStatus(Status)), &m_logWriter, SLOT(handleStatus(Status)));
    connect(ui->actionRecord, SIGNAL(toggled(bool)), &m_logWriter, SLOT(recordButtonToggled(bool)));
    connect(ui->actionSave20s, SIGNAL(triggered(bool)), &m_logWriter, SLOT(backLogButtonClicked()));
    connect(ui->actionSaveBacklog, SIGNAL(triggered(bool)), &m_logWriter, SLOT(backLogButtonClicked()));
    connect(&m_logWriter, SIGNAL(setRecordButton(bool)), ui->actionRecord, SLOT(setChecked(bool)));
    connect(&m_logWriter, SIGNAL(enableRecordButton(bool)), ui->actionRecord, SLOT(setEnabled(bool)));
    connect(&m_logWriter, SIGNAL(enableBacklogButton(bool)), ui->actionSave20s, SLOT(setEnabled(bool)));
    connect(&m_logWriter, SIGNAL(enableBacklogButton(bool)), ui->actionSaveBacklog, SLOT(setEnabled(bool)));
    connect(&m_logWriter, SIGNAL(changeLogTimeLabel(QString)), m_logTimeLabel, SLOT(setText(QString)));
    connect(&m_logWriter, SIGNAL(showLogTimeLabel(bool)), m_logTimeLabel, SLOT(setVisible(bool)));
    //TODO: alle buttons nicht nur die direkt sichtbaren

    // start amun
    connect(&m_amun, SIGNAL(gotStatus(Status)), SLOT(handleStatus(Status)));
    m_amun.start();

    QActionGroup* rulesActionGroup = new QActionGroup(this);
    ui->rules2017->setActionGroup(rulesActionGroup);
    ui->rules2018->setActionGroup(rulesActionGroup);
    connect(ui->actionSimulator, SIGNAL(toggled(bool)), ui->rules2017, SLOT(setEnabled(bool)));
    connect(ui->actionSimulator, SIGNAL(toggled(bool)), ui->rules2018, SLOT(setEnabled(bool)));
    connect(rulesActionGroup, SIGNAL(triggered(QAction*)), this, SLOT(ruleVersionChanged(QAction*)));

    // restore configuration and initialize everything
    ui->input->load();
    ui->robots->load();
    ui->visualization->load();
    m_configDialog->load();
    ui->referee->load();

    // hide options dock by default
    ui->dockOptions->hide();

    QSettings s;

    s.beginGroup("MainWindow");
    restoreGeometry(s.value("Geometry").toByteArray());
    if (s.value("State").isNull()) {
        tabifyDockWidget(ui->dockSimulator, ui->dockInput);
        tabifyDockWidget(ui->dockInput, ui->dockVisualization);
        tabifyDockWidget(ui->dockRobots, ui->dockBlueDebugger);
        tabifyDockWidget(ui->dockRobots, ui->dockYellowDebugger);

        ui->dockBlueDebugger->close();
        ui->dockYellowDebugger->close();
    }
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
    ui->actionAutoPause->setChecked(s.value("Simulator/AutoPause", true).toBool());

    ui->actionSidesFlipped->setChecked(s.value("Flipped", false).toBool());

    // playback speed shortcuts
    QSignalMapper *mapper = new QSignalMapper(this);
    connect(mapper, SIGNAL(mapped(int)), ui->logManager, SIGNAL(setSpeed(int)));
    QAction *speedActions[] = { ui->actionSpeed1, ui->actionSpeed5, ui->actionSpeed10, ui->actionSpeed20,
                              ui->actionSpeed50, ui->actionSpeed100, ui->actionSpeed200, ui->actionSpeed1000 };
    int playSpeeds[] = { 1, 5, 10, 20, 50, 100, 200, 1000 };
    for (uint i = 0; i < sizeof(speedActions) / sizeof(speedActions[0]); ++i) {
        QAction *action = speedActions[i];
        connect(action, SIGNAL(triggered()), mapper, SLOT(map()));
        mapper->setMapping(action, playSpeeds[i]);
        // readd bug, see below
        addAction(action);
    }

    addAction(ui->actionGoLive);
    addAction(ui->actionFrameBack);
    addAction(ui->actionFrameForward);
    addAction(ui->actionStepBack);
    addAction(ui->actionStepForward);
    addAction(ui->actionShowBacklog);
    addAction(ui->actionTogglePause);

    // set up save config connections
    connect(ui->actionSaveConfiguration, SIGNAL(triggered(bool)), this, SLOT(saveConfig()));
    connect(ui->actionSaveConfiguration, SIGNAL(triggered(bool)), ui->input, SLOT(saveConfig()));
    connect(ui->actionSaveConfiguration, SIGNAL(triggered(bool)), ui->referee, SLOT(saveConfig()));
    connect(ui->actionSaveConfiguration, SIGNAL(triggered(bool)), ui->robots, SLOT(saveConfig()));
    connect(ui->actionSaveConfiguration, SIGNAL(triggered(bool)), ui->field, SLOT(saveConfig()));
    connect(ui->actionSaveConfiguration, SIGNAL(triggered(bool)), ui->timing, SLOT(saveConfig()));
    connect(ui->actionSaveConfiguration, SIGNAL(triggered(bool)), ui->visualization, SLOT(saveConfig()));

    ui->field->setFocus();

    if (tournamentMode) {
        ui->actionRecord->setChecked(true);
        ui->actionChargeKicker->setChecked(true);
        ui->actionEnableTransceiver->setChecked(true);
        ui->actionSimulator->setChecked(false);
        ui->actionInternalReferee->setChecked(false);
    }
}

MainWindow::~MainWindow()
{
    delete ui;
}

void MainWindow::closeEvent(QCloseEvent *e)
{
    saveConfig();

    // make sure the plotter is closed along with the mainwindow
    // this also ensure that a closeEvent is triggered
    m_plotter->close();

    // unblock stopped strategies
    ui->robots->shutdown();

    QMainWindow::closeEvent(e);
}

void MainWindow::saveConfig()
{
    QSettings s;

    s.beginGroup("MainWindow");
    s.setValue("Geometry", saveGeometry());
    s.setValue("State", saveState());
    s.setValue("SplitterH", ui->splitterH->saveState());
    s.setValue("SplitterV", ui->splitterV->saveState());
    s.endGroup();

    s.setValue("Simulator/AutoPause", ui->actionAutoPause->isChecked());
    s.setValue("Simulator/Enabled", ui->actionSimulator->isChecked());
    s.setValue("Referee/Internal", ui->actionInternalReferee->isChecked());
    s.setValue("InputDevices/Enabled", ui->actionInputDevices->isChecked());
    s.setValue("Flipped", ui->actionSidesFlipped->isChecked());
}

void MainWindow::ruleVersionChanged(QAction * action)
{
    Command command(new amun::Command);
    amun::CommandSimulator *sim = command->mutable_simulator();
    if (action == ui->rules2017) {
        sim->set_rule_version(amun::CommandSimulator::RULES2017);
    } else if (action == ui->rules2018) {
        sim->set_rule_version(amun::CommandSimulator::RULES2018);
    }

    // reload the strategies / autoref
    sendCommand(command);

    // resend all the information the simulator needs
    ui->robots->resend();
    setCharge(ui->actionChargeKicker->isChecked());
    setSimulatorEnabled(ui->actionSimulator->isChecked());
}

void MainWindow::handleStatus(const Status &status)
{
    if (status->has_transceiver()) {
        const amun::StatusTransceiver &t = status->transceiver();
        QString tooltip = "";
        QString color = "red";

        m_transceiverActive = t.active();

        if (m_transceiverActive) {
            color = "darkGreen";

            if (t.dropped_usb_packets() > 0) {
                color = "yellow";
                tooltip += QString("\nDropped usb packets: %1").arg(t.dropped_usb_packets());
            }
            if (t.dropped_commands() > 0) {
                color = "yellow";
                tooltip += QString("\nDropped commands: %1").arg(t.dropped_commands());
            }
            tooltip = tooltip.mid(1);
        } else {
            color = "red";
        }

        m_transceiverStatus->setToolTip(tooltip);

        QString text = QString("<font color=\"%1\">Transceiver%2</font>").arg(color);
        QString error = QString::fromStdString(t.error()).trimmed();
        if (!error.isEmpty()) {
            text = text.arg(": " + QString::fromStdString(t.error()));
        } else {
            text = text.arg("");
        }
        m_transceiverStatus->setText(text);
    }

    if (status->has_game_state()) {
        const amun::GameState &state = status->game_state();

        if (state.has_stage() && state.has_stage_time_left()) {
            m_lastStageTime = state.stage_time_left();
        }

        if (state.has_goals_flipped()) {
            ui->actionSidesFlipped->setChecked(state.goals_flipped());
        }

        if (m_isTournamentMode && state.has_is_real_game_running()
                && state.is_real_game_running()) {
            ui->actionSimulator->setChecked(false);
            ui->actionInputDevices->setChecked(false);
            ui->actionChargeKicker->setChecked(true);
            ui->actionEnableTransceiver->setChecked(true);
            ui->actionRecord->setChecked(true);
            ui->actionInternalReferee->setChecked(false);
        }

        m_lastRefState = state.state();

        if (m_isTournamentMode && !ui->actionSimulator->isChecked()) {
            if (state.has_blue() && state.blue().name() == TEAM_NAME) {
                ui->robots->setColor(true);
            } else if (state.has_yellow() && state.yellow().name() == TEAM_NAME) {
                ui->robots->setColor(false);
            }
        }
    }

    if (status->has_amun_state() && status->amun_state().has_port_bind_error()) {
        QLabel *label = new QLabel(this);
        label->setText("<font color=\"red\">Failed to bind the vision port. Ra must be started BEFORE ssl-vision if it runs locally!</font>");
        statusBar()->addPermanentWidget(label);
    }

    if (status->has_timer_scaling()) {
        if (status->timer_scaling() != 0.f) {
            m_inputManager->enableInputCollection();
        } else {
            m_inputManager->disableInputCollection();
        }
    }

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

void MainWindow::setFlipped(bool flipped)
{
    Command command(new amun::Command);
    amun::CommandReferee *referee = command->mutable_referee();
    referee->set_flipped(flipped);
    sendCommand(command);
}

void MainWindow::liveMode()
{
    ui->field->enableDragMeasure(false);
    for (const Status &status : m_replayStrategyBuffer) {
        handleStatus(status);
        m_logWriter.handleStatus(status);
    }
    m_replayStrategyBuffer.clear();
    if (ui->actionSimulator->isChecked()) {
        ui->simulator->start();
    }
    ui->logManager->setDisabled(true);
    ui->logManager->hide();
    connect(&m_amun, SIGNAL(gotStatus(Status)), SLOT(handleStatus(Status)));
    disconnect(&m_amun, SIGNAL(gotStatus(Status)), this, SLOT(handleCheckHaltStatus(Status)));
    disconnect(ui->logManager, SIGNAL(gotStatus(Status)), this, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), &m_logWriter, SLOT(handleStatus(Status)));

    toggleInstantReplay(false);
}

void MainWindow::showBacklogMode()
{
    if (ui->actionSimulator->isChecked() || m_lastRefState == amun::GameState::Halt) {
        ui->field->enableDragMeasure(true);
        if (ui->actionSimulator->isChecked()) {
            ui->simulator->stop();
        }
        ui->logManager->setEnabled(true);
        ui->logManager->show();
        ui->logManager->setStatusSource(m_logWriter.makeStatusSource());
        disconnect(&m_amun, SIGNAL(gotStatus(Status)), this, SLOT(handleStatus(Status)));
        connect(&m_amun, SIGNAL(gotStatus(Status)), SLOT(handleCheckHaltStatus(Status)));
        connect(ui->logManager, SIGNAL(gotStatus(Status)), SLOT(handleStatus(Status)));
        ui->logManager->goToEnd();
        disconnect(this, SIGNAL(gotStatus(Status)), &m_logWriter, SLOT(handleStatus(Status)));

        toggleInstantReplay(true);
    }
}

void MainWindow::handleCheckHaltStatus(const Status &status)
{
    if (status->has_game_state()) {
        const amun::GameState &gameState = status->game_state();
        if (gameState.state() != amun::GameState::Halt) {
            liveMode();
        }
    }
    if (status->has_strategy_blue() || status->has_strategy_yellow() ||
            status->has_strategy_autoref() || status->has_debug()) {
        // use 50 as some upper limit, the exact number is irrelevant
        if (m_replayStrategyBuffer.size() < 50) {
            m_replayStrategyBuffer.push_back(status);
        }
    }
}

void MainWindow::toggleInstantReplay(bool enable)
{
    ui->actionGoLive->setEnabled(enable);
    ui->actionFrameBack->setEnabled(enable);
    ui->actionFrameForward->setEnabled(enable);
    ui->actionStepBack->setEnabled(enable);
    ui->actionStepForward->setEnabled(enable);
    ui->actionTogglePause->setEnabled(enable);
    ui->actionShowBacklog->setEnabled(!enable);
    ui->actionSpeed1->setEnabled(enable);
    ui->actionSpeed5->setEnabled(enable);
    ui->actionSpeed10->setEnabled(enable);
    ui->actionSpeed20->setEnabled(enable);
    ui->actionSpeed50->setEnabled(enable);
    ui->actionSpeed100->setEnabled(enable);
    ui->actionSpeed200->setEnabled(enable);
    ui->actionSpeed1000->setEnabled(enable);
    ui->referee->setEnabled(!enable);
    ui->simulator->setEnabled(!enable);
    ui->robots->enableContent(!enable);
}

void MainWindow::showConfigDialog()
{
    m_configDialog->exec();
}
