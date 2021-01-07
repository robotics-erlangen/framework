/***************************************************************************
 *   Copyright 2020 Tobias Heineken, Andreas Wendler                       *
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

#include "timedstatussource.h"

TimedStatusSource::TimedStatusSource(std::shared_ptr<StatusSource> source, QObject* parent) :
    QObject(parent),
    m_statusSource(source)
{
    // invalidate play timer
    m_nextPacket = -1;
    m_spoolCounter = 0;
    // No limit when the TimedStatusSource is created
    m_lastPacket = -1;

    // setup the timer used to trigger playing the next packets
    connect(&m_timer, SIGNAL(timeout()), SLOT(playNext()));
    m_timer.setSingleShot(true);

   connect(&m_statusSource, SIGNAL(gotNewData()), this, SLOT(handleNewData()));
}

void TimedStatusSource::start()
{
    // pause playback
    setPaused(true);

   indexLogFile();
}

void TimedStatusSource::handleCommand(const Command& command)
{
    if (!command->has_playback()) {
        return;
    }
    const amun::CommandPlayback& playback = command->playback();
    if (playback.has_seek_time()) {
        seekFrame(playback.seek_time());
    }
    else if (playback.has_seek_packet()) {
        seekPacket(playback.seek_packet());
    }
    else if (playback.has_seek_time_backwards()) {
        seekFrameBackwards(playback.seek_time_backwards());
    }
    if (playback.has_playback_speed()) {
        handlePlaySpeed(playback.playback_speed());
    }
    if (playback.has_toggle_paused()) {
        togglePaused();
    }
    if (playback.has_playback_limit()) {
        m_lastPacket = playback.playback_limit();
    }

}

void TimedStatusSource::indexLogFile()
{
    const QList<qint64> &timings = m_statusSource.getStatusSource()->timings();
    // create frame index for the scroll bar
    qint64 startTime;
    qint64 duration;
    if (!timings.isEmpty()) {
        startTime = timings.first();
        duration = timings.last() - startTime;
    } else {
        startTime = 0;
        duration = 0;
    }
    qint64 seekTime = 0;
    for (int i = 0; i < timings.size(); ++i) {
        // time indexing is done with 0.1s precision
        const qint64 curTime = (timings.value(i) - startTime) / 1E8;
        while (seekTime <= curTime) {
            // index of the belonging packet
            m_frames.append(i);
            seekTime++;
        }
    }
    // send startTime and duration to Ra.
    Status s = Status::createArena();
    amun::LogPlaybackInfo *logInfo = s->mutable_pure_ui_response()->mutable_log_info();
    logInfo->set_duration(duration);
    logInfo->set_start_time(startTime);
    logInfo->set_packet_count(m_statusSource.getStatusSource()->packetCount());
    emit gotStatus(s);
    // load first frame
    seekPacket(0);
}

void TimedStatusSource::seekFrame(int time)
{
    // seek to packet associated with the given frame
    seekPacket(m_frames.value(time));
}

void TimedStatusSource::seekFrameBackwards(int time)
{
    int prevPacket = m_frames.value(time);
    while (prevPacket >= m_nextPacket - 1 && time > 0) {
        time--;
        prevPacket = m_frames.value(time);
    }
    seekPacket(prevPacket);
}

void TimedStatusSource::seekPacket(int packet)
{
    // do not start the (imprecise) process of jumping to the packet if we can simply spool ahead a little instead
    bool canSpool = packet >= m_nextPacket && packet <= m_nextPacket + m_statusSource.requestedBufferSize();
    if (canSpool) {
        m_spoolCounter = packet - m_nextPacket;
        return;
    }
    emit jumped();

    // read a few packets before the new one to have a complete up-to-date status
    int preloadCount =  10;
    const int preloadPacket = std::max(0, packet - preloadCount + 1);
    preloadCount = packet - preloadPacket + 1; // allow playback of the first frames


    // fast forward unwanted packets and the preload
    m_spoolCounter = preloadCount; // playback without time checks

    m_statusSource.requestPackets(preloadPacket, preloadCount); // load the required packets
}

void TimedStatusSource::handlePlaySpeed(int speed)
{
    // update buffer size
    m_statusSource.updateBufferSize(speed);
    // update scaling
    m_playTimer.setScaling(speed / 100.);
    if (!m_paused) {
        // trigger the timer to account for the changed playback speed
        m_timer.start(0);
    }
}

void TimedStatusSource::handleNewData()
{
    // trigger playing if the buffer ran empty and we should play or after seeking
    if (!m_timer.isActive() && (!m_paused || m_spoolCounter > 0)) {
        // reading can't keep up with the play timer, thus reset it to prevent hickups
        m_nextPacket = -1;
        m_timer.start(0);
    }
}

void TimedStatusSource::togglePaused()
{
    setPaused(!m_paused);
}

void TimedStatusSource::setPaused(bool paused)
{
    m_paused = paused;
    // pause if playback has reached the end
    if (m_nextPacket == m_statusSource.getStatusSource()->packetCount()) {
        m_paused = true;
    }
    if (m_paused) {
        m_timer.stop();
    } else {
        // the play timer has to be reset after a pause to match the timings again
        m_nextPacket = -1; // trigger play timer reset
        m_timer.start(0);
    }
    Status s = Status::createArena();
    s->mutable_pure_ui_response()->set_playback_paused(m_paused);
    emit gotStatus(s);
}

void TimedStatusSource::playNext()
{
    const double scaling = m_playTimer.scaling();
    qint64 timeCurrent = 0;
    bool hasChanged = false;
    while (m_statusSource.hasData()) {
        // peek next packet
        QPair<int, Status> p = m_statusSource.peek();
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

            hasChanged = true;

            emit gotStatus(status);

            timeCurrent = packetTime;
        }

        m_nextPacket = currentPacket + 1;
        if (m_spoolCounter > 0) { // passthrough a certain amount of packets
            m_spoolCounter--;
        }
        // remove from queue
        m_statusSource.pop();

        // stop after last packet
        if (m_nextPacket == m_statusSource.getStatusSource()->packetCount()) {
            setPaused(true);
        }
        // break if the current frame should have been the last one
        if (m_spoolCounter == 0 && currentPacket == m_lastPacket) {
            setPaused(true);
            break;
        }
    }
    // only update sliders if something changed and only once
    // spooled packets are ignored as these weren't explicitly requested by the user
    if (hasChanged && m_spoolCounter == 0) {
        Status s = Status::createArena();
        s->set_time(timeCurrent);
        s->mutable_pure_ui_response()->set_playback_burst_end(true);
        s->mutable_pure_ui_response()->set_frame_number(m_nextPacket - 1);
        emit gotStatus(s);
    }

    if (!m_paused) {
        m_statusSource.checkBuffer();
    }
}
