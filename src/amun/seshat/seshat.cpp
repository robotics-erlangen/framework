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

#include <QThread>
#include <QFileInfo>
#include <functional>

namespace SeshatInternal {
    class SignalSource: public QObject {
        Q_OBJECT

    public:
        SignalSource(QObject* parent = nullptr) : QObject(parent) {}

    signals:
        void gotStatusForRecording(const Status &status);
        void gotStatusForReplayRecording(const Status &status);
        void sendCommand(const Command &command);
    };
}

using SeshatInternal::SignalSource;

Seshat::Seshat(int backlogLen, QObject* parent) :
    QObject(parent),
    m_logger(false, backlogLen),
    m_replayLogger(true, backlogLen),
    m_logthread(new QThread),
    m_signalSource(new SignalSource(this))
{
    connect(m_signalSource, &SignalSource::gotStatusForRecording, &m_logger, &CombinedLogWriter::handleStatus);
    connect(m_signalSource, &SignalSource::gotStatusForReplayRecording, &m_replayLogger, &CombinedLogWriter::handleStatus);
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
        connect(m_signalSource, &SignalSource::sendCommand, m_statusSource, &TimedStatusSource::handleCommand);
        connect(m_statusSource, &TimedStatusSource::gotStatus, this, &Seshat::sendUi);
        connect(m_statusSource, &TimedStatusSource::gotStatus, this, &Seshat::sendReplayStrategy);
        connect(m_statusSource, &TimedStatusSource::gotStatus, &m_replayLogger, &CombinedLogWriter::handleStatus);
        connect(m_statusSource, &TimedStatusSource::jumped, &m_replayLogger, &CombinedLogWriter::resetBacklog);
        m_statusSource->start();
        if (!m_isPlayback) {
            forceUi(false);
        }
        m_isPlayback = true;
    }
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
    if (ra) {
        for (const Status &status : m_horusStrategyBuffer) {
            emit sendUi(status);
        }
        m_horusStrategyBuffer.clear();
    }
    Status s = Status::createArena();
    auto* response = s->mutable_pure_ui_response();
    response->set_force_ra_horus(ra); // horus mode
    emit sendUi(s);
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
        const auto& playback =  command->playback();
        if (playback.has_run_playback()) {
            bool newPlayback = playback.run_playback();
            if (newPlayback != m_isPlayback && m_statusSource) {
                if (!newPlayback) {
                    m_storedPlaybackPaused = m_statusSource->isPaused();
                    // stop the playback while Ra is displayed
                    m_statusSource->setPaused(true);
                } else {
                    m_statusSource->setPaused(m_storedPlaybackPaused);
                }
            }
            m_isPlayback = newPlayback;
        }

        if (playback.has_log_path()) {
            openLogfile(playback.log_path());
        }
    }

    if (m_isPlayback && m_statusSource) {
        m_statusSource->handleCommand(command);
    }
}

void Seshat::openLogfile(const std::string& filename)
{
    QList<std::function<QPair<std::shared_ptr<StatusSource>, QString>(QString)>> openFunctions =
        {&VisionLogLiveConverter::tryOpen, &LogFileReader::tryOpen};
    for (auto openFunction : openFunctions) {
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

void Seshat::sendLogfileInfo(const std::string& message, bool error)
{
    Status s = Status::createArena();
    auto* pureUi = s->mutable_pure_ui_response();
    auto* logOpen = pureUi->mutable_log_open();
    logOpen->set_success(error);
    logOpen->set_filename(message);
    emit sendUi(s);
}

#include "seshat.moc"
