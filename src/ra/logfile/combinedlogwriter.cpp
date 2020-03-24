/***************************************************************************
 *   Copyright 2020 Michael Eischer, Andreas Wendler                       *
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

#include "combinedlogwriter.h"
#include "backlogwriter.h"
#include "logfilewriter.h"
#include "statussource.h"

#include <QThread>
#include <QDateTime>
#include <QSettings>

CombinedLogWriter::CombinedLogWriter(bool replay, int backlogLength) :
    m_logState(LogState::BACKLOG),
    m_isReplay(replay),
    m_logFile(NULL),
    m_logFileThread(NULL),
    m_lastTime(0),
    m_isLoggingEnabled(true)
{
    // start backlog writer thread
    m_backlogThread = new QThread();
    m_backlogThread->setObjectName("Seshat Backlog");
    m_backlogThread->start();
    m_backlogWriter = new BacklogWriter(backlogLength);
    m_backlogWriter->moveToThread(m_backlogThread);

    connect(m_backlogWriter, SIGNAL(enableBacklogSave(bool)), this, SLOT(enableLogging(bool)));
    connect(this, SIGNAL(gotStatusForBacklog(Status)), m_backlogWriter, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(saveBacklogFile(QString,Status,bool)), m_backlogWriter, SLOT(saveBacklog(QString,Status,bool)));
    connect(this, SIGNAL(resetBacklog()), m_backlogWriter, SLOT(clear()));
}

CombinedLogWriter::~CombinedLogWriter()
{
    if (m_logFileThread) {
        m_logFileThread->quit();
        m_logFileThread->wait();
        delete m_logFileThread;
    }
    delete m_logFile;
    m_backlogThread->quit();
    m_backlogThread->wait();
    delete m_backlogThread;
    delete m_backlogWriter;
}

QList<Status> CombinedLogWriter::getBacklogStatus(int lastNPackets)
{
    if (m_logState != LogState::BACKLOG) {
        return QList<Status>();
    }
    // source is located in another thread, but when no signals/slots are used this is fine
    std::shared_ptr<StatusSource> source = m_backlogWriter->makeStatusSource();
    QList<Status> packets;
    packets.reserve(source->packetCount());
    for (int i = std::max(0, source->packetCount() - lastNPackets);i<source->packetCount();i++) {
        packets.append(source->readStatus(i));
    }
    return packets;
}

std::shared_ptr<StatusSource> CombinedLogWriter::makeStatusSource()
{
    if (m_logState == LogState::LOGGING) {
        return m_logFile->makeStatusSource();
    } else { // While PENDING we use the (soon to be outdated) backlog source as m_logFile will still be the nullptr
        return m_backlogWriter->makeStatusSource();
    }
}

void CombinedLogWriter::handleStatus(const Status &status)
{
    if (!status->has_time()) {
        status->set_time(m_lastTime);
    }

    // keep team configurations for the logfile
    if (status->has_team_yellow()) {
        m_yellowTeam.CopyFrom(status->team_yellow());
    }
    if (status->has_team_blue()) {
        m_blueTeam.CopyFrom(status->team_blue());
    }

    // keep team names for the logfile
    if (status->has_game_state()) {
        const amun::GameState &state = status->game_state();
        const SSL_Referee_TeamInfo &teamBlue = state.blue();
        m_blueTeamName = QString::fromStdString(teamBlue.name());

        const SSL_Referee_TeamInfo &teamYellow = state.yellow();
        m_yellowTeamName = QString::fromStdString(teamYellow.name());
    }

    m_lastTime = status->time();

    amun::UiResponse response;
    if (m_logState == LogState::PENDING) {
        startLogfile();
        response.set_is_logging(true);
    }
    emit sendUiResponse(response, m_lastTime);

    if (m_isLoggingEnabled && m_logState == LogState::LOGGING) {
        emit gotStatusForRecording(status);
    }
    if (m_logState == LogState::BACKLOG) {
        emit gotStatusForBacklog(status);
    }
}

void CombinedLogWriter::enableLogging(bool enable)
{
    if (!enable) {
        emit setRecordButton(false);
        if (m_isLoggingEnabled) {
            recordButtonToggled(false);
        }
    }
    m_isLoggingEnabled = enable;
    amun::UiResponse response;
    response.set_enable_logging(enable);
    emit sendUiResponse(response, m_lastTime);
}

void CombinedLogWriter::saveBackLog()
{
    const QString filename = createLogFilename();

    Status status(new amun::Status);
    status->mutable_team_yellow()->CopyFrom(m_yellowTeam);
    status->mutable_team_blue()->CopyFrom(m_blueTeam);

    emit saveBacklogFile(filename, status, true);
}

QString CombinedLogWriter::dateTimeToString(const QDateTime & dt)
{
    const int utcOffset = dt.secsTo(QDateTime(dt.date(), dt.time(), Qt::UTC));

    int sign = utcOffset >= 0 ? 1: -1;
    const QString date = dt.toString(Qt::ISODate) + QString::fromLatin1("%1%2%3")
            .arg(sign == 1 ? QLatin1Char('+') : QLatin1Char('-'))
            .arg(utcOffset * sign / (60 * 60), 2, 10, QLatin1Char('0'))
            .arg((utcOffset / 60) % 60, 2, 10, QLatin1Char('0'));
    return date;
}

void CombinedLogWriter::useLogfileLocation(bool enabled)
{
    m_useSettingLocation = enabled;
}


QString CombinedLogWriter::createLogFilename() const
{
    QSettings s;
    s.beginGroup("LogLocation");
    QString path(".");
    if (m_useSettingLocation) {
        int size = s.beginReadArray("locations");
        if (size > 0) {
            s.setArrayIndex(0);
            path = s.value("path").toString();
        }
        s.endArray();
        s.endGroup();
    }
    QString teamnames;
    if (!m_yellowTeamName.isEmpty() && !m_blueTeamName.isEmpty()) {
        teamnames = QString("%1 vs %2").arg(m_yellowTeamName).arg(m_blueTeamName);
    } else if (!m_yellowTeamName.isEmpty()) {
        teamnames = m_yellowTeamName;
    } else  if (!m_blueTeamName.isEmpty()) {
        teamnames = m_blueTeamName;
    }

    const QString date = dateTimeToString(QDateTime::currentDateTime()).replace(":", "");
    if (m_isReplay) {
        return path+"/"+QString("replay%1.log").arg(date);
    } else {
        return path+"/"+QString("%1%2.log").arg(date).arg(teamnames);
    }
}

Status CombinedLogWriter::getTeamStatus()
{
    Status status(new amun::Status);
    status->set_time(m_lastTime);
    status->mutable_team_yellow()->CopyFrom(m_yellowTeam);
    status->mutable_team_blue()->CopyFrom(m_blueTeam);
    return status;
}

void CombinedLogWriter::startLogfile()
{
    m_logFile->writeStatus(getTeamStatus());
    m_logState = LogState::LOGGING;
}

void CombinedLogWriter::recordButtonToggled(bool enabled)
{
    if (enabled) {
        Q_ASSERT(!m_logFile);
        emit resetBacklog();

        const QString filename = createLogFilename();

        // create log file and forward status
        m_logFile = new LogFileWriter();
        if (!m_logFile->open(filename)) {
            emit setRecordButton(false);
            delete m_logFile;
            return;
        }
        connect(this, SIGNAL(gotStatusForRecording(Status)), m_logFile, SLOT(writeStatus(Status)));

        // create thread if not done yet and move to seperate thread
        if (m_logFileThread == NULL) {
            m_logFileThread = new QThread();
            m_logFileThread->start();
        }
        m_logFile->moveToThread(m_logFileThread);
        m_logState = LogState::PENDING;
    } else {
        // defer log file deletion to happen in its thread
        if (m_logFile != nullptr) {
            m_logFile->deleteLater();
            m_logFile = nullptr;
        }
        amun::UiResponse response;
        response.set_is_logging(false);
        emit sendUiResponse(response, m_lastTime);
        m_logState = LogState::BACKLOG;
    }
}
