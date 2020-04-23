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
#include "logfile/timedstatussource.h"

#include <QThread>
#include <QStyleOptionButton>

namespace LogManagerInternal {
    class SignalSource: public QObject {
        Q_OBJECT

    public:
        SignalSource(QObject* parent = nullptr) : QObject(parent) {}

    signals:
        void requestFrame(int time);
        void requestPrevFrame(int time);
        void requestPacket(int packet);
    };
}

using LogManagerInternal::SignalSource;


LogManager::LogManager(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::LogManager),
    m_signalSource(new SignalSource(this)),
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
    connect(ui->horizontalSlider, SIGNAL(valueChanged(int)), SLOT(seekFrame(int)));
    connect(ui->spinPacketCurrent, SIGNAL(valueChanged(int)), SLOT(seekPacket(int)));
    connect(ui->btnPlay, SIGNAL(clicked()), this, SIGNAL(togglePaused()));

    //connect other signals
    connect(this, SIGNAL(disableSkipping(bool)), ui->spinPacketCurrent, SLOT(setDisabled(bool)));
    connect(this, SIGNAL(disableSkipping(bool)), ui->horizontalSlider, SLOT(setDisabled(bool)));
    connect(ui->horizontalSlider, SIGNAL(sliderPressed()), SIGNAL(resetBacklog()));
    connect(ui->horizontalSlider, SIGNAL(sliderReleased()), SIGNAL(resetBacklog()));

    //actions
    connect(this, SIGNAL(setSpeed(int)), ui->spinSpeed, SLOT(setValue(int)));
    connect(this, SIGNAL(stepBackward()), ui->spinPacketCurrent, SLOT(stepDown()));
    connect(this, SIGNAL(stepForward()), ui->spinPacketCurrent, SLOT(stepUp()));
}

LogManager::~LogManager()
{
    delete ui;
}

void LogManager::setStatusSource(std::shared_ptr<StatusSource> source)
{
    ui->btnPlay->setEnabled(true);
    if (!m_statusSource  ||  !m_statusSource->manages(source)) {
        delete m_statusSource;
        m_statusSource = new TimedStatusSource(source, this);
        source->moveToThread(m_logthread);
        connect(ui->spinSpeed, SIGNAL(valueChanged(int)), m_statusSource, SLOT(handlePlaySpeed(int)));
        connect(m_signalSource, SIGNAL(requestFrame(int)), m_statusSource, SLOT(seekFrame(int)));
        connect(m_signalSource, SIGNAL(requestPacket(int)), m_statusSource, SLOT(seekPacket(int)));
        connect(m_signalSource, SIGNAL(requestPrevFrame(int)), m_statusSource, SLOT(seekFrameBackwards(int)));
        connect(m_statusSource, SIGNAL(gotStatus(Status)), this, SLOT(handleStatus(Status)));
        connect(this, SIGNAL(togglePaused()), m_statusSource, SLOT(togglePaused()));
        resetVariables();
        m_statusSource->start();
    }
}

void LogManager::handleStatus(const Status& status) {
    if(status->has_pure_ui_response()) {
        const amun::UiResponse& response = status->pure_ui_response();
        if (response.has_playback_burst_end() && response.playback_burst_end()) {
            Q_ASSERT(response.has_frame_number());
            // update horizontalSlider and spinPacketCurrent and drop this additional Status
            // update current position
            const int64_t timeCurrent = status->time();
            const qint64 position = timeCurrent - m_startTime;
            ui->lblTimeCurrent->setText(formatTime(position));

            // prevent sliders from seeking
            m_scroll = false;
            ui->spinPacketCurrent->setValue(response.frame_number());

            // don't do updates for the slider which would only cause subpixel movement
            // as that won't be visible but is very expensive to redraw
            m_exactSliderValue = position / 1E8;
            float sliderStep = std::max(1.f, (float)ui->horizontalSlider->maximum() / ui->horizontalSlider->width());
            const int sliderPixel = (int)(m_exactSliderValue / sliderStep);
            const int curSliderPixel = (int)(ui->horizontalSlider->value() / sliderStep);
            // compare whether the playback pos and the currently visible pos of the slider differ
            if (sliderPixel != curSliderPixel) {
                // move the slider to the current position
                ui->horizontalSlider->setValue(m_exactSliderValue);
            }
            m_scroll = true;
            return;
        }
        if (response.has_playback_paused()) {
            setPaused(response.playback_paused());
            return;
        }
        if (response.has_log_info()) {
            m_startTime = response.log_info().start_time();
            m_duration = response.log_info().duration();
            initializeLabels(response.log_info().packet_count());
            return;
        }
    }
    emit gotStatus(status);
}

void LogManager::goToEnd()
{
    seekPacket(getLastFrame());
}

int LogManager::getLastFrame()
{
    return ui->spinPacketCurrent->maximum();
}

void LogManager::previousFrame()
{
    int frame = ui->horizontalSlider->value();
    emit m_signalSource->requestPrevFrame(std::max(0, frame - 1));
}

void LogManager::nextFrame()
{
    ui->horizontalSlider->setValue(ui->horizontalSlider->value() + 1);
}

void LogManager::seekFrame(int frame)
{
    if (!m_scroll) { // don't trigger for updates of the horizontal slider
        return;
    }
    emit m_signalSource->requestFrame(frame);
}

void LogManager::seekPacket(int packet)
{
    if (!m_scroll) { // don't trigger for updates of spinPacketCurrent
        return;
    }

    emit m_signalSource->requestPacket(packet);
}

QString LogManager::formatTime(qint64 time) {
    // nanoseconds to mm:ss.MMMM time stamp (M = milliseconds)
    const double dtime = time * 1E-9;
    return QString("%1:%2.%3")
           .arg((int) dtime / 60)
           .arg((int) dtime % 60, 2, 10, QChar('0'))
           .arg((int) (dtime * 1000) % 1000, 3, 10, QChar('0'));
}

void LogManager::setPaused(bool p)
{
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

    if (p) {
        ui->btnPlay->setText(playText);
        ui->btnPlay->setIcon(QIcon::fromTheme("media-playback-start"));
        // move horizontal slider to its exact position
        m_scroll = false;
        ui->horizontalSlider->setValue(m_exactSliderValue);
        m_scroll = true;
    } else {
        ui->btnPlay->setText(pauseText);
        ui->btnPlay->setIcon(QIcon::fromTheme("media-playback-pause"));
    }
}

void LogManager::resetVariables()
{
    // delete index
    m_startTime = 0;
    m_duration = 0;
    m_exactSliderValue = 0;

    // pause playback
    setPaused(true);
}

void LogManager::initializeLabels(int64_t packetCount)
{
    m_scroll = false; // disable scrolling, can be triggered by maximum updates
    // play button if file is loaded
    ui->btnPlay->setEnabled(m_statusSource ? true : false);

    // set log information
    ui->spinPacketCurrent->setMinimum(0);
    ui->spinPacketCurrent->setMaximum(packetCount - 1);
    ui->lblPacketMax->setText(QString::number(packetCount - 1));
    ui->lblTimeMax->setText(formatTime(m_duration));
    ui->horizontalSlider->setMaximum(m_duration / 1E8);

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

uint LogManager::getFrame()
{
    return ui->spinPacketCurrent->value();
}

#include "logmanager.moc"
