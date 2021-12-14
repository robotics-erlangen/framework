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


#include "seshat.h"
#include "timedstatussource.h"
#include "visionlogliveconverter.h"
#include "logfilereader.h"
#include "visionconverter.h"
#include "logfilefinder.h"

#include <QThread>
#include <QCoreApplication>
#include <QFileInfo>
#include <functional>

Seshat::Seshat(int backlogLength, QObject* parent) :
    QObject(parent),
    m_logger(false, backlogLength),
    m_replayLogger(true, backlogLength),
    m_logthread(new QThread)
{
    m_logthread->start();
    connect(&m_logger, &CombinedLogWriter::sendStatus, this, &Seshat::sendUi);
    connect(&m_replayLogger, &CombinedLogWriter::sendStatus, this, &Seshat::sendUi);
}

Seshat::~Seshat()
{
    m_logthread->quit();
    m_logthread->wait();
    delete m_logthread;
}

void Seshat::setStatusSource(std::shared_ptr<StatusSource> source)
{
    if (!m_statusSource  ||  !m_statusSource->manages(source)) {
        delete m_statusSource;
        m_statusSource = new TimedStatusSource(source, this);
        source->moveToThread(m_logthread);
        connect(m_statusSource, &TimedStatusSource::gotStatus, this, &Seshat::handleLogStatus);
        connect(m_statusSource, &TimedStatusSource::gotStatus, this, &Seshat::sendReplayStrategy);
        connect(m_statusSource, &TimedStatusSource::jumped, &m_replayLogger, &CombinedLogWriter::resetBacklog);
        m_statusSource->start();
        if (!m_isPlayback) {
            forceUi(false);
            sendSimulatorCommand();
            QCoreApplication::processEvents(QEventLoop::AllEvents | QEventLoop::WaitForMoreEvents, 50);
        }
        m_isPlayback = true;
        m_replayLogger.handleStatus(m_logger.getTeamStatus());
    }
    emit changeStatusSource();
}

void Seshat::handleLogStatus(const Status& status)
{
    if (!m_isTrackingReplay || !status->has_world_state()) {
        emit sendUi(status);
        m_replayLogger.handleStatus(status);
    }
}

void Seshat::sendSimulatorCommand()
{
    Command c{new amun::Command};
    auto * pause = c->mutable_pause_simulator();
    pause->set_pause(true);
    pause->set_reason(amun::Horus);
    emit simPauseCommand(c);
}

void Seshat::handleCheckHaltStatus(const Status &status)
{
    if (status->has_status_strategy() || status->debug_size() > 0) {
        // use 50 as some upper limit, the exact number is irrelevant
        if (m_horusStrategyBuffer.size() < 50) {
            m_horusStrategyBuffer.push_back(status);
        }
    }
    if (status->has_game_state()) {
        const amun::GameState &gameState = status->game_state();
        if (gameState.state() != amun::GameState::Halt) {
            m_statusSource->setPaused(true);
            forceUi(true);
        }
    }
}

void Seshat::forceUi(bool ra)
{
    Status s = Status::createArena();
    auto* response = s->mutable_pure_ui_response();
    response->set_force_ra_horus(ra); // horus mode
    emit sendUi(s);

    if (ra) {
        sendBufferedStatus();
    }
}

void Seshat::sendBufferedStatus()
{
    for (const Status &status : m_horusStrategyBuffer) {
        emit sendUi(status);
    }
    m_horusStrategyBuffer.clear();
}

// returns true iff a status should even be forwarded to the UI
// if the corresponding source (log) will not be shown right now
// is currently used to forward strategy status information
bool checkForwardImportance(const Status& status)
{
    return status->has_status_strategy(); // TODO: this is as buggy as the prev. implementation.
                                          // While the statusInformation can pass freely, the really necessary output
                                          // On amun.log can not be seen. Simply returning true if some debug info can be seen
                                          // is not a good idea as this will constantly mix real world data and replay stuff during HALT...

}

void Seshat::handleStatus(const Status& status)
{
    m_logger.handleStatus(status);
    if (m_isPlayback) {
        handleCheckHaltStatus(status);
    } else {
        emit sendUi(status);
    }
}

void Seshat::handleReplayStatus(const Status& status)
{
    m_replayLogger.handleStatus(status);
    if (m_isPlayback) {
        emit sendUi(status);
    } else if (checkForwardImportance(status)) {
        emit sendUi(status);
    }
}

void Seshat::handleCommand(const Command& command)
{
    m_logger.handleCommand(command);
    m_replayLogger.handleCommand(command);

    if (command->has_playback()) {
        const auto& playback = command->playback();
        if (playback.has_run_playback()) {
            bool newPlayback = playback.run_playback();
            if (newPlayback != m_isPlayback && m_statusSource) {
                if (!newPlayback) {
                    m_storedPlaybackPaused = m_statusSource->isPaused();
                    // stop the playback while Ra is displayed
                    m_statusSource->setPaused(true);
                    sendBufferedStatus();
                } else {
                    m_statusSource->setPaused(m_storedPlaybackPaused);
                }
            }
            m_isPlayback = newPlayback;
        }

        if (playback.has_log_path()) {
            openLogfile(playback.log_path());
        }

        if (playback.has_instant_replay()) {
            setStatusSource(m_logger.makeStatusSource());
            emit sendReplayStrategy(m_logger.getTeamStatus());
        }

        if (playback.has_export_vision_log()) {
            exportVisionLog(playback.export_vision_log());
        }

        if (playback.has_get_uid()) {
            handleUIDRequest();
        }

        if (playback.has_find_logfile()) {
            handleLogFindRequest(playback.find_logfile());
        }
    }

    if (m_isPlayback && m_statusSource) {
        m_statusSource->handleCommand(command);
    }

    if (command->has_tracking() && command->tracking().has_tracking_replay_enabled()) {
        m_isTrackingReplay = command->tracking().tracking_replay_enabled();
    }
}

void Seshat::exportVisionLog(const std::string& filename)
{
    QString error;
    if (!m_statusSource) {
        error = "No open logfile/backlog";
    } else {
        error = VisionExtractor::extractVision(*m_statusSource->getStatusSource(), QString::fromStdString(filename));
    }

    if (!error.isEmpty()) {
        Status status(new amun::Status);
        status->mutable_pure_ui_response()->set_export_visionlog_error(error.toStdString());
        emit sendUi(status);
    }
}

void Seshat::openLogfile(const logfile::LogRequest& logRequest)
{
    const std::string& filename = logRequest.path();
    QList<std::function<QPair<std::shared_ptr<StatusSource>, QString>(QString)>> openFunctions =
        {&VisionLogLiveConverter::tryOpen, &LogFileReader::tryOpen};
    for (const auto &openFunction : openFunctions) {
        auto openResult = openFunction(QString::fromStdString(filename));

        if (openResult.first != nullptr) {
            auto logfile = openResult.first;

            sendLogfileInfo(QFileInfo(QString::fromStdString(filename)).fileName().toStdString(), false);
            setStatusSource(logfile);

            return;

        } else if (!openResult.second.isEmpty()) {
            // the header matched, but the log file is corrupt
            sendLogfileInfo(("Error: " + openResult.second).toStdString(), true);
            return;
        }
    }
    sendLogfileInfo("Error: Could not open log file - no matching format found", true);
}

void Seshat::handleUIDRequest()
{
    Status s{new amun::Status};
    auto* pureUi = s->mutable_pure_ui_response();
    QString res;
    if (!m_statusSource) {
        res = "No open logfile/backlog";
    } else {
        res = m_statusSource->getStatusSource()->logUID();
    }
    pureUi->set_requested_log_uid(res.toStdString());
    emit sendUi(s);
}

void Seshat::handleLogFindRequest(const std::string& logHash)
{
    LogFileFinder finder;
    emit sendUi(finder.find(QString::fromStdString(logHash)));
}

void Seshat::sendLogfileInfo(const std::string& message, bool error)
{
    Status s = Status::createArena();
    auto* pureUi = s->mutable_pure_ui_response();
    auto* logOpen = pureUi->mutable_log_open();
    logOpen->set_success(!error);
    logOpen->set_filename(message);
    emit sendUi(s);
}
