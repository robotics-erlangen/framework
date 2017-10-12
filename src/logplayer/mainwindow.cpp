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

#include "mainwindow.h"
#include "ui_mainwindow.h"
#include <QFileDialog>
#include <QMessageBox>
#include <QSettings>
#include <QThread>
#include <QSignalMapper>
#include "widgets/refereestatuswidget.h"
#include "logfile/logfilereader.h"
#include "plotter/plotter.h"
#include "logcutter.h"
#include "strategy/strategy.h"

MainWindow::MainWindow(QWidget *parent) :
    QMainWindow(parent),
    ui(new Ui::MainWindow),
    m_lastTeamInfo(new amun::Command),
    m_lastTeamInfoUpdated(false),
    m_logWriter(true, 20)
{
    qRegisterMetaType<Status>("Status");
    qRegisterMetaType<Command>("Command");

#if (QT_VERSION < QT_VERSION_CHECK(5, 1, 0))
    setWindowIcon(QIcon("icon:logplayer.svg"));
#endif
    ui->setupUi(this);

    m_plotter = new Plotter();

    LogCutter *logCutter = new LogCutter();

    m_playTimer = ui->logManager->getPlayTimer();

    // setup status bar
    m_refereeStatus = new RefereeStatusWidget;
    statusBar()->addPermanentWidget(m_refereeStatus);

    m_logfile = new LogFileReader();
    m_logfile->close();

    // setup icons
    ui->btnOpen->setIcon(QIcon::fromTheme("document-open"));

    // setup visualization parts of the ui
    connect(ui->visualization, SIGNAL(itemsChanged(QStringList)), ui->field, SLOT(visualizationsChanged(QStringList)));
    ui->field->setLogplayer();
    ui->visualization->load();

    // add shortcuts
    connect(ui->actionOpen_Logfile, SIGNAL(triggered()), SLOT(openFile()));
    connect(ui->actionExit, SIGNAL(triggered()), qApp, SLOT(quit()));
    connect(ui->actionStepBackward, SIGNAL(triggered()), ui->logManager, SIGNAL(stepBackward()));
    connect(ui->actionStepForward, SIGNAL(triggered()), ui->logManager, SIGNAL(stepForward()));
    connect(ui->actionPlay, SIGNAL(triggered()), ui->logManager, SLOT(togglePaused()));
    connect(ui->actionBackward, SIGNAL(triggered()), ui->logManager, SLOT(previousFrame()));
    connect(ui->actionForward, SIGNAL(triggered()), ui->logManager, SLOT(nextFrame()));
    connect(ui->actionOpen_Plotter, SIGNAL(triggered()), m_plotter, SLOT(show()));
    connect(ui->actionLogCutter, &QAction::triggered, logCutter, &LogCutter::show);

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

    // probable qt bug: the actions don't work, if they are added to a global menu (mac / ubuntu),
    // unless they are added again. Qt ensures that the actions aren't triggered twice
    addAction(ui->actionStepBackward);
    addAction(ui->actionStepForward);
    addAction(ui->actionPlay);
    addAction(ui->actionBackward);
    addAction(ui->actionForward);

    // setup data distribution
    connect(ui->logManager, SIGNAL(gotStatus(Status)), SLOT(gotPreStatus(Status)));
    connect(ui->logManager, SIGNAL(gotPlayStatus(Status)), SLOT(gotPrePlayStatus(Status)));

    connect(this, SIGNAL(gotStatus(Status)), ui->field, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->visualization, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->timing, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->debugTree, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), m_refereeStatus, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotPlayStatus(Status)), ui->log, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotPlayStatus(Status)), m_plotter, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), this, SLOT(handleStatus(Status)));

    connect(ui->replay, SIGNAL(enableStrategyBlue(bool)), this, SLOT(enableStrategyBlue(bool)));
    connect(ui->replay, SIGNAL(enableStrategyYellow(bool)), this, SLOT(enableStrategyYellow(bool)));

    // restore configuration
    QSettings s;
    s.beginGroup("MainWindow");
    restoreGeometry(s.value("Geometry").toByteArray());
    restoreState(s.value("State").toByteArray());
    ui->splitter->restoreState(s.value("Splitter").toByteArray());
    s.endGroup();

    // create strategy threads
    m_strategyThreads[0] = new QThread(this);
    m_strategyThreads[0]->start();
    m_strategyThreads[1] = new QThread(this);
    m_strategyThreads[1]->start();

    m_strategys[0] = nullptr;
    m_strategys[1] = nullptr;

    // set up log connections
    connect(this, SIGNAL(gotStatus(Status)), &m_logWriter, SLOT(handleStatus(Status)));
    connect(ui->replay, SIGNAL(saveBacklog()), &m_logWriter, SLOT(backLogButtonClicked()));
    connect(ui->replay, SIGNAL(enableRecording(bool)), &m_logWriter, SLOT(recordButtonToggled(bool)));
    connect(&m_logWriter, SIGNAL(enableBacklogButton(bool)), ui->replay, SIGNAL(enableBackLogLogButton(bool)));
    connect(&m_logWriter, SIGNAL(enableRecordButton(bool)), ui->replay, SIGNAL(enableLogLogButton(bool)));
    connect(&m_logWriter, SIGNAL(setRecordButton(bool)), ui->replay, SIGNAL(setLogLogButton(bool)));

    // disable all possibilities of skipping / going back packets when recording
    connect(&m_logWriter, SIGNAL(disableSkipping(bool)), ui->logManager, SIGNAL(disableSkipping(bool)));
    connect(&m_logWriter, SIGNAL(disableSkipping(bool)), ui->actionBackward, SLOT(setDisabled(bool)));
    connect(&m_logWriter, SIGNAL(disableSkipping(bool)), ui->actionForward, SLOT(setDisabled(bool)));
    connect(&m_logWriter, SIGNAL(disableSkipping(bool)), ui->actionStepBackward, SLOT(setDisabled(bool)));
    connect(&m_logWriter, SIGNAL(disableSkipping(bool)), ui->actionStepForward, SLOT(setDisabled(bool)));

    // reset backlog if packets have been skipped
    connect(ui->actionForward, SIGNAL(triggered(bool)), &m_logWriter, SIGNAL(resetBacklog()));
    connect(ui->actionBackward, SIGNAL(triggered(bool)), &m_logWriter, SIGNAL(resetBacklog()));
    connect(ui->actionStepForward, SIGNAL(triggered(bool)), &m_logWriter, SIGNAL(resetBacklog()));
    connect(ui->actionStepBackward, SIGNAL(triggered(bool)), &m_logWriter, SIGNAL(resetBacklog()));
    connect(ui->logManager, SIGNAL(resetBacklog()), &m_logWriter, SIGNAL(resetBacklog()));

    // connect buttons, ...
    connect(ui->btnOpen, SIGNAL(clicked()), SLOT(openFile()));
}

MainWindow::~MainWindow()
{
    for (int i = 0; i < 2; i++) {
        if (m_strategys[i] != nullptr) {
            m_strategys[i]->deleteLater();
        }
        m_strategyThreads[i]->quit();
        m_strategyThreads[i]->wait();
    }
    delete ui;
}

void MainWindow::openFile()
{
    QString previousDir;
    // open again in previously used folder
    if (m_logfile->isOpen()) {
        QFileInfo finfo(m_logfile->filename());
        previousDir = finfo.dir().path();
    }

    QString filename = QFileDialog::getOpenFileName(this, "Select log file", previousDir);
    openFile(filename);
}

void MainWindow::openFile(const QString &filename)
{
    // don't do anything if the user couldn't decide for a new log file
    if (!filename.isEmpty()) {
        if (m_logfile->open(filename)) {
            ui->logManager->setStatusSource(m_logfile);
        } else {
            QMessageBox::critical(this, "Error", m_logfile->errorMsg());
            m_logfile->close();
        }

        setWindowTitle("Log Player - " + QFileInfo(filename).fileName());
    }
}

void MainWindow::enableStrategyBlue(bool enable)
{
    if (enable) {
        createStrategy(1);
    } else {
        closeStrategy(1);
    }
}

void MainWindow::enableStrategyYellow(bool enable)
{
    if (enable) {
        createStrategy(0);
    } else {
        closeStrategy(0);
    }
}

void MainWindow::closeStrategy(int index)
{
    m_strategys[index]->deleteLater();
    m_strategys[index] = nullptr;
    sendResetDebugPacket(index != 0);
}

void MainWindow::createStrategy(int index)
{
    Q_ASSERT(m_strategys[index] == nullptr);
    m_strategys[index] = new Strategy(m_playTimer, (index == 0) ? StrategyType::YELLOW : StrategyType::BLUE);
    m_strategys[index]->moveToThread(m_strategyThreads[index]);

    // set up data distribution to and from strategy
    connect(m_strategys[index], SIGNAL(sendStatus(Status)), ui->visualization, SLOT(handleStatus(Status)));
    connect(m_strategys[index], SIGNAL(sendStatus(Status)), ui->debugTree, SLOT(handleStatus(Status)));
    connect(m_strategys[index], SIGNAL(sendStatus(Status)), ui->log, SLOT(handleStatus(Status)));
    connect(m_strategys[index], SIGNAL(sendStatus(Status)), ui->field, SLOT(handleStatus(Status)));
    connect(m_strategys[index], SIGNAL(sendStatus(Status)), ui->replay, SIGNAL(gotStatus(Status)));
    connect(m_strategys[index], SIGNAL(sendStatus(Status)), &m_logWriter, SLOT(handleStatus(Status)));

    connect(ui->replay, SIGNAL(sendCommand(Command)), m_strategys[index], SLOT(handleCommand(Command)));
    connect(this, SIGNAL(sendCommand(Command)), m_strategys[index], SLOT(handleCommand(Command)));
    connect(this, SIGNAL(gotStatus(Status)), m_strategys[index], SLOT(handleStatus(Status)));
    connect(this, SIGNAL(reloadStrategy()), m_strategys[index], SLOT(reload()));

    // if the other strategy isnt running, reset debug data for it to remove visualizations
    emit sendCommand(m_lastTeamInfo);

    // create a status packet with empty debug to reset field debug visualizations
    if (m_strategys[index ^ 1] == nullptr) {
        sendResetDebugPacket(index == 0);
    }
}

void MainWindow::sendResetDebugPacket(bool blue)
{
    Status status(new amun::Status);
    status->set_time(m_playTimer->currentTime());
    amun::DebugValues * debug = status->mutable_debug();
    debug->set_source(blue ? amun::StrategyBlue : amun::StrategyYellow);
    emit gotStatus(status);
}

void MainWindow::processStatusDebug(const Status & status)
{
    bool replayBlue = ui->replay->replayBlueEnabled();
    bool replayYellow = ui->replay->replayYellowEnabled();
    if (replayBlue || replayYellow) {
        status->clear_debug();
    }
}

void MainWindow::gotPreStatus(const Status &status)
{
    processStatusDebug(status);
    emit gotStatus(status);
}

void MainWindow::gotPrePlayStatus(Status status)
{
    processStatusDebug(status);
    emit gotPlayStatus(status);
}

void MainWindow::handleStatus(const Status &status)
{
    // give the team information to the strategy
    Command command(new amun::Command);
    bool commandChanged = false;
    if (status->has_team_blue()) {
        robot::Team * teamBlue = command->mutable_set_team_blue();
        teamBlue->CopyFrom(status->team_blue());
        commandChanged = true;
    }
    if (status->has_team_yellow()) {
        robot::Team * teamYellow = command->mutable_set_team_yellow();
        teamYellow->CopyFrom(status->team_yellow());
        commandChanged = true;
    }
    if (commandChanged) {
        m_lastTeamInfo->CopyFrom(*command);
        m_lastTeamInfoUpdated = true;
        emit sendCommand(command);
    }
}

void MainWindow::closeEvent(QCloseEvent *e)
{
    ui->logManager->setPaused(true);

    // save configuration
    QSettings s;

    s.beginGroup("MainWindow");
    s.setValue("Geometry", saveGeometry());
    s.setValue("State", saveState());
    s.setValue("Splitter", ui->splitter->saveState());
    s.endGroup();

    // make sure the plotter is closed along with the mainwindow
    // this also ensure that a closeEvent is triggered
    m_plotter->close();

    QMainWindow::closeEvent(e);
}

QString MainWindow::formatTime(qint64 time) {
    // nanoseconds to mm:ss.MMMM time stamp (M = milliseconds)
    const double dtime = time / 1E9;
    return QString("%1:%2.%3")
           .arg((int) dtime / 60)
           .arg((int) dtime % 60, 2, 10, QChar('0'))
           .arg((int) (dtime * 1000) % 1000, 3, 10, QChar('0'));
}

void MainWindow::clearPlayConsumers()
{
    // the log just displays messages of a continuously played timespan
    ui->log->clear();
    m_plotter->clearData();
    ui->field->clearTraces();
    emit reloadStrategy();
}

void MainWindow::clearAll()
{
    ui->debugTree->clearData();
    ui->field->clearData();
}
