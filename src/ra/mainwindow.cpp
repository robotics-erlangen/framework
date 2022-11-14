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
#include "internalreferee/internalreferee.h"
#include "robotuiaction.h"
#include "plotter/plotter.h"
#include "config/config.h"
#include "widgets/debuggerconsole.h"
#include "widgets/refereestatuswidget.h"
#include "savedirectorydialog.h"
#include "logcutter/logcutter.h"
#include "logopener.h"
#include "loglabel.h"
#include "logfileselectiondialog.h"
#include "core/configuration.h"
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
#include <QMessageBox>
#include <QInputDialog>
#include <QTabBar>

MainWindow::MainWindow(bool tournamentMode, bool isRa, QWidget *parent) :
    QMainWindow(parent),
    ui(new Ui::MainWindow),
    m_transceiverActive(false),
    m_lastStageTime(0),
    m_isTournamentMode(tournamentMode),
    m_currentWidgetConfiguration(0)
{
    qRegisterMetaType<SSL_Referee::Command>("SSL_Referee::Command");
    qRegisterMetaType<SSL_Referee::Stage>("SSL_Referee::Stage");
    qRegisterMetaType<Status>("Status");

    ui->setupUi(this);

    m_loggingUiRa = new Logsuite(ui->actionRecord, ui->actionSave20s, ui->actionSaveBacklog, false, this);
    m_loggingUiHorus = new Logsuite(ui->actionRecordLogLog, ui->actionBackloglog, ui->actionSaveBackloglog, true, this);

    ui->logManager->hide();
    ui->btnOpen->setVisible(false);

    // setup icons
    ui->actionEnableTransceiver->setIcon(QIcon("icon:32/network-wireless.png"));
    ui->actionRecord->setIcon(QIcon("icon:32/media-record.png"));
    ui->actionRecordLogLog->setIcon(QIcon("icon:32/media-record.png"));
    ui->actionChargeKicker->setIcon(QIcon("icon:32/capacitor.png"));
    ui->actionSimulator->setIcon(QIcon("icon:32/computer.png"));
    ui->actionInternalReferee->setIcon(QIcon("icon:32/whistle.png"));
    ui->actionInputDevices->setIcon(QIcon("icon:32/input-gaming.png"));
    ui->actionPlotter->setIcon(QIcon("icon:32/plotter.png"));
    ui->actionConfiguration->setIcon(QIcon("icon:32/preferences-system.png"));
    ui->actionAboutUs->setIcon(QIcon("icon:question.svg"));
    ui->actionGitInfo->setIcon(QIcon("icon:git-icon.svg"));

    ui->actionQuit->setShortcut(QKeySequence::Quit);

    // setup status bar
    m_transceiverStatus = new QLabel("Transceiver");
    QPalette p = m_transceiverStatus->palette();
    p.setColor(QPalette::WindowText, Qt::red);
    m_transceiverStatus->setPalette(p);
    statusBar()->addWidget(m_transceiverStatus);

    m_logTimeLabel = new LogLabel();
    statusBar()->addPermanentWidget(m_logTimeLabel);
    m_logTimeLabel->hide();

    m_refereeStatus = new RefereeStatusWidget;
    statusBar()->addPermanentWidget(m_refereeStatus);

    m_logOpener = new LogOpener(ui, this);
    connect(m_logOpener, &LogOpener::sendCommand, this, &MainWindow::sendCommand);

    // setup ui parts that send commands
    m_internalReferee = new InternalReferee(this);
    connect(m_internalReferee, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));
    connect(ui->referee, &RefereeWidget::sendCommand, this, &MainWindow::sendCommand);
    connect(ui->referee, SIGNAL(changeCommand(SSL_Referee::Command)), m_internalReferee, SLOT(changeCommand(SSL_Referee::Command)));
    connect(ui->referee, SIGNAL(changeStage(SSL_Referee::Stage)), m_internalReferee, SLOT(changeStage(SSL_Referee::Stage)));
    connect(ui->referee, SIGNAL(changeYellowKeeper(uint)), m_internalReferee, SLOT(changeYellowKeeper(uint)));
    connect(ui->referee, SIGNAL(changeBlueKeeper(uint)), m_internalReferee, SLOT(changeBlueKeeper(uint)));
    connect(ui->referee, SIGNAL(enableInternalAutoref(bool)), m_internalReferee, SLOT(enableInternalAutoref(bool)));
    connect(ui->referee, SIGNAL(changeSidesFlipped(bool)), m_internalReferee, SLOT(setSidesFlipped(bool)));
    connect(ui->referee, SIGNAL(sendYellowCard(int)), m_internalReferee, SLOT(setYellowCard(int)));
    connect(ui->referee, SIGNAL(sendDivisionChange(world::Geometry::Division)), this, SLOT(changeDivision(world::Geometry::Division)));

    connect(ui->field, &FieldWidget::sendPlaceBall, m_internalReferee, &InternalReferee::handlePlaceBall);


    m_inputManager = new InputManager(this);
    connect(m_inputManager, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));
    connect(m_inputManager, SIGNAL(toggleTransceiver()), ui->actionEnableTransceiver, SLOT(toggle()));
    connect(m_inputManager, SIGNAL(sendRefereeCommand(SSL_Referee::Command)), m_internalReferee, SLOT(changeCommand(SSL_Referee::Command)));
    ui->input->init(m_inputManager);

    connect(ui->strategies, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));
    ui->strategies->init(this);

    connect(ui->robots, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));
#ifdef EASY_MODE
    ui->robots->setIsSimulator(true);
#else
    connect(ui->actionSimulator, SIGNAL(toggled(bool)), ui->robots, SLOT(setIsSimulator(bool)));
#endif
    ui->robots->init(this, m_inputManager);

    connect(ui->simulator, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));
    connect(ui->simulatorConfig, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));
    connect(ui->field, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));

    m_configDialog = new ConfigDialog(this);
    connect(m_configDialog, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));
    connect(m_configDialog, SIGNAL(useNumKeysForReferee(bool)), this, SLOT(udpateSpeedActionsEnabled()));
    connect(m_configDialog, SIGNAL(setPalette(QPalette)), this, SLOT(updatePalette(QPalette)));

    m_aboutUs = new AboutUs(this);
    m_gitInfo = new GitInfoDialog(this);

    connect(ui->options, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));
    connect(ui->fieldParameters, &FieldParameters::sendCommand, this, &MainWindow::sendCommand);

    ui->blueDebugger->setStrategy(amun::DebugSource::StrategyBlue);
    connect(ui->blueDebugger, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));

    ui->yellowDebugger->setStrategy(amun::DebugSource::StrategyYellow);
    connect(ui->yellowDebugger, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));

    m_robotDoubleClickAction = new RobotUIAction(this);
    m_robotCtrlClickAction = new RobotUIAction(this);

    connect(m_configDialog, SIGNAL(setRobotDoubleClickAction(FieldWidgetAction, QString)),
            m_robotDoubleClickAction, SLOT(setActionType(FieldWidgetAction, QString)));
    connect(ui->field, SIGNAL(robotDoubleClicked(bool, int)), m_robotDoubleClickAction, SLOT(actionInvoced(bool, int)));
    connect(m_robotDoubleClickAction, SIGNAL(setDebugFilterString(QString)), ui->debugTree, SLOT(setFilter(QString)));
    connect(m_robotDoubleClickAction, SIGNAL(toggleVisualization(QString)), ui->visualization, SLOT(toggleVisualization(QString)));

    connect(m_configDialog, SIGNAL(setRobotCtrlClickAction(FieldWidgetAction, QString)),
            m_robotCtrlClickAction, SLOT(setActionType(FieldWidgetAction, QString)));
    connect(ui->field, SIGNAL(robotCtrlClicked(bool, int)), m_robotCtrlClickAction, SLOT(actionInvoced(bool, int)));
    connect(m_robotCtrlClickAction, SIGNAL(setDebugFilterString(QString)), ui->debugTree, SLOT(setFilter(QString)));
    connect(m_robotCtrlClickAction, SIGNAL(toggleVisualization(QString)), ui->visualization, SLOT(toggleVisualization(QString)));

    connect(m_configDialog, &ConfigDialog::setScrollSensitivity,
            ui->field, &FieldWidget::setScrollSensitivity);

    // setup visualization only parts of the ui
    connect(ui->visualization, SIGNAL(itemsChanged(QStringList)), ui->field, SLOT(visualizationsChanged(QStringList)));

    m_plotter = new Plotter();
    connect(m_plotter, SIGNAL(spacePressed()), this, SLOT(togglePause()));

    connect(ui->debugTree, SIGNAL(triggerBreakpoint()), SLOT(pauseAll()));

    // connect the menu actions
    connect(ui->actionEnableTransceiver, SIGNAL(toggled(bool)), SLOT(setTransceiver(bool)));
    connect(ui->actionDisableTransceiver, SIGNAL(triggered(bool)), SLOT(disableTransceiver()));
    addAction(ui->actionDisableTransceiver); // only actions that are used somewhere are triggered
    connect(ui->actionChargeKicker, SIGNAL(toggled(bool)), SLOT(setCharge(bool)));

    connect(ui->actionSimulator, SIGNAL(toggled(bool)), SLOT(setSimulatorEnabled(bool)));
    connect(ui->actionInternalReferee, SIGNAL(toggled(bool)), SLOT(setInternalRefereeEnabled(bool)));
    connect(ui->actionInputDevices, SIGNAL(toggled(bool)), m_inputManager, SLOT(setEnabled(bool)));

    connect(ui->actionConfiguration, SIGNAL(triggered()), SLOT(showConfigDialog()));
    connect(ui->actionAboutUs, SIGNAL(triggered()), m_aboutUs, SLOT(exec()));
    connect(ui->actionGitInfo, SIGNAL(triggered()), m_gitInfo, SLOT(show()));
    connect(ui->actionPlotter, SIGNAL(triggered()), this, SLOT(showPlotter()));
    connect(ui->actionAutoPause, SIGNAL(toggled(bool)), ui->simulator, SLOT(setEnableAutoPause(bool)));
    connect(ui->actionUseLocation, SIGNAL(toggled(bool)), this, SLOT(useLogfileLocation(bool)));
    connect(ui->actionUseLocation, SIGNAL(toggled(bool)), m_logOpener, SLOT(useLogfileLocation(bool)));
    connect(ui->actionChangeLocation, SIGNAL(triggered()), SLOT(showDirectoryDialog()));
    connect(ui->exportVision, &QAction::triggered, this, &MainWindow::exportVisionLog);
    connect(ui->getLogUid, &QAction::triggered, this, &MainWindow::requestLogUid);
    connect(ui->openLogUidString, &QAction::triggered, this, &MainWindow::requestUidInsertWindow);

    connect(ui->actionGoLive, SIGNAL(triggered()), SLOT(liveMode()));
    connect(ui->actionShowBacklog, SIGNAL(triggered()), SLOT(showBacklogMode()));
    connect(ui->actionFrameBack, SIGNAL(triggered()), ui->logManager, SLOT(previousFrame()));
    connect(ui->actionFrameForward, SIGNAL(triggered()), ui->logManager, SLOT(nextFrame()));
    connect(ui->actionStepBack, SIGNAL(triggered()), ui->logManager, SIGNAL(stepBackward()));
    connect(ui->actionStepForward, SIGNAL(triggered()), ui->logManager, SIGNAL(stepForward()));
    connect(ui->actionTogglePause, SIGNAL(triggered()), ui->logManager, SIGNAL(togglePaused()));

    // setup data distribution
    connect(this, SIGNAL(gotStatus(Status)), ui->field, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), m_plotter, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->visualization, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->debugTree, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), m_internalReferee, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->referee, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->refereeinfo, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->timing, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), m_refereeStatus, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->log, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->options, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->blueDebugger, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->yellowDebugger, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->simulator, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), m_logTimeLabel, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->logManager, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->replay, SIGNAL(gotStatus(Status)));
    connect(this, &MainWindow::gotStatus, m_logTimeLabel, &LogLabel::handleStatus);
    connect(this, &MainWindow::gotStatus, m_gitInfo, &GitInfoDialog::handleStatus);
    connect(this, &MainWindow::gotStatus, ui->fieldParameters, &FieldParameters::handleStatus);

    connect(ui->field, &FieldWidget::selectRobots, ui->robots, &RobotSelectionWidget::selectRobots);

    // set up log connections
    createLogWriterConnections(m_loggingUiRa);
    createLogWriterConnections(m_loggingUiHorus);

    // disable all possibilities of skipping / going back packets when recording
    connect(m_loggingUiHorus, SIGNAL(isLogging(bool)), ui->logManager, SIGNAL(disableSkipping(bool)));

    // start amun
    m_amun.start();

    QSettings s;

    // find all simulator configuration files
    QDirIterator dirIterator(QString(ERFORCE_CONFDIR) + "simulator", {"*.txt"}, QDir::AllEntries | QDir::NoSymLinks | QDir::NoDotAndDotDot);
    m_simulatorSetupGroup = new QActionGroup(this);
    QString selectedFile = s.value("Simulator/SetupFile", "2020").toString();
    QAction *selectedAction = nullptr;
    while (dirIterator.hasNext()) {
        QFileInfo file(dirIterator.next());
        QString shownFilename = file.fileName().split(".").first();
        QAction *setupAction = new QAction(this);
        setupAction->setText(shownFilename);
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

    // hide options dock by default
    ui->dockOptions->hide();

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

    ui->actionEnableTransceiver->setChecked(ui->actionSimulator->isChecked() ? m_transceiverSimulator : m_transceiverRealWorld);
    ui->actionChargeKicker->setChecked(ui->actionSimulator->isChecked() ? m_chargeSimulator : m_chargeRealWorld);

    // restore configuration and initialize everything
    ui->input->load();
    ui->visualization->load();
    m_configDialog->load();
    ui->simulatorConfig->load();
    ui->robots->loadRobots();
    // HACK: wait for a short time before loading the strategies and autoref
    // This is to prevent repeated reloading of the strategies.
    // Since the reloading takes more time than 10ms, this is an overall win when starting Ra.
    // It is necessary since the geometry updates have to propagate through multiple threads
    // while the strategy load commands are directly moved to the strategy threads.
    // Therefore, they can arrive before the geometry changes, leading to strategy reloads.
    QThread::msleep(10);
    // WARNING: these two loads must always be the last and in this exact order
    // Only then is the number of strategy reloads minimized
    ui->referee->load();
    ui->strategies->loadStrategies();

    // playback speed shortcuts
    QSignalMapper *mapper = new QSignalMapper(this);
    connect(mapper, SIGNAL(mapped(int)), this, SLOT(setSpeed(int)));
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
    connect(ui->actionSaveConfiguration, SIGNAL(triggered(bool)), ui->strategies, SLOT(saveConfig()));
    connect(ui->actionSaveConfiguration, SIGNAL(triggered(bool)), ui->robots, SLOT(saveConfig()));
    connect(ui->actionSaveConfiguration, SIGNAL(triggered(bool)), ui->field, SLOT(saveConfig()));
    connect(ui->actionSaveConfiguration, SIGNAL(triggered(bool)), ui->timing, SLOT(saveConfig()));
    connect(ui->actionSaveConfiguration, SIGNAL(triggered(bool)), ui->visualization, SLOT(saveConfig()));
    connect(ui->actionSaveConfiguration, SIGNAL(triggered(bool)), ui->simulatorConfig, SLOT(save()));

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

    setAcceptDrops(true);

    ui->replay->setRecentScriptList(ui->strategies->recentScriptsList());
    connect(ui->replay, SIGNAL(sendCommand(Command)), SLOT(sendCommand(Command)));
    connect(ui->logManager, &LogSlider::sendCommand, this, &MainWindow::sendCommand);
    connect(&m_amun, SIGNAL(gotStatus(Status)), SLOT(handleStatus(Status)));

    // add shortcuts
    connect(ui->actionLogCutter, &QAction::triggered, logCutter, &LogCutter::show);

    // setup data distribution
    connect(this, SIGNAL(gotStatus(Status)), m_logOpener, SLOT(handleStatus(Status)));

    const uint INITIAL_CONFIG_ID = isRa ? 1 : 2;
    switchToWidgetConfiguration(INITIAL_CONFIG_ID, true);
    udpateSpeedActionsEnabled();

#ifdef EASY_MODE
    ui->actionSimulator->setChecked(true);
    ui->actionSimulator->setEnabled(false);
    ui->actionInternalReferee->setChecked(true);
    ui->actionInternalReferee->setEnabled(false);
    ui->actionInputDevices->setChecked(true);
    ui->actionInputDevices->setEnabled(true);
    ui->actionChargeKicker->setChecked(true);
    ui->actionChargeKicker->setEnabled(false);
    ui->actionEnableTransceiver->setChecked(true);
    ui->actionEnableTransceiver->setEnabled(false);
#endif

    showMaximized();

    const int backgroundValue = palette().brush(QPalette::Window).color().value();
    const int foregroundValue = palette().brush(QPalette::WindowText).color().value();
    const bool isDarkMode = backgroundValue < foregroundValue;
    ui->referee->setStyleSheets(isDarkMode);
    ui->refereeinfo->setStyleSheets(isDarkMode);
    ui->strategies->setUseDarkColors(isDarkMode);
    ui->replay->setUseDarkColors(isDarkMode);
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
    ui->strategies->shutdown();
    ui->referee->shutdownInternalAutoref();

    QMainWindow::closeEvent(e);
}

void MainWindow::showPlotter()
{
    m_plotter->showPlotter();

    // no need to preload all 20 seconds
    const int PRELOAD_PACKETS = 5000;
    Command c(new amun::Command);
    c->mutable_record()->set_request_backlog(PRELOAD_PACKETS);
    c->mutable_record()->set_for_replay(m_currentWidgetConfiguration % 2 == 0); // horus mode
    sendCommand(c);
}

void MainWindow::togglePause()
{
    if (m_currentWidgetConfiguration % 2 == 1) {
        ui->simulator->toggleSimulatorRunning();
    } else {
        ui->actionTogglePause->trigger();
    }
}

void MainWindow::pauseAll()
{
    if (m_currentWidgetConfiguration % 2 == 1) {
        if (ui->actionSimulator->isChecked()) {
            ui->simulator->stop();
        }
    } else {
        ui->logManager->pause();
    }
}

void MainWindow::setSpeed(int speed)
{
    if (m_currentWidgetConfiguration % 2 == 1) {
        ui->simulator->setSpeed(speed);
    } else {
        emit ui->logManager->setSpeed(speed);
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

void MainWindow::createLogWriterConnections(Logsuite* suite)
{
    connect(suite, &Logsuite::sendCommand, this, &MainWindow::sendCommand);
    connect(this, &MainWindow::gotStatus, suite, &Logsuite::handleStatus);
}

void MainWindow::saveConfig()
{
    // Don't save for invalid default widget config
    if (m_currentWidgetConfiguration == 0)
        return;

    QSettings s;

    s.beginGroup("MainWindow" + QString::number(m_currentWidgetConfiguration));
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
    s.setValue("LogWriter/UseLocation", ui->actionUseLocation->isChecked());

    m_logOpener->saveConfig();
}

void MainWindow::loadConfig(bool doRestoreGeometry, uint configId)
{
    QSettings s;
    if (!s.isWritable()) {
        QLabel *label = new QLabel(this);
        label->setText("<font color=\"red\">Can not save config! Check permissions of config file.</font>");
        statusBar()->addPermanentWidget(label);
    }
    s.beginGroup("MainWindow" + QString::number(configId));
    if (doRestoreGeometry) {
        restoreGeometry(s.value("Geometry").toByteArray());
    }
    if (s.value("State").isNull()) {

        // The intention here is to first hide all the widgets and then only show the ones that should be part of the default configuration.
        // Since there seems to be no elegant way to hide all the QDockWidgets this for loop with dynamic_casts will have to do.
        // The alternative would be to manually hide all the widgets that we don't want to show as a default, but then we would have to
        // manually add this every time we create a new widget.
        for (const auto child : children()) {
            const auto childWidget = dynamic_cast<QDockWidget*>(child);
            if (childWidget != nullptr) {
                // Toolbars should not be hidden
                const auto childToolBar = dynamic_cast<QToolBar*>(child);
                if (childToolBar == nullptr) {
                    childWidget->hide();
                }
            }
        }

        if (configId % 2 == 1) {
            // ra config
            tabifyDockWidget(ui->dockVisualization, ui->dockSimulator);
            tabifyDockWidget(ui->dockSimulator, ui->dockSimConfig);
            tabifyDockWidget(ui->dockRobots, ui->dockReferee);

            ui->dockSimulator->show();
            ui->dockSimConfig->show();
            ui->dockVisualization->show();

            ui->dockStrategy->show();
            ui->dockReferee->show();
            ui->dockRobots->show();

            ui->dockTiming->show();
        } else {
            // horus config
            ui->dockVisualization->show();
            ui->dockReplay->show();
        }

        const auto width = ui->splitterH->size().width();
        const auto debugTreeWidth = width / 5;
        const auto fieldWidgetWidth = width - debugTreeWidth;
        ui->splitterH->setSizes({debugTreeWidth, fieldWidgetWidth});

        const auto height = ui->splitterV->size().width();
        const auto consoleHeight = height / 5;
        const auto fieldWidgetHeight = height - consoleHeight;
        ui->splitterV->setSizes({fieldWidgetHeight, consoleHeight});

        // This selects the uppermost Tab of the tabifiedDockWidgets
        // Sadly has to be after the show calls, because currentIndex refers to the visible widgets
        for (const auto child : children()) {
            const auto childTabBar = dynamic_cast<QTabBar*>(child);
            if (childTabBar != nullptr) {
                childTabBar->setCurrentIndex(0);
            }
        }
    }
    restoreState(s.value("State").toByteArray());
    ui->splitterV->restoreState(s.value("SplitterV").toByteArray());
    ui->splitterH->restoreState(s.value("SplitterH").toByteArray());
    s.endGroup();
}

void MainWindow::switchToWidgetConfiguration(int configId, bool forceUpdate)
{
    unsigned int id = static_cast<unsigned int>(configId);
    if (id != m_currentWidgetConfiguration) {
        saveConfig();
        unsigned int previousId = m_currentWidgetConfiguration;
        m_currentWidgetConfiguration = id;
        loadConfig(false, m_currentWidgetConfiguration);

        // Horus mode
        if (configId % 2 == 0 && (forceUpdate || previousId % 2 == 1)) {
            horusMode();
        } else if (configId % 2 == 1 && (forceUpdate || previousId % 2 == 0)) {
            raMode();
        }
    }

}

void MainWindow::simulatorSetupChanged(QAction * action)
{
    updateSimulatorSetup("simulator/" + action->text().replace("&", ""));
}

void MainWindow::updateSimulatorSetup(QString setupFile) {
    Command command(new amun::Command);
    if (!loadConfiguration(setupFile, command->mutable_simulator()->mutable_simulator_setup(), false)) {
        return;
    }

    // reload the strategies / autoref
    sendCommand(command);

    // resend all the information the simulator needs
    ui->robots->resend();
    ui->simulatorConfig->sendAll();
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

    if (status->has_pure_ui_response()) {
        auto response = status->pure_ui_response();
        if (response.has_log_open()) {
            const auto& logInfo = response.log_open();
            logOpened(QString::fromStdString(logInfo.filename() + " (seshat) "), !logInfo.success());
        }

        if (response.has_force_ra_horus()) {
            bool ra = response.force_ra_horus();
            if (ra && m_currentWidgetConfiguration % 2 == 0) {
                // Ra Mode
                switchToWidgetConfiguration(m_currentWidgetConfiguration - 1);
            }
            else if (!ra && m_currentWidgetConfiguration % 2 == 1) {
                // Horus Mode
                switchToWidgetConfiguration(m_currentWidgetConfiguration + 1);
            }
        }

        if (response.has_export_visionlog_error()) {
            QMessageBox::critical(this, "Visionlog export error", QString::fromStdString(response.export_visionlog_error()));
        }

        if (response.has_requested_log_uid()) {
            QMessageBox::information(this, "Log UID", QString::fromStdString(response.requested_log_uid()));
        }

        if (response.has_log_offers()) {
            LogFileSelectionDialog* dialog = new LogFileSelectionDialog(this);
            dialog->setAttribute(Qt::WA_DeleteOnClose);
            connect(dialog, SIGNAL(resultSelected(QString)), m_logOpener, SLOT(openFile(const QString&)));
            dialog->setListContent(response.log_offers());
            dialog->show();
        }

        if (response.has_log_uid_parser_error()) {
            QMessageBox::critical(this, "UID Parser error", QString::fromStdString(response.log_uid_parser_error()));
        }
    }

    emit gotStatus(status);
}

void MainWindow::useLogfileLocation(bool enable)
{
    Command command(new amun::Command);
    command->mutable_record()->set_use_logfile_location(enable);
    sendCommand(command);
}

void MainWindow::exportVisionLog()
{
    QString filename = QFileDialog::getSaveFileName(this, "Save file location", "", "Vision log files (*.log)");

    if (!filename.isEmpty()) {
        Command command(new amun::Command);
        command->mutable_playback()->set_export_vision_log(filename.toStdString());
        sendCommand(command);
    }
}

void MainWindow::requestLogUid()
{
    Command command{new amun::Command};
    command->mutable_playback()->mutable_get_uid();
    sendCommand(command);
}

void MainWindow::searchUid(QString uid)
{
    Command command{new amun::Command};
    command->mutable_playback()->set_find_logfile(
                uid.toStdString()
            );
    sendCommand(command);
}

void MainWindow::requestUidInsertWindow()
{
    auto* input = new QInputDialog(this);
    input->setAttribute(Qt::WA_DeleteOnClose);
    connect(input, &QInputDialog::textValueSelected, this, &MainWindow::searchUid);
    input->show();
}

void MainWindow::sendCommand(const Command &command)
{
    m_gitInfo->handleCommand(command);
    emit m_amun.sendCommand(command);
}

void MainWindow::setSimulatorEnabled(bool enabled)
{
    ui->actionEnableTransceiver->setChecked(ui->actionSimulator->isChecked() ? m_transceiverSimulator : m_transceiverRealWorld);
    ui->actionChargeKicker->setChecked(ui->actionSimulator->isChecked() ? m_chargeSimulator : m_chargeRealWorld);

    if (enabled) {
        ui->actionDisableTransceiver->setShortcut(QKeySequence());
    } else {
        ui->actionDisableTransceiver->setShortcut(QKeySequence(Qt::Key_Escape));
    }

    udpateSpeedActionsEnabled();

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
    ui->strategies->forceAutoReload(!enabled);
    ui->referee->forceAutoReload(!enabled);

    ui->field->internalRefereeEnabled(enabled);
}

void MainWindow::setTransceiver(bool enabled)
{
    if (ui->actionSimulator->isChecked()) {
        m_transceiverSimulator = enabled;
    } else {
        m_transceiverRealWorld = enabled;
    }
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
    if (ui->actionSimulator->isChecked()) {
        m_chargeSimulator = charge;
    } else {
        m_chargeRealWorld = charge;
    }

    Command command(new amun::Command);
    amun::CommandTransceiver *t = command->mutable_transceiver();
    t->set_charge(charge);
    sendCommand(command);
}

void MainWindow::liveMode()
{
    switchToWidgetConfiguration(static_cast<int>(m_currentWidgetConfiguration - 1));
}

void MainWindow::showBacklogMode() //Instant Replay
{
    if (ui->actionSimulator->isChecked() || m_lastRefState == amun::GameState::Halt) {
        m_horusTitleString = "Instant Replay";
        switchToWidgetConfiguration(static_cast<int>(m_currentWidgetConfiguration + 1));
        m_logOpener->saveCurrentPosition();
        Command command(new amun::Command);
        command->mutable_playback()->mutable_instant_replay();
        sendCommand(command);
        ui->logManager->openNextAtEnd();
    }
}

static Command uiChangedCommand(bool ra)
{
    Command ret(new amun::Command);
    ret->mutable_playback()->set_run_playback(!ra);
    return ret;
}

void MainWindow::raMode()
{
    m_plotter->clearData();

    setWindowIcon(QIcon("icon:ra.svg"));
    setWindowTitle("Ra");
    ui->field->enableDragMeasure(false);
    toggleHorusModeWidgets(false);
    ui->btnOpen->hide();
    ui->logManager->setEnabled(false);
    ui->logManager->hide();
    ui->field->setHorusMode(false);

    sendCommand(uiChangedCommand(true));
    ui->simulator->sendPauseSimulator(amun::Horus, false);
}

void MainWindow::horusMode()
{
    m_plotter->clearData();

    setWindowIcon(QIcon("icon:logplayer.svg"));
    setWindowTitle(m_horusTitleString.isEmpty() ? "Horus" : "Horus - " + m_horusTitleString);
    ui->field->enableDragMeasure(true);
    toggleHorusModeWidgets(true);
    ui->btnOpen->show();
    ui->logManager->setEnabled(true);
    ui->logManager->show();
    ui->field->setHorusMode(true);

    ui->simulator->sendPauseSimulator(amun::Horus, true);
    sendCommand(uiChangedCommand(false));
}

void MainWindow::toggleHorusModeWidgets(bool enable)
{
#ifdef EASY_MODE
    ui->actionGoLive->setEnabled(false);
#else
    ui->actionGoLive->setEnabled(enable);
#endif
    ui->actionFrameBack->setEnabled(enable);
    ui->actionFrameForward->setEnabled(enable);
    ui->actionStepBack->setEnabled(enable);
    ui->actionStepForward->setEnabled(enable);
    ui->actionTogglePause->setEnabled(enable);
    ui->actionShowBacklog->setEnabled(!enable);
    ui->referee->setEnabled(!enable);
    ui->simulator->setEnabled(!enable);
    ui->simulatorConfig->setEnabled(!enable);
    ui->strategies->enableContent(!enable);
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
    ui->goToLastPosition->setVisible(enable && m_logOpener->showGoToLastPositionButton());
    ui->exportVision->setVisible(enable);
    ui->getLogUid->setVisible(enable);

    if (enable) {
        connect(m_loggingUiHorus, &Logsuite::isLogging, ui->actionFrameBack, &QAction::setDisabled);
        connect(m_loggingUiHorus, &Logsuite::isLogging, ui->actionFrameForward, &QAction::setDisabled);
        connect(m_loggingUiHorus, &Logsuite::isLogging, ui->actionStepBack, &QAction::setDisabled);
        connect(m_loggingUiHorus, &Logsuite::isLogging, ui->actionStepForward, &QAction::setDisabled);
    } else {
        disconnect(m_loggingUiHorus, &Logsuite::isLogging, ui->actionFrameBack, &QAction::setDisabled);
        disconnect(m_loggingUiHorus, &Logsuite::isLogging, ui->actionFrameForward, &QAction::setDisabled);
        disconnect(m_loggingUiHorus, &Logsuite::isLogging, ui->actionStepBack, &QAction::setDisabled);
        disconnect(m_loggingUiHorus, &Logsuite::isLogging, ui->actionStepForward, &QAction::setDisabled);
    }

    udpateSpeedActionsEnabled();
}

void MainWindow::udpateSpeedActionsEnabled()
{
    bool enable = (ui->actionSimulator->isChecked() && !m_configDialog->numKeysUsedForReferee()) ||
        m_currentWidgetConfiguration % 2 == 0; // horus mode
    ui->menuPlaySpeed->setEnabled(enable);
    for (auto speedAction : ui->menuPlaySpeed->actions()) {
        speedAction->setEnabled(enable);
    }
    ui->referee->enableNumberShortcuts(!enable);
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

void MainWindow::logOpened(QString name, bool errorOccurred)
{
    if (!errorOccurred) {
        m_plotter->clearData();
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

void MainWindow::changeDivision(world::Geometry::Division division) {
    switch (division) {
        case world::Geometry_Division_A:
            updateSimulatorSetup("simulator/" + m_simulatorSetupGroup->checkedAction()->text().replace("&", ""));
            break;
        case world::Geometry_Division_B:
            updateSimulatorSetup("simulator/2020B");
            break;
    }
}

void MainWindow::updatePalette(QPalette palette) {
    const int backgroundValue = palette.brush(QPalette::Window).color().value();
    const int foregroundValue = palette.brush(QPalette::WindowText).color().value();
    const bool isDarkMode = backgroundValue < foregroundValue;
    ui->referee->setStyleSheets(isDarkMode);
    ui->refereeinfo->setStyleSheets(isDarkMode);
    ui->strategies->setUseDarkColors(isDarkMode);
    ui->replay->setUseDarkColors(isDarkMode);
}
