#include "combinedlogwriter.h"
#include "backlogwriter.h"
#include "logfilewriter.h"

#include <QThread>
#include <QDateTime>

CombinedLogWriter::CombinedLogWriter(bool replay, int backlogLength) :
    m_isReplay(replay),
    m_logFile(NULL),
    m_logFileThread(NULL),
    m_logStartTime(0),
    m_isLoggingEnabled(true),
    m_isRecording(false)
{
    // start backlog writer thread
    m_backlogThread = new QThread();
    m_backlogThread->start();
    m_backlogWriter = new BacklogWriter(backlogLength);
    m_backlogWriter->moveToThread(m_backlogThread);

    connect(m_backlogWriter, SIGNAL(enableBacklogSave(bool)), this, SLOT(enableLogging(bool)));
    connect(this, SIGNAL(gotStatusForBacklog(Status)), m_backlogWriter, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(saveBacklogFile(QString,Status)), m_backlogWriter, SLOT(saveBacklog(QString,Status)));
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

    if (m_logStartTime != 0) {
        qint64 timeDelta = m_lastTime - m_logStartTime;
        const double dtime = timeDelta / 1E9;
        QString logLabel = "Log time: " + QString("%1:%2").arg((int) dtime / 60)
                .arg((int) dtime % 60, 2, 10, QChar('0'));
        if (m_lastLogTimeLabel != logLabel) {
            m_lastLogTimeLabel = logLabel;
            emit changeLogTimeLabel(logLabel);
        }
    }

    if (m_isLoggingEnabled) {
        if (m_isRecording) {
            emit gotStatusForRecording(status);
        } else {
            emit gotStatusForBacklog(status);
        }
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
    emit enableRecordButton(enable);
    emit enableBacklogButton(enable);
}

void CombinedLogWriter::backLogButtonClicked()
{
    const QString filename = createLogFilename();

    Status status(new amun::Status);
    status->mutable_team_yellow()->CopyFrom(m_yellowTeam);
    status->mutable_team_blue()->CopyFrom(m_blueTeam);

    emit saveBacklogFile(filename, status);
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

QString CombinedLogWriter::createLogFilename() const
{
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
        return QString("replay%1.log").arg(date);
    } else {
        return QString("%1%2.log").arg(date).arg(teamnames);
    }
}

void CombinedLogWriter::recordButtonToggled(bool enabled)
{
    emit enableBacklogButton(!enabled);
    emit disableSkipping(enabled);
    m_isRecording = enabled;
    if (enabled) {
        Q_ASSERT(!m_logFile);

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

        // add the current team settings to the logfile
        Status status(new amun::Status);
        status->set_time(m_lastTime);
        status->mutable_team_yellow()->CopyFrom(m_yellowTeam);
        status->mutable_team_blue()->CopyFrom(m_blueTeam);
        m_logFile->writeStatus(status);
        m_logStartTime = m_lastTime;
        emit showLogTimeLabel(true);
    } else {
        // defer log file deletion to happen in its thread
        m_logFile->deleteLater();
        m_logFile = NULL;
        m_logStartTime = 0;
        emit changeLogTimeLabel("");
        emit showLogTimeLabel(false);
    }
}
