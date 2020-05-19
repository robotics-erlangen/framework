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
#include "logfile/timedstatussource.h"

#include <QThread>

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
            Status s = Status::createArena();
            auto* response = s->mutable_pure_ui_response();
            response->set_force_ra_horus(false); // horus mode
            emit sendUi(s);
        }
        m_isPlayback = true;
    } // TODO: watch over non-halt realworld status and switch back
}

#include "seshat.moc"
