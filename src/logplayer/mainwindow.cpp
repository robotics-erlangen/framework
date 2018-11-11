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
#include <QSettings>
#include <QThread>
#include <QSignalMapper>
#include <QDragEnterEvent>
#include <QDragLeaveEvent>
#include <QDragMoveEvent>
#include <QDropEvent>
#include <QMimeData>
#include <QUrl>
#include <QDebug>
#include "widgets/refereestatuswidget.h"
#include "plotter/plot.h"
#include "plotter/plotter.h"
#include "logcutter.h"
#include "logopener.h"
#include "amun/amunclient.h"

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
    m_logOpener = new LogOpener(ui, this);

    m_playTimer = ui->logManager->getPlayTimer();

    setAcceptDrops(true);

    // setup status bar
    m_refereeStatus = new RefereeStatusWidget;
    statusBar()->addPermanentWidget(m_refereeStatus);

    // setup visualization parts of the ui
    connect(ui->visualization, SIGNAL(itemsChanged(QStringList)), ui->field, SLOT(visualizationsChanged(QStringList)));
    ui->field->setLogplayer();
    ui->visualization->load();

    // add shortcuts
    connect(ui->actionExit, SIGNAL(triggered()), qApp, SLOT(quit()));
    connect(ui->actionStepBackward, SIGNAL(triggered()), ui->logManager, SIGNAL(stepBackward()));
    connect(ui->actionStepForward, SIGNAL(triggered()), ui->logManager, SIGNAL(stepForward()));
    connect(ui->actionPlay, SIGNAL(triggered()), ui->logManager, SLOT(togglePaused()));
    connect(ui->actionBackward, SIGNAL(triggered()), ui->logManager, SLOT(previousFrame()));
    connect(ui->actionForward, SIGNAL(triggered()), ui->logManager, SLOT(nextFrame()));
    connect(ui->actionOpen_Plotter, SIGNAL(triggered()), SLOT(openPlotter()));
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
        // read bug, see below
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
    connect(ui->logManager, SIGNAL(gotStatus(Status)), SIGNAL(gotStatus(Status)));
    connect(ui->logManager, SIGNAL(gotPlayStatus(Status)), SIGNAL(gotPlayStatus(Status)));

    connect(this, SIGNAL(gotStatus(Status)), ui->field, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->visualization, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->timing, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->debugTree, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), m_refereeStatus, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), m_logOpener, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotPlayStatus(Status)), ui->log, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotPlayStatus(Status)), m_plotter, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), this, SLOT(handleStatus(Status)));

    connect(this, SIGNAL(gotBacklogData(QList<Status>)), m_plotter, SLOT(handleBacklogStatus(QList<Status>)));
    connect(this, SIGNAL(showPlotter()), m_plotter, SLOT(show()));

    connect(ui->replay, SIGNAL(setRegularVisualizationsEnabled(bool, bool)), ui->field, SLOT(setRegularVisualizationsEnabled(bool, bool)));
    connect(ui->replay, SIGNAL(sendResetDebugPacket(bool)), SLOT(sendResetDebugPacket(bool)));

    // restore configuration
    QSettings s;
    s.beginGroup("MainWindow");
    restoreGeometry(s.value("Geometry").toByteArray());
    restoreState(s.value("State").toByteArray());
    ui->splitter->restoreState(s.value("Splitter").toByteArray());
    s.endGroup();

    // set up log connections
    connect(this, SIGNAL(gotStatus(Status)), &m_logWriter, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotReplayStatus(Status)), &m_logWriter, SLOT(handleStatus(Status)));
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

    ui->field->setFocus();

    m_amun = new AmunClient(this);
    m_amun->start(true);


    // set up data distribution to and from strategy
    connect(m_amun, SIGNAL(gotStatus(Status)), ui->visualization, SLOT(handleStatus(Status)));
    connect(m_amun, SIGNAL(gotStatus(Status)), ui->debugTree, SLOT(handleStatus(Status)));
    connect(m_amun, SIGNAL(gotStatus(Status)), ui->log, SLOT(handleStatus(Status)));
    connect(m_amun, SIGNAL(gotStatus(Status)), ui->field, SLOT(handleStatus(Status)));
    connect(m_amun, SIGNAL(gotStatus(Status)), ui->replay, SIGNAL(gotStatus(Status)));
    connect(m_amun, SIGNAL(gotStatus(Status)), m_plotter, SLOT(handleStatus(Status)));
    connect(m_amun, SIGNAL(gotStatus(Status)), SLOT(handleReplayStatus(Status)));

    connect(ui->replay, SIGNAL(sendCommand(Command)), m_amun, SIGNAL(sendCommand(Command)));
    connect(this, SIGNAL(sendCommand(Command)), m_amun, SIGNAL(sendCommand(Command)));
    connect(this, SIGNAL(gotStatus(Status)), m_amun, SIGNAL(sendReplayStatus(Status)));

    // enable replay
    Command setReplayCommand(new amun::Command());
    setReplayCommand->mutable_replay()->set_enable(true);
    emit sendCommand(setReplayCommand);

    // if the other strategy isnt running, reset debug data for it to remove visualizations
    emit sendCommand(m_lastTeamInfo);
}

MainWindow::~MainWindow()
{
    delete ui;
}

void MainWindow::openPlotter()
{
    QList<Status> backlogPackets = m_logWriter.getBacklogStatus(Plot::bufferSize());
    emit showPlotter();
    emit gotBacklogData(backlogPackets);
}

void MainWindow::sendResetDebugPacket(bool blue)
{
    Status status(new amun::Status);
    status->set_time(m_playTimer->currentTime());
    amun::DebugValues * debug = status->add_debug();
    debug->set_source(blue ? amun::StrategyBlue : amun::StrategyYellow);
    emit gotStatus(status);
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

void MainWindow::handleReplayStatus(const Status &status)
{
    // adapt strategy replay time, since it may be smaller than times already written to the log
    // it will be filled in by m_logWriter
    status->clear_time();
    emit gotReplayStatus(status);
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

    m_logOpener->close();

    // make sure the plotter is closed along with the mainwindow
    // this also ensure that a closeEvent is triggered
    m_plotter->close();

    QMainWindow::closeEvent(e);
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

void MainWindow::openFile(const QString &filename)
{
    m_logOpener->openFile(filename);
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
