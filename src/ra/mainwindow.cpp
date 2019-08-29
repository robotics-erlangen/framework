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
#include "config/config.h"
#include "widgets/debuggerconsole.h"
#include "widgets/refereestatuswidget.h"
#include "savedirectorydialog.h"
#include "logcutter/logcutter.h"
#include "protobuf/geometry.h"
#include "logopener.h"
#include <google/protobuf/text_format.h>
#include <QFile>
#include <QFileDialog>
#include <QLabel>
#include <QMetaType>
#include <QSettings>
#include <QThread>
#include <QSignalMapper>
#include <QDirIterator>
#include <QDragEnterEvent>
#include <QDragLeaveEvent>
#include <QDragMoveEvent>
#include <QDropEvent>
#include <QMimeData>
#include <QUrl>

MainWindow::MainWindow(bool tournamentMode, bool isRa, QWidget *parent) :
    QMainWindow(parent),
    ui(new Ui::MainWindow),
    m_transceiverActive(false),
    m_lastStageTime(0),
    m_logWriterRa(false, 20),
    m_logWriterHorus(true, 20),
    m_isTournamentMode(tournamentMode),
    m_currentWidgetConfiguration(0)
{
    qRegisterMetaType<SSL_Referee::Command>("SSL_Referee::Command");
    qRegisterMetaType<SSL_Referee::Stage>("SSL_Referee::Stage");
    qRegisterMetaType<Status>("Status");

    ui->setupUi(this);

    ui->logManager->hide();
    ui->btnOpen->setVisible(false);

    // setup icons
    ui->actionEnableTransceiver->setIcon(QIcon("icon:32/network-wireless.png"));
    ui->actionSidesFlipped->setIcon(QIcon("icon:32/change-ends.png"));
    ui->actionRecord->setIcon(QIcon("icon:32/media-record.png"));
    ui->actionRecordLogLog->setIcon(QIcon("icon:32/media-record.png"));
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

    m_logOpener = new LogOpener(ui, this);
    connect(m_logOpener, SIGNAL(logOpened(QString)), SLOT(logOpened(QString)));

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
    connect(ui->actionSimulator, SIGNAL(toggled(bool)), ui->robots, SLOT(setIsSimulator(bool)));
    ui->robots->init(this, m_inputManager);

    connect(ui->simulator, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));
    connect(ui->field, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));
    connect(ui->field, SIGNAL(selectRobotVisualizations(int)), ui->visualization, SLOT(selectRobotVisualizations(int)));

    m_configDialog = new ConfigDialog(this);
    connect(m_configDialog, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));
    connect(m_configDialog, SIGNAL(useDarkModeColors(bool)), ui->referee, SLOT(setStyleSheets(bool)));
    connect(m_configDialog, SIGNAL(useDarkModeColors(bool)), ui->robots, SIGNAL(setUseDarkColors(bool)));
    connect(m_configDialog, SIGNAL(useDarkModeColors(bool)), ui->replay, SIGNAL(setUseDarkColors(bool)));

    connect(ui->options, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));

    ui->blueDebugger->setStrategy(amun::DebugSource::StrategyBlue);
    connect(ui->blueDebugger, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));

    ui->yellowDebugger->setStrategy(amun::DebugSource::StrategyYellow);
    connect(ui->yellowDebugger, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));

    // setup visualization only parts of the ui
    connect(ui->visualization, SIGNAL(itemsChanged(QStringList)), ui->field, SLOT(visualizationsChanged(QStringList)));

    m_plotter = new Plotter();
    connect(m_plotter, SIGNAL(spacePressed()), this, SLOT(togglePause()));

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
    connect(ui->actionUseLocation, SIGNAL(toggled(bool)), &m_logWriterRa, SLOT(useLogfileLocation(bool)));
    connect(ui->actionUseLocation, SIGNAL(toggled(bool)), &m_logWriterHorus, SLOT(useLogfileLocation(bool)));
    connect(ui->actionUseLocation, SIGNAL(toggled(bool)), m_logOpener, SLOT(useLogfileLocation(bool)));
    connect(ui->actionChangeLocation, SIGNAL(triggered()), SLOT(showDirectoryDialog()));

    connect(ui->actionGoLive, SIGNAL(triggered()), SLOT(liveMode()));
    connect(ui->actionShowBacklog, SIGNAL(triggered()), SLOT(showBacklogMode()));
    connect(ui->actionFrameBack, SIGNAL(triggered()), ui->logManager, SLOT(previousFrame()));
    connect(ui->actionFrameForward, SIGNAL(triggered()), ui->logManager, SLOT(nextFrame()));
    connect(ui->actionStepBack, SIGNAL(triggered()), ui->logManager, SIGNAL(stepBackward()));
    connect(ui->actionStepForward, SIGNAL(triggered()), ui->logManager, SIGNAL(stepForward()));
    connect(ui->actionTogglePause, SIGNAL(triggered()), ui->logManager, SLOT(togglePaused()));

    connect(ui->referee, SIGNAL(enableInternalAutoref(bool)), ui->robots, SIGNAL(enableInternalAutoref(bool)));
    connect(ui->actionInternalReferee, SIGNAL(toggled(bool)), ui->robots, SIGNAL(enableInternalAutoref(bool)));

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
    connect(this, SIGNAL(gotStatus(Status)), ui->simulator, SLOT(handleStatus(Status)));

    // set up log connections
    createLogWriterConnections(m_logWriterRa, ui->actionRecord, ui->actionSave20s, ui->actionSaveBacklog);
    createLogWriterConnections(m_logWriterHorus, ui->actionRecordLogLog, ui->actionBackloglog, ui->actionSaveBackloglog);

    // disable all possibilities of skipping / going back packets when recording
    connect(&m_logWriterHorus, SIGNAL(disableSkipping(bool)), ui->logManager, SIGNAL(disableSkipping(bool)));
    connect(&m_logWriterHorus, SIGNAL(disableSkipping(bool)), ui->actionFrameBack, SLOT(setDisabled(bool)));
    connect(&m_logWriterHorus, SIGNAL(disableSkipping(bool)), ui->actionFrameForward, SLOT(setDisabled(bool)));
    connect(&m_logWriterHorus, SIGNAL(disableSkipping(bool)), ui->actionStepBack, SLOT(setDisabled(bool)));
    connect(&m_logWriterHorus, SIGNAL(disableSkipping(bool)), ui->actionStepForward, SLOT(setDisabled(bool)));

    // reset backlog if packets have been skipped
    connect(ui->actionFrameForward, SIGNAL(triggered(bool)), &m_logWriterHorus, SIGNAL(resetBacklog()));
    connect(ui->actionFrameBack, SIGNAL(triggered(bool)), &m_logWriterHorus, SIGNAL(resetBacklog()));
    connect(ui->actionStepForward, SIGNAL(triggered(bool)), &m_logWriterHorus, SIGNAL(resetBacklog()));
    connect(ui->actionStepBack, SIGNAL(triggered(bool)), &m_logWriterHorus, SIGNAL(resetBacklog()));
    connect(ui->logManager, SIGNAL(resetBacklog()), &m_logWriterHorus, SIGNAL(resetBacklog()));

    // start amun
    m_amun.start();

    QSettings s;

    // find all simulator configuration files
    QDirIterator dirIterator(QString(ERFORCE_CONFDIR) + "simulator", {"*.txt"}, QDir::AllEntries | QDir::NoSymLinks | QDir::NoDotAndDotDot);
    m_simulatorSetupGroup = new QActionGroup(this);
    QString selectedFile = s.value("Simulator/SetupFile").toString();
    QAction *selectedAction = nullptr;
    while (dirIterator.hasNext()) {
        QFileInfo file(dirIterator.next());
        QString shownFilename = file.fileName().split(".").first();
        QAction *setupAction = new QAction(shownFilename);
        setupAction->setCheckable(true);
        setupAction->setEnabled(false);
        setupAction->setActionGroup(m_simulatorSetupGroup);
        ui->simulatorSetup->addAction(setupAction);
        connect(ui->actionSimulator, SIGNAL(toggled(bool)), setupAction, SLOT(setEnabled(bool)));
        if (selectedFile == shownFilename || selectedFile.isEmpty()) {
            selectedAction = setupAction;
        }
    }
    connect(m_simulatorSetupGroup, SIGNAL(triggered(QAction*)), this, SLOT(simulatorSetupChanged(QAction*)));
    if (selectedAction) {
        selectedAction->setChecked(true);
        simulatorSetupChanged(selectedAction);
    }

    // restore configuration and initialize everything
    ui->input->load();
    ui->robots->load();
    ui->visualization->load();
    m_configDialog->load();
    ui->referee->load();

    // hide options dock by default
    ui->dockOptions->hide();

    loadConfig(true);
    // switch configuration keys
    QSignalMapper *switchConfigMapper = new QSignalMapper(this);
    for (uint i = 0;i<10;i++) {
        QAction *action = new QAction(this);
        action->setShortcut(QKeySequence(static_cast<Qt::Key>(static_cast<unsigned int>((Qt::ALT + Qt::Key_0) + i))));
        connect(action, SIGNAL(triggered()), switchConfigMapper, SLOT(map()));
        switchConfigMapper->setMapping(action, int(i));
        addAction(action);
    }
    connect(switchConfigMapper, SIGNAL(mapped(int)), SLOT(switchToWidgetConfiguration(int)));

    ui->actionSimulator->setChecked(s.value("Simulator/Enabled").toBool());
    ui->actionInternalReferee->setChecked(s.value("Referee/Internal").toBool());
    if (!ui->actionInternalReferee->isChecked()) {
        // correctly handle disabled referee
        setInternalRefereeEnabled(false);
    }
    ui->actionInputDevices->setChecked(s.value("InputDevices/Enabled").toBool());
    ui->actionAutoPause->setChecked(s.value("Simulator/AutoPause", true).toBool());
    ui->actionUseLocation->setChecked(s.value("LogWriter/UseLocation", true).toBool());

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

        Command cmd(new amun::Command);
        cmd->mutable_strategy_blue()->set_tournament_mode(true);
        cmd->mutable_strategy_yellow()->set_tournament_mode(true);
        cmd->mutable_strategy_autoref()->set_tournament_mode(true);
        sendCommand(cmd);
    }

    // logplayer mode connections
    LogCutter *logCutter = new LogCutter(this);

    m_playTimer = ui->logManager->getPlayTimer();

    setAcceptDrops(true);

    ui->replay->setRecentScriptList(ui->robots->recentScriptsList());
    connect(&m_amun, SIGNAL(gotReplayStatus(Status)), ui->replay, SIGNAL(gotStatus(Status)));
    connect(ui->replay, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));

    // add shortcuts
    connect(ui->actionLogCutter, &QAction::triggered, logCutter, &LogCutter::show);

    // setup data distribution
    connect(this, SIGNAL(gotStatus(Status)), m_logOpener, SLOT(handleStatus(Status)));

    switchToWidgetConfiguration(isRa ? 1 : 2);
}

MainWindow::~MainWindow()
{
    delete ui;
    delete m_plotter;
}

void MainWindow::closeEvent(QCloseEvent *e)
{
    saveConfig();
    m_logOpener->close();

    // make sure the plotter is closed along with the mainwindow
    // this also ensure that a closeEvent is triggered
    m_plotter->close();

    // unblock stopped strategies
    ui->robots->shutdown();

    QMainWindow::closeEvent(e);
}

void MainWindow::togglePause()
{
    if (m_currentWidgetConfiguration % 2 == 1) {
        ui->simulator->toggleSimulatorRunning();
    } else {
        ui->actionTogglePause->trigger();
    }
}

void MainWindow::showDirectoryDialog()
{
    QList<QString> list;
    QSettings s;
    s.beginGroup("LogLocation");
    int size = s.beginReadArray("locations");
    list.reserve(size);
    for (int i = 0; i < size; ++i) {
        s.setArrayIndex(i);
        list.append(s.value("path").toString());
    }
    s.endArray();
    SaveDirectoryDialog dialog(list);
    if (dialog.exec() == QDialog::Accepted) {
        list=dialog.getResult();
    }
    s.beginWriteArray("locations");
    for (int i = 0; i < list.size(); ++i) {
        s.setArrayIndex(i);
        s.setValue("path", list[i]);
    }
    s.endArray();
    s.endGroup();
}

void MainWindow::createLogWriterConnections(CombinedLogWriter &writer, QAction *record, QAction *backlog1, QAction *backlog2)
{
    connect(record, SIGNAL(toggled(bool)), &writer, SLOT(recordButtonToggled(bool)));
    connect(backlog1, SIGNAL(triggered(bool)), &writer, SLOT(backLogButtonClicked()));
    connect(backlog2, SIGNAL(triggered(bool)), &writer, SLOT(backLogButtonClicked()));
    connect(&writer, SIGNAL(setRecordButton(bool)), record, SLOT(setChecked(bool)));
    connect(&writer, SIGNAL(enableRecordButton(bool)), record, SLOT(setEnabled(bool)));
    connect(&writer, SIGNAL(enableBacklogButton(bool)), backlog1, SLOT(setEnabled(bool)));
    connect(&writer, SIGNAL(enableBacklogButton(bool)), backlog2, SLOT(setEnabled(bool)));
    connect(&writer, SIGNAL(changeLogTimeLabel(QString)), m_logTimeLabel, SLOT(setText(QString)));
    connect(&writer, SIGNAL(showLogTimeLabel(bool)), m_logTimeLabel, SLOT(setVisible(bool)));
}

void MainWindow::saveConfig()
{
    QSettings s;

    s.beginGroup("MainWindow" + (m_currentWidgetConfiguration == 0 ? "" :
                                    QString::number(m_currentWidgetConfiguration)));
    s.setValue("Geometry", saveGeometry());
    s.setValue("State", saveState());
    s.setValue("SplitterH", ui->splitterH->saveState());
    s.setValue("SplitterV", ui->splitterV->saveState());
    s.endGroup();

    QString simulatorSetupFile = m_simulatorSetupGroup->checkedAction() ? m_simulatorSetupGroup->checkedAction()->text().replace("&", "") : "";
    s.setValue("Simulator/SetupFile", simulatorSetupFile);
    s.setValue("Simulator/AutoPause", ui->actionAutoPause->isChecked());
    s.setValue("Simulator/Enabled", ui->actionSimulator->isChecked());
    s.setValue("Referee/Internal", ui->actionInternalReferee->isChecked());
    s.setValue("InputDevices/Enabled", ui->actionInputDevices->isChecked());
    s.setValue("Flipped", ui->actionSidesFlipped->isChecked());
    s.setValue("LogWriter/UseLocation", ui->actionUseLocation->isChecked());

    m_logOpener->saveConfig();
}

void MainWindow::loadConfig(bool doRestoreGeometry)
{
    QSettings s;
    if (!s.isWritable()) {
        QLabel *label = new QLabel(this);
        label->setText("<font color=\"red\">Can not save config! Check permissions of config file.</font>");
        statusBar()->addPermanentWidget(label);
    }
    s.beginGroup("MainWindow" + (m_currentWidgetConfiguration == 0 ? "" :
                                    QString::number(m_currentWidgetConfiguration)));
    if (doRestoreGeometry) {
        restoreGeometry(s.value("Geometry").toByteArray());
    }
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
}

void MainWindow::switchToWidgetConfiguration(int configId)
{
    unsigned int id = static_cast<unsigned int>(configId);
    if (id != m_currentWidgetConfiguration) {
        saveConfig();
        unsigned int previousId = m_currentWidgetConfiguration;
        m_currentWidgetConfiguration = id;
        loadConfig(false);

        // Horus mode
        if (configId % 2 == 0 && previousId % 2 == 1) {
            horusMode();
        } else if (previousId % 2 == 0){
            raMode();
        }
    }

}

void MainWindow::simulatorSetupChanged(QAction * action)
{
    QFile file(QString(ERFORCE_CONFDIR) + "simulator/" + action->text().replace("&", "") + ".txt");
    file.open(QFile::ReadOnly);
    QString str = file.readAll();
    file.close();
    std::string s = qPrintable(str);

    Command command(new amun::Command);
    google::protobuf::TextFormat::Parser parser;
    parser.AllowPartialMessage(false);
    parser.ParseFromString(s, command->mutable_simulator()->mutable_simulator_setup());

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
            // when we are both teams (an internal test), do not modify robot colors
            bool isTeamBlue = state.has_blue() && state.blue().name() == TEAM_NAME;
            bool isTeamYellow = state.has_yellow() && state.yellow().name() == TEAM_NAME;
            if (isTeamBlue && !isTeamYellow) {
                ui->robots->setColor(true);
            } else if (isTeamYellow && !isTeamBlue) {
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
    if (enabled && m_currentWidgetConfiguration % 2 == 1) { // ra mode
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
    switchToWidgetConfiguration(static_cast<int>(m_currentWidgetConfiguration - 1));
}

void MainWindow::showBacklogMode()
{
    if (ui->actionSimulator->isChecked() || m_lastRefState == amun::GameState::Halt) {
        m_horusTitleString = "Instant Replay";
        switchToWidgetConfiguration(static_cast<int>(m_currentWidgetConfiguration + 1));
        m_logOpener->saveCurrentPosition();
        ui->logManager->setStatusSource(m_logWriterRa.makeStatusSource());
        ui->logManager->goToEnd();
    }
}

void MainWindow::handleCheckHaltStatus(const Status &status)
{
    if (m_currentWidgetConfiguration % 2 == 1) { // ra mode
        return;
    }
    m_logWriterRa.handleStatus(status);
    if (status->has_game_state()) {
        const amun::GameState &gameState = status->game_state();
        if (gameState.state() != amun::GameState::Halt) {
            ui->logManager->setPaused(true);
            liveMode();
        }
    }
    if (status->has_status_strategy() || status->debug_size() > 0) {
        // use 50 as some upper limit, the exact number is irrelevant
        if (m_horusStrategyBuffer.size() < 50) {
            m_horusStrategyBuffer.push_back(status);
        }
    }
}

void MainWindow::raMode()
{
    setWindowIcon(QIcon("icon:ra.svg"));
    setWindowTitle("Ra");
    ui->field->enableDragMeasure(false);
    toggleHorusModeWidgets(false);
    ui->btnOpen->hide();
    ui->logManager->setEnabled(false);
    ui->logManager->hide();
    ui->field->setHorusMode(false);

    for (const Status &status : m_horusStrategyBuffer) {
        handleStatus(status);
    }
    m_horusStrategyBuffer.clear();

    ui->simulator->sendPauseSimulator(amun::Horus, false);

    disconnect(&m_amun, SIGNAL(gotStatus(Status)), this, SLOT(handleCheckHaltStatus(Status)));
    connect(&m_amun, SIGNAL(gotStatus(Status)), SLOT(handleStatus(Status)));
    disconnect(&m_amun, SIGNAL(gotReplayStatus(Status)), this, SLOT(handleStatus(Status)));
    disconnect(ui->logManager, SIGNAL(gotStatus(Status)), &m_amun, SIGNAL(sendReplayStatus(Status)));
    disconnect(this, SIGNAL(gotStatus(Status)), &m_logWriterHorus, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), &m_logWriterRa, SLOT(handleStatus(Status)));
}

void MainWindow::horusMode()
{
    setWindowIcon(QIcon("icon:logplayer.svg"));
    setWindowTitle(m_horusTitleString.isEmpty() ? "Horus" : "Horus - " + m_horusTitleString);
    ui->field->enableDragMeasure(true);
    toggleHorusModeWidgets(true);
    ui->btnOpen->show();
    ui->logManager->setEnabled(true);
    ui->logManager->show();
    ui->field->setHorusMode(true);

    ui->simulator->sendPauseSimulator(amun::Horus, true);

    // there may still be packets between amun and the gui coming from the simulator
    // especially when a log was opened and the gui was blocked for some time
    // 200 ms is an arbitrary number, the exact time shouldn't really matter
    QCoreApplication::processEvents(QEventLoop::AllEvents, 200);

    disconnect(this, SIGNAL(gotStatus(Status)), &m_logWriterRa, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), &m_logWriterHorus, SLOT(handleStatus(Status)));
    disconnect(&m_amun, SIGNAL(gotStatus(Status)), this, SLOT(handleStatus(Status)));
    connect(&m_amun, SIGNAL(gotReplayStatus(Status)), this, SLOT(handleStatus(Status)));
    connect(&m_amun, SIGNAL(gotStatus(Status)), SLOT(handleCheckHaltStatus(Status)));
    connect(ui->logManager, SIGNAL(gotStatus(Status)), &m_amun, SIGNAL(sendReplayStatus(Status)));
}

void MainWindow::toggleHorusModeWidgets(bool enable)
{
    ui->actionGoLive->setEnabled(enable);
    ui->actionFrameBack->setEnabled(enable);
    ui->actionFrameForward->setEnabled(enable);
    ui->actionStepBack->setEnabled(enable);
    ui->actionStepForward->setEnabled(enable);
    ui->actionTogglePause->setEnabled(enable);
    ui->actionShowBacklog->setEnabled(!enable);
    ui->menuPlaySpeed->setEnabled(enable);
    for (auto speedAction : ui->menuPlaySpeed->actions()) {
        speedAction->setEnabled(enable);
    }
    ui->referee->setEnabled(!enable);
    ui->simulator->setEnabled(!enable);
    ui->robots->enableContent(!enable);
    ui->actionRecordLogLog->setEnabled(enable);
    ui->actionRecordLogLog->setVisible(enable);
    ui->actionBackloglog->setEnabled(enable);
    ui->actionBackloglog->setVisible(enable);
    ui->actionSaveBackloglog->setEnabled(enable);
    ui->actionSaveBackloglog->setVisible(enable);
    ui->actionRecord->setEnabled(!enable);
    ui->actionRecord->setVisible(!enable);
    ui->actionSave20s->setEnabled(!enable);
    ui->actionSave20s->setVisible(!enable);
    ui->actionSaveBacklog->setEnabled(!enable);
    ui->actionSaveBacklog->setVisible(!enable);
    ui->goToLastPosition->setVisible(enable && m_logOpener->showGoToLastPositionButton());
}

void MainWindow::showConfigDialog()
{
    m_configDialog->exec();
}

void MainWindow::dragEnterEvent(QDragEnterEvent *event)
{
    event->acceptProposedAction();
}

void MainWindow::dragMoveEvent(QDragMoveEvent *event)
{
    event->acceptProposedAction();
}

void MainWindow::dragLeaveEvent(QDragLeaveEvent *event)
{
    event->accept();
}

void MainWindow::logOpened(QString name)
{
    if (!errorOccurred) {
        m_horusTitleString = name;
        setWindowTitle("Horus - " + name);
        switchToWidgetConfiguration(static_cast<int>(m_currentWidgetConfiguration + m_currentWidgetConfiguration % 2));
    } else {
        QMessageBox::critical(this, "Logfile error", name);
    }
}

void MainWindow::dropEvent(QDropEvent *event)
{
    const QMimeData* mimeData = event->mimeData();

    if (mimeData->hasUrls()) {
        QList<QUrl> urlList = mimeData->urls();
        if (urlList.size() > 0) {
            m_logOpener->openFile(urlList.at(0).toLocalFile());
            event->acceptProposedAction();
        }
    }
}

void MainWindow::selectFrame(int amm)
{
    int frame = std::max(0,std::min(amm, ui->logManager->getLastFrame()));
    ui->logManager->seekPacket(frame);
}

void MainWindow::openFile(QString fileName)
{
    m_logOpener->openFile(fileName);
}
