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
#include <QDragEnterEvent>
#include <QDragLeaveEvent>
#include <QDragMoveEvent>
#include <QDropEvent>
#include <QMimeData>
#include <QUrl>
#include "widgets/refereestatuswidget.h"
#include "logfile/logfilereader.h"
#include "plotter/plot.h"
#include "plotter/plotter.h"
#include "logcutter.h"
#include "strategy/strategy.h"
#include "strategy/strategyreplayhelper.h"

MainWindow::MainWindow(QWidget *parent) :
    QMainWindow(parent),
    ui(new Ui::MainWindow),
    m_lastTeamInfo(new amun::Command),
    m_lastTeamInfoUpdated(false),
    m_logWriter(true, 20),
    m_recentFilesMenu(nullptr)
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

    setAcceptDrops(true);
    connect(ui->field, SIGNAL(fileDropped(QString)), this, SLOT(openFile(QString)));

    // setup status bar
    m_refereeStatus = new RefereeStatusWidget;
    statusBar()->addPermanentWidget(m_refereeStatus);

    m_logfile = new LogFileReader();

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
    connect(this, SIGNAL(gotPlayStatus(Status)), ui->log, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotPlayStatus(Status)), m_plotter, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), this, SLOT(handleStatus(Status)));

    connect(this, SIGNAL(gotBacklogData(QList<Status>)), m_plotter, SLOT(handleBacklogStatus(QList<Status>)));
    connect(this, SIGNAL(showPlotter()), m_plotter, SLOT(show()));

    connect(ui->replay, SIGNAL(enableStrategyBlue(bool)), this, SLOT(enableStrategyBlue(bool)));
    connect(ui->replay, SIGNAL(enableStrategyYellow(bool)), this, SLOT(enableStrategyYellow(bool)));

    // restore configuration
    QSettings s;
    s.beginGroup("MainWindow");
    restoreGeometry(s.value("Geometry").toByteArray());
    restoreState(s.value("State").toByteArray());
    ui->splitter->restoreState(s.value("Splitter").toByteArray());
    s.endGroup();

    int recentFileCount = s.beginReadArray("recent files");
    for (int i = 0;i<recentFileCount;i++) {
        s.setArrayIndex(i);
        m_recentFiles.append(s.value("filename").toString());
    }
    s.endArray();

    // create strategy threads
    for (int i = 0;i<2;i++) {
        m_strategyThreads[i] = new QThread(this);
        m_strategyThreads[i]->start();
        m_strategys[i] = nullptr;
        m_strategyBlocker[i] = nullptr;
    }

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

    // connect buttons, ...
    connect(ui->btnOpen, SIGNAL(clicked()), SLOT(openFile()));

    makeRecentFileMenu();
}

MainWindow::~MainWindow()
{
    for (int i = 0; i < 2; i++) {
        if (m_strategys[i] != nullptr) {
            m_strategys[i]->deleteLater();
        }
        if (m_strategyBlocker[i] != nullptr) {
            m_strategyBlocker[i]->deleteLater();
        }
        m_strategyThreads[i]->quit();
        m_strategyThreads[i]->wait();
    }
    delete ui;
}

void MainWindow::makeRecentFileMenu()
{
    if (m_recentFiles.size() > 0) {
        QMenu *newMenu = new QMenu("Recent files", ui->menuFile);
        if (m_recentFilesMenu == nullptr) {
            m_recentFilesMenuAction = ui->menuFile->insertMenu(ui->actionLogCutter, newMenu);
            ui->menuFile->insertSeparator(ui->actionLogCutter);
        } else {
            // just remove the old one and create a new one
            m_recentFilesMenuAction = ui->menuFile->insertMenu(m_recentFilesMenuAction, newMenu);
            m_recentFilesMenu->deleteLater();
        }
        m_recentFilesMenu = newMenu;
        QSignalMapper *mapper = new QSignalMapper(newMenu);
        connect(mapper, SIGNAL(mapped(QString)), SLOT(openFile(QString)));
        for (int i = m_recentFiles.size()-1;i>=0;i--) {
            QFileInfo file(m_recentFiles[i]);
            QString fileName = file.fileName();
            QAction *fileAction = new QAction(fileName, newMenu);
            newMenu->addAction(fileAction);
            connect(fileAction, SIGNAL(triggered()), mapper, SLOT(map()));
            mapper->setMapping(fileAction, m_recentFiles[i]);
        }
    }
}

void MainWindow::openFile()
{
    QString previousDir;
    // open again in previously used folder
    if (m_logfile->isOpen()) {
        QFileInfo finfo(m_logfile->filename());
        previousDir = finfo.dir().path();
    }

    QString filename = QFileDialog::getOpenFileName(this, "Select log file", previousDir, "Log files (*.log)");
    openFile(filename);
}

void MainWindow::openFile(const QString &filename)
{
    // don't do anything if the user couldn't decide for a new log file
    if (!filename.isEmpty()) {
        if (m_logfile->open(filename)) {
            if (m_strategys[0] != nullptr) {
                m_strategys[0]->resetIsReplay();
            }
            if (m_strategys[1] != nullptr) {
                m_strategys[1]->resetIsReplay();
            }
            ui->logManager->setStatusSource(m_logfile);

            // move the file to the end of the recent files list
            m_recentFiles.removeAll(filename);
            m_recentFiles.append(filename);
            if (m_recentFiles.size() > MAX_RECENT_FILE_COUNT) {
                m_recentFiles.removeFirst();
            }
            makeRecentFileMenu();
        } else {
            QMessageBox::critical(this, "Error", m_logfile->errorMsg());
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
    m_strategyBlocker[index]->deleteLater();
    m_strategyBlocker[index] = nullptr;
    sendResetDebugPacket(index != 0);
    ui->field->setRegularVisualizationsEnabled(index != 0, true);
}

void MainWindow::createStrategy(int index)
{
    Q_ASSERT(m_strategys[index] == nullptr);
    ui->field->setRegularVisualizationsEnabled(index != 0, false);
    m_strategys[index] = new Strategy(m_playTimer, (index == 0) ? StrategyType::YELLOW : StrategyType::BLUE, nullptr,
                                      false, true);
    m_strategys[index]->moveToThread(m_strategyThreads[index]);
    m_strategyBlocker[index] = new BlockingStrategyReplay(m_strategys[index]);

    // set up data distribution to and from strategy
    connect(m_strategyBlocker[index], SIGNAL(gotStatus(Status)), ui->visualization, SLOT(handleStatus(Status)));
    connect(m_strategyBlocker[index], SIGNAL(gotStatus(Status)), ui->debugTree, SLOT(handleStatus(Status)));
    connect(m_strategyBlocker[index], SIGNAL(gotStatus(Status)), ui->log, SLOT(handleStatus(Status)));
    connect(m_strategyBlocker[index], SIGNAL(gotStatus(Status)), ui->field, SLOT(handleStatus(Status)));
    connect(m_strategyBlocker[index], SIGNAL(gotStatus(Status)), ui->replay, SIGNAL(gotStatus(Status)));
    connect(m_strategyBlocker[index], SIGNAL(gotStatus(Status)), m_plotter, SLOT(handleStatus(Status)));
    connect(m_strategyBlocker[index], SIGNAL(gotStatus(Status)), SLOT(handleReplayStatus(Status)));

    connect(ui->replay, SIGNAL(sendCommand(Command)), m_strategys[index], SLOT(handleCommand(Command)));
    connect(this, SIGNAL(sendCommand(Command)), m_strategys[index], SLOT(handleCommand(Command)));
    connect(this, SIGNAL(gotStatus(Status)), m_strategyBlocker[index], SLOT(handleStatus(Status)));
    connect(this, SIGNAL(reloadStrategy()), m_strategys[index], SLOT(reload()));

    // if the other strategy isnt running, reset debug data for it to remove visualizations
    emit sendCommand(m_lastTeamInfo);

    // create a status packet with empty debug to reset field debug visualizations
    if (m_strategys[index ^ 1] == nullptr) {
        sendResetDebugPacket(index == 0);
    }
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
    amun::DebugValues * debug = status->mutable_debug();
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

    s.beginWriteArray("recent files", m_recentFiles.size());
    for (int i = 0;i<m_recentFiles.size();i++) {
        s.setArrayIndex(i);
        s.setValue("filename", m_recentFiles.at(i));
    }
    s.endArray();

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

void MainWindow::dropEvent(QDropEvent *event)
{
    const QMimeData* mimeData = event->mimeData();

    if (mimeData->hasUrls()) {
        QList<QUrl> urlList = mimeData->urls();
        if (urlList.size() > 0) {
            openFile(urlList.at(0).toLocalFile());
            event->acceptProposedAction();
        }
    }
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

void MainWindow::selectFrame(int amm)
{
	int frame = std::max(0,std::min(amm, ui->logManager->getLastFrame()));
	ui->logManager->seekPacket(frame);
}
