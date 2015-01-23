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
#include <QFileDialog>
#include <QMessageBox>
#include <QSettings>
#include <QThread>
#include <QSignalMapper>
#include "../ra/refereestatuswidget.h"
#include "../ra/logfile/logfilereader.h"
#include "../ra/plotter/plotter.h"

MainWindow::MainWindow(QWidget *parent) :
    QMainWindow(parent),
    ui(new Ui::MainWindow),
    m_scroll(true)
{
    qRegisterMetaType<Status>("Status");

#if (QT_VERSION < QT_VERSION_CHECK(5, 1, 0))
    setWindowIcon(QIcon("icon:logplayer.svg"));
#endif
    ui->setupUi(this);

    // create log reader and the belonging thread
    m_logthread = new QThread();
    m_logthread->start();

    m_logreader = new LogFileReader();
    m_logreader->moveToThread(m_logthread);
    connect(m_logreader, SIGNAL(gotStatus(int,Status)), this, SLOT(addStatus(int,Status)));
    connect(this, SIGNAL(triggerRead(int,int)), m_logreader, SLOT(readPackets(int,int)));

    m_plotter = new Plotter();

    // setup icons
    ui->btnOpen->setIcon(QIcon::fromTheme("document-open"));
    closeFile(); // reset internals
    initializeLabels(); // disables play button

    // setup status bar
    m_refereeStatus = new RefereeStatusWidget;
    statusBar()->addPermanentWidget(m_refereeStatus);

    // setup visualization parts of the ui
    connect(ui->visualization, SIGNAL(itemsChanged(QStringList)), ui->field, SLOT(visualizationsChanged(QStringList)));
    ui->visualization->load();

    // add shortcuts
    connect(ui->actionOpen_Logfile, SIGNAL(triggered()), ui->btnOpen, SLOT(click()));
    connect(ui->actionExit, SIGNAL(triggered()), qApp, SLOT(quit()));
    connect(ui->actionStepBackward, SIGNAL(triggered()), ui->spinPacketCurrent, SLOT(stepDown()));
    connect(ui->actionStepForward, SIGNAL(triggered()), ui->spinPacketCurrent, SLOT(stepUp()));
    connect(ui->actionPlay, SIGNAL(triggered()), ui->btnPlay, SLOT(click()));
    connect(ui->actionBackward, SIGNAL(triggered()), SLOT(previousFrame()));
    connect(ui->actionForward, SIGNAL(triggered()), SLOT(nextFrame()));
    connect(ui->actionOpen_Plotter, SIGNAL(triggered()), m_plotter, SLOT(show()));

    // playback speed shortcuts
    QSignalMapper *mapper = new QSignalMapper(this);
    connect(mapper, SIGNAL(mapped(int)), ui->spinSpeed, SLOT(setValue(int)));
    QAction *speedActions[] = { ui->actionSpeed1, ui->actionSpeed5, ui->actionSpeed10, ui->actionSpeed20,
                              ui->actionSpeed50, ui->actionSpeed100, ui->actionSpeed200, ui->actionSpeed1000 };
    int playSpeeds[] = { 1, 5, 10, 20, 50, 100, 200, 1000 };
    for (uint i = 0; i < sizeof(speedActions) / sizeof(speedActions[0]); ++i) {
        QAction *action = speedActions[i];
        connect(action, SIGNAL(triggered()), mapper, SLOT(map()));
        mapper->setMapping(action, playSpeeds[i]);
    }

    // probable qt bug: the actions don't work, if they are added to a global menu (mac / ubuntu),
    // unless they are added again. Qt ensures that the actions aren't triggered twice
    addAction(ui->actionStepBackward);
    addAction(ui->actionStepForward);
    addAction(ui->actionPlay);
    addAction(ui->actionBackward);
    addAction(ui->actionForward);

    addAction(ui->actionSpeed1);
    addAction(ui->actionSpeed5);
    addAction(ui->actionSpeed10);
    addAction(ui->actionSpeed20);
    addAction(ui->actionSpeed50);
    addAction(ui->actionSpeed100);
    addAction(ui->actionSpeed200);
    addAction(ui->actionSpeed1000);

    // connect buttons, ...
    connect(ui->btnOpen, SIGNAL(clicked()), SLOT(openFile()));
    connect(ui->btnPlay, SIGNAL(clicked()), SLOT(togglePaused()));
    connect(ui->horizontalSlider, SIGNAL(valueChanged(int)), SLOT(seekFrame(int)));
    connect(ui->spinPacketCurrent, SIGNAL(valueChanged(int)), SLOT(seekPacket(int)));
    connect(ui->spinSpeed, SIGNAL(valueChanged(int)), SLOT(handlePlaySpeed(int)));

    // setup data distribution
    connect(this, SIGNAL(gotStatus(Status)), ui->field, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->visualization, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->timing, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->debugTree, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), m_refereeStatus, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotPlayStatus(Status)), ui->log, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotPlayStatus(Status)), m_plotter, SLOT(handleStatus(Status)));

    // setup the timer used to trigger playing the next packets
    connect(&m_timer, SIGNAL(timeout()), SLOT(playNext()));
    m_timer.setSingleShot(true);

    // restore configuration
    QSettings s;
    s.beginGroup("MainWindow");
    restoreGeometry(s.value("Geometry").toByteArray());
    restoreState(s.value("State").toByteArray());
    ui->splitter->restoreState(s.value("Splitter").toByteArray());
    s.endGroup();
}

MainWindow::~MainWindow()
{
    delete m_logreader;
    delete ui;
}

void MainWindow::closeEvent(QCloseEvent *e)
{
    setPaused(true);

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

void MainWindow::openFile()
{
    QString previousDir;
    // open again in previously used folder
    if (m_logreader->isOpen()) {
        QFileInfo finfo(m_logreader->filename());
        previousDir = finfo.dir().path();
    }

    QString filename = QFileDialog::getOpenFileName(this, "Select log file", previousDir);
    openFile(filename);
}

void MainWindow::openFile(QString filename)
{
    // don't do anything if the user couldn't decide for a new log file
    if (!filename.isEmpty()) {
        closeFile(); // cleanup
        if (m_logreader->open(filename)) {
            // get start time and duration
            const QList<qint64> &timings = m_logreader->timings();
            if (!timings.isEmpty()) {
                m_startTime = timings.first();
                m_duration = timings.last() - m_startTime;
            } else {
                m_startTime = 0;
                m_duration = 0;
            }

            // create frame index for the scroll bar
            qint64 seekTime = 0;
            for (int i = 0; i < timings.size(); ++i) {
                // time indexing is done with 0.1s precision
                const qint64 curTime = (timings.value(i) - m_startTime) / 1E8;
                while (seekTime <= curTime) {
                    // index of the belonging packet
                    m_frames.append(i);
                    seekTime++;
                }
            }

            // load first frame
            seekPacket(0);
        } else {
            QMessageBox::critical(this, "Error", m_logreader->errorMsg());
            m_logreader->close();
        }

        initializeLabels();
    }
}

void MainWindow::closeFile()
{
    // close log
    m_logreader->close();

    // delete index
    m_frames.clear();
    m_startTime = 0;
    m_duration = 0;
    m_exactSliderValue = 0;

    // clear buffer and invalidate play timer
    m_nextPackets.clear();
    m_nextPacket = -1;
    m_nextRequestPacket = 0;
    m_preloadedPackets = 0;
    m_spoolCounter = 0;
    m_playEnd = -1;

    // pause playback
    setPaused(true);

    ui->debugTree->clearData();
    ui->field->clearData();
    clearPlayConsumers();
}

void MainWindow::clearPlayConsumers()
{
    // the log just displays messages of a continuously played timespan
    ui->log->clear();
    m_plotter->clearData();
}

void MainWindow::initializeLabels()
{
    m_scroll = false; // disable scrolling, can be triggered by maximum updates
    // play button if file is loaded
    ui->btnPlay->setEnabled(m_logreader->isOpen());

    // set log information
    ui->spinPacketCurrent->setMinimum(0);
    ui->spinPacketCurrent->setMaximum(m_logreader->packetCount() - 1);
    ui->lblPacketMax->setText(QString::number(m_logreader->packetCount() - 1));
    ui->lblTimeMax->setText(formatTime(m_duration));
    ui->horizontalSlider->setMaximum(m_frames.size() - 1);

    ui->lblTimeCurrent->setText(formatTime(m_duration)); // approximatelly max length
    // prevent unneccessary relayouts
    // no relayouting is done, if min and max sizes are equal
    const QSize lblSize = ui->lblTimeCurrent->sizeHint();
    ui->lblTimeCurrent->setMinimumSize(lblSize);
    ui->lblTimeCurrent->setMaximumSize(lblSize);
    // reset
    ui->lblTimeCurrent->setText(formatTime(0));
    m_scroll = true;
}

void MainWindow::previousFrame()
{
    ui->horizontalSlider->setValue(ui->horizontalSlider->value() - 1);
}

void MainWindow::nextFrame()
{
    ui->horizontalSlider->setValue(ui->horizontalSlider->value() + 1);
}

void MainWindow::seekFrame(int frame)
{
    // seek to packet associated with the given frame
    seekPacket(m_frames.value(frame));
}

void MainWindow::seekPacket(int packet)
{
    if (!m_scroll) { // don't trigger for updates of the horizontal slider
        return;
    }

    // read a few packets before the new one to have a complete up-to-date status
    // except if we just move to the next packet
    int preloadCount = (packet == m_nextRequestPacket) ? 1 : 10;
    const int preloadPacket = std::max(0, packet - preloadCount + 1);
    preloadCount = packet - preloadPacket + 1; // allow playback of the first frames

    // fast forward unwanted packets and the preload
    m_spoolCounter += preloadCount + m_preloadedPackets; // playback without time checks
    m_preloadedPackets = 0; // the preloaded frames for normal playback are skipped
    m_nextRequestPacket = packet + 1;

    emit triggerRead(preloadPacket, preloadCount); // load the required packets
}

void MainWindow::addStatus(int packet, const Status &status)
{
    // trigger playing if the buffer ran empty and we should play or after seeking
    if (!m_timer.isActive() && (!m_paused || m_spoolCounter > 0)) {
        // reading can't keep up with the play timer, thus reset it to prevent hickups
        m_nextPacket = -1;
        m_timer.start(0);
    }
    m_nextPackets.enqueue(qMakePair(packet, status));
}

void MainWindow::playNext()
{
    const double scaling = m_playTimer.scaling();
    qint64 timeCurrent = 0;
    bool hasChanged = false;
    while (!m_nextPackets.isEmpty()) {
        // peek next packet
        QPair<int, Status> p = m_nextPackets.head();
        int currentPacket = p.first;
        const Status status = p.second;

        // ignore empty status
        if (!status.isNull()) {
            qint64 packetTime = status->time();
            // reset the timer if the current packet wasn't expected
            if (currentPacket != m_nextPacket) {
                // the timer has to run with the intended playback speed
                m_playTimer.setTime(packetTime, scaling);
            }
            const qint64 elapsedTime = m_playTimer.currentTime();
            // break if the frame shouldn't be played yet
            if (packetTime > elapsedTime && m_spoolCounter == 0) {
                // only restart the timer if the log should be played
                if (!m_paused && scaling > 0) {
                    const qint64 timeDiff = packetTime - elapsedTime;
                    // limit interval to at least 1 ms, to prevent flooding with timer events
                    m_timer.start(qMax(timeDiff * 1E-6 / scaling, 1.));
                }
                break;
            }

            emit gotStatus(status);
            if (m_spoolCounter == 0) {
                emit gotPlayStatus(status);
            }
            timeCurrent = packetTime;
        }

        m_nextPacket = currentPacket + 1;
        if (m_spoolCounter > 0) { // passthrough a certain amount of packets
            m_spoolCounter--;
        } else if (m_preloadedPackets > 0) {
            // precached frames for normal playback, tracking is required for accurate seeking
            m_preloadedPackets--;
        }
        // remove from queue
        m_nextPackets.dequeue();
        hasChanged = true;

        // stop after last packet
        if (m_nextPacket == m_logreader->packetCount()) {
            setPaused(true);
        }
    }

    // only update sliders if something changed and only once
    if (hasChanged) {
        // update current position
        const double position = timeCurrent - m_startTime;
        ui->lblTimeCurrent->setText(formatTime(position));

        // prevent sliders from seeking
        m_scroll = false;
        ui->spinPacketCurrent->setValue(m_nextPacket - 1);

        // don't do updates for the slider which would only cause subpixel movement
        // as that won't be visible but is very expensive to redraw
        m_exactSliderValue = position / 1E8;
        float sliderStep = std::max(1, m_frames.size() / ui->horizontalSlider->width());
        const int sliderPixel = (int)(m_exactSliderValue / sliderStep);
        const int curSliderPixel = (int)(ui->horizontalSlider->value() / sliderStep);
        // compare whether the playback pos and the currently visible pos of the slider differ
        if (sliderPixel != curSliderPixel) {
            // move the slider to the current position
            ui->horizontalSlider->setValue(m_exactSliderValue);
        }
        m_scroll = true;
    }

    // if the buffer starts to become empty, request further packets
    // but only if these should be played and we didn't reach the end yet
    if (!m_paused && m_nextPackets.size() < 30 && m_preloadedPackets < 40 && m_nextRequestPacket < m_logreader->packetCount()) {
        // request up to 20 new packets
        int lastRequest = m_nextRequestPacket;
        m_nextRequestPacket = std::min(m_nextRequestPacket + 20, m_logreader->packetCount());
        // track requested packet count
        int packetCount = m_nextRequestPacket - lastRequest;
        m_preloadedPackets += packetCount;
        emit triggerRead(lastRequest, packetCount);
    }
}

void MainWindow::togglePaused()
{
    setPaused(!m_paused);
}

void MainWindow::setPaused(bool p)
{
    m_paused = p;
    // pause if playback has reached the end
    if (m_nextPacket == m_logreader->packetCount()) {
        m_paused = true;
    }

    if (m_paused) {
        ui->btnPlay->setIcon(QIcon::fromTheme("media-playback-start"));
        m_timer.stop();
        // move horizontal slider to its exact position
        m_scroll = false;
        ui->horizontalSlider->setValue(m_exactSliderValue);
        m_scroll = true;
        m_playEnd = ui->spinPacketCurrent->value();
    } else {
        ui->btnPlay->setIcon(QIcon::fromTheme("media-playback-pause"));
        // the play timer has to be reset after a pause to match the timings again
        m_nextPacket = -1; // trigger play timer reset
        m_timer.start(0);

        // clear if any seeking was done
        if (ui->spinPacketCurrent->value() != m_playEnd) {
            clearPlayConsumers();
        }
    }
}

void MainWindow::handlePlaySpeed(int value)
{
    // update scaling
    m_playTimer.setScaling(value / 100.);
    if (!m_paused) {
        // trigger the timer to account for the changed playback speed
        m_timer.start(0);
    }
}
