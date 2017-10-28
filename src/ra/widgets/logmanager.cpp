/***************************************************************************
 *   Copyright 2017 Andreas Wendler                                        *
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

#include "logmanager.h"
#include "ui_logmanager.h"

#include <QThread>

LogManager::LogManager(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::LogManager),
    m_statusSource(),
    m_scroll(true)
{
    ui->setupUi(this);

    // create log reader and the belonging thread
    m_logthread = new QThread();
    m_logthread->start();

    resetVariables(); // reset internals
    initializeLabels(); // disables play button

    // disable button to prevent resizing errors
    ui->btnPlay->setEnabled(false);

    //connect buttons
    connect(ui->btnPlay, SIGNAL(clicked()), SLOT(togglePaused()));
    connect(ui->horizontalSlider, SIGNAL(valueChanged(int)), SLOT(seekFrame(int)));
    connect(ui->spinPacketCurrent, SIGNAL(valueChanged(int)), SLOT(seekPacket(int)));
    connect(ui->spinSpeed, SIGNAL(valueChanged(int)), SLOT(handlePlaySpeed(int)));

    //connect other signals
    connect(this, SIGNAL(disableSkipping(bool)), ui->spinPacketCurrent, SLOT(setDisabled(bool)));
    connect(this, SIGNAL(disableSkipping(bool)), ui->horizontalSlider, SLOT(setDisabled(bool)));
    connect(ui->horizontalSlider, SIGNAL(sliderPressed()), SIGNAL(resetBacklog()));
    connect(ui->horizontalSlider, SIGNAL(sliderReleased()), SIGNAL(resetBacklog()));

    //actions
    connect(this, SIGNAL(setSpeed(int)), ui->spinSpeed, SLOT(setValue(int)));
    connect(this, SIGNAL(stepBackward()), ui->spinPacketCurrent, SLOT(stepDown()));
    connect(this, SIGNAL(stepForward()), ui->spinPacketCurrent, SLOT(stepUp()));

    // setup the timer used to trigger playing the next packets
    connect(&m_timer, SIGNAL(timeout()), SLOT(playNext()));
    m_timer.setSingleShot(true);
}

LogManager::~LogManager()
{
    delete ui;
    delete m_statusSource;
}

void LogManager::setMinimalMode()
{
    ui->lblPacketMax->hide();
    ui->lblTimeCurrent->hide();
    ui->lblTimeMax->hide();
    ui->spinPacketCurrent->hide();
}

void LogManager::setStatusSource(StatusSource * source)
{
    if (source != m_statusSource) {
        delete m_statusSource;
        m_statusSource = source;
        m_statusSource->moveToThread(m_logthread);
        connect(m_statusSource, SIGNAL(gotStatus(int,Status)), this, SLOT(addStatus(int,Status)));
        connect(this, SIGNAL(triggerRead(int,int)), m_statusSource, SLOT(readPackets(int,int)));
    }
    resetVariables();
    indexLogFile();
}

void LogManager::gotToEnd()
{
    seekPacket(m_frames.back());
}

void LogManager::previousFrame()
{
    int frame = ui->horizontalSlider->value();
    int prevPacket = m_frames.value(std::max(0, frame - 1));

    while (prevPacket >= ui->spinPacketCurrent->value() && frame > 0) {
        frame--;
        prevPacket = m_frames.value(std::max(0, frame - 1));
    }
    seekPacket(prevPacket);
}

void LogManager::nextFrame()
{
    ui->horizontalSlider->setValue(ui->horizontalSlider->value() + 1);
}

void LogManager::seekFrame(int frame)
{
    // seek to packet associated with the given frame
    seekPacket(m_frames.value(frame));
}

void LogManager::seekPacket(int packet)
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

void LogManager::addStatus(int packet, const Status &status)
{
    // trigger playing if the buffer ran empty and we should play or after seeking
    if (!m_timer.isActive() && (!m_paused || m_spoolCounter > 0)) {
        // reading can't keep up with the play timer, thus reset it to prevent hickups
        m_nextPacket = -1;
        m_timer.start(0);
    }
    m_nextPackets.enqueue(qMakePair(packet, status));
}

void LogManager::playNext()
{
    const double scaling = m_playTimer.scaling();
    qint64 timeCurrent = 0;
    bool hasChanged = false;
    while (!m_nextPackets.isEmpty()) {
        // peek next packet
        QPair<int, Status> p = m_nextPackets.head();
        int currentPacket = p.first;
        Status status = p.second;

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
        if (m_nextPacket == m_statusSource->packetCount()) {
            setPaused(true);
        }
    }

    // only update sliders if something changed and only once
    // spooled packets are ignored as these weren't explicitly requested by the user
    if (hasChanged && m_spoolCounter == 0) {
        // update current position
        const double position = timeCurrent - m_startTime;
        ui->lblTimeCurrent->setText(formatTime(position));

        // prevent sliders from seeking
        m_scroll = false;
        ui->spinPacketCurrent->setValue(m_nextPacket - 1);

        // don't do updates for the slider which would only cause subpixel movement
        // as that won't be visible but is very expensive to redraw
        m_exactSliderValue = position / 1E8;
        float sliderStep = std::max(1.f, (float)m_frames.size() / ui->horizontalSlider->width());
        const int sliderPixel = (int)(m_exactSliderValue / sliderStep);
        const int curSliderPixel = (int)(ui->horizontalSlider->value() / sliderStep);
        // compare whether the playback pos and the currently visible pos of the slider differ
        if (sliderPixel != curSliderPixel) {
            // move the slider to the current position
            ui->horizontalSlider->setValue(m_exactSliderValue);
        }
        m_scroll = true;
    }

    // about 500 status per second, prefetch 0.1 seconds
    int bufferLimit = 50 * qMax(1., scaling);
    // if the buffer starts to become empty, request further packets
    // but only if these should be played and we didn't reach the end yet
    if (!m_paused && m_preloadedPackets < bufferLimit && m_nextRequestPacket < m_statusSource->packetCount()) {
        int lastRequest = m_nextRequestPacket;
        m_nextRequestPacket = std::min(m_nextRequestPacket + bufferLimit/5, m_statusSource->packetCount());
        // track requested packet count
        int packetCount = m_nextRequestPacket - lastRequest;
        m_preloadedPackets += packetCount;
        emit triggerRead(lastRequest, packetCount);
    }
}

QString LogManager::formatTime(qint64 time) {
    // nanoseconds to mm:ss.MMMM time stamp (M = milliseconds)
    const double dtime = time / 1E9;
    return QString("%1:%2.%3")
           .arg((int) dtime / 60)
           .arg((int) dtime % 60, 2, 10, QChar('0'))
           .arg((int) (dtime * 1000) % 1000, 3, 10, QChar('0'));
}

void LogManager::togglePaused()
{
    setPaused(!m_paused);
}

void LogManager::setPaused(bool p)
{
    m_paused = p;
    // pause if playback has reached the end
    if (m_statusSource != nullptr && m_nextPacket == m_statusSource->packetCount()) {
        m_paused = true;
    }

    bool hasIcon = !QIcon::fromTheme("media-playback-start").isNull();
    const QString playText("Play");
    const QString pauseText("Pause");
    // Ensure that the button has a fixed size
    if (!hasIcon && ui->btnPlay->isEnabled()) {
        auto playSize = ui->btnPlay->fontMetrics().size(Qt::TextShowMnemonic, playText);
        auto pauseSize = ui->btnPlay->fontMetrics().size(Qt::TextShowMnemonic, pauseText);
        QStyleOptionButton opt;
        opt.initFrom(ui->btnPlay);
        opt.rect.setSize(playSize);
        auto playRealSize = ui->btnPlay->style()->sizeFromContents(QStyle::CT_ToolButton, &opt, playSize);
        opt.rect.setSize(pauseSize);
        auto pauseRealSize = ui->btnPlay->style()->sizeFromContents(QStyle::CT_ToolButton, &opt, pauseSize);
        ui->btnPlay->setFixedSize(playRealSize.expandedTo(pauseRealSize));
    }

    if (m_paused) {
        ui->btnPlay->setText(playText);
        ui->btnPlay->setIcon(QIcon::fromTheme("media-playback-start"));
        m_timer.stop();
        // move horizontal slider to its exact position
        m_scroll = false;
        ui->horizontalSlider->setValue(m_exactSliderValue);
        m_scroll = true;
        m_playEnd = ui->spinPacketCurrent->value();
    } else {
        ui->btnPlay->setText(pauseText);
        ui->btnPlay->setIcon(QIcon::fromTheme("media-playback-pause"));
        // the play timer has to be reset after a pause to match the timings again
        m_nextPacket = -1; // trigger play timer reset
        m_timer.start(0);

        // clear if any seeking was done
        if (ui->spinPacketCurrent->value() != m_playEnd) {
            emit clearPlayConsumers();
        }
    }
}

void LogManager::handlePlaySpeed(int value)
{
    // update scaling
    m_playTimer.setScaling(value / 100.);
    if (!m_paused) {
        // trigger the timer to account for the changed playback speed
        m_timer.start(0);
    }
}

void LogManager::indexLogFile()
{
    // get start time and duration
    const QList<qint64> &timings = m_statusSource->timings();
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
    initializeLabels();
}

void LogManager::resetVariables()
{
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
    emit clearAll();
    emit clearPlayConsumers();
}

void LogManager::initializeLabels()
{
    m_scroll = false; // disable scrolling, can be triggered by maximum updates
    // play button if file is loaded
    ui->btnPlay->setEnabled(m_statusSource ? m_statusSource->isOpen() : false);

    // set log information
    ui->spinPacketCurrent->setMinimum(0);
    ui->spinPacketCurrent->setMaximum(m_statusSource ? m_statusSource->packetCount() - 1 : -1);
    ui->lblPacketMax->setText(QString::number(m_statusSource ? m_statusSource->packetCount() - 1 : -1));
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
