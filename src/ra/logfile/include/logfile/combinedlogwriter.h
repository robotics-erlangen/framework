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

#ifndef COMBINEDLOGWRITER_H
#define COMBINEDLOGWRITER_H

#include "protobuf/robot.pb.h"
#include "protobuf/status.h"

#include <QString>
#include <QObject>
#include <QList>

class LogFileWriter;
class BacklogWriter;
class QThread;
class QDateTime;
class QLabel;
class StatusSource;
namespace CombinedLogWriterInternal {
    class SignalSource;
}

class CombinedLogWriter : public QObject
{
    Q_OBJECT
public:
    CombinedLogWriter(bool replay, int backlogLength);
    ~CombinedLogWriter();
    CombinedLogWriter(const CombinedLogWriter&) = delete;
    CombinedLogWriter& operator=(const CombinedLogWriter&) = delete;
    std::shared_ptr<StatusSource> makeStatusSource();
    void sendBacklogStatus(int lastNPackets);
    Status getTeamStatus();
    static QString dateTimeToString(const QDateTime & dt);

signals:
    void sendUiResponse(const amun::UiResponse& response, qint64 time);
    void sendStatus(const Status& s);
    void resetBacklog();

public slots:
    void handleStatus(const Status &status);
    void enableLogging(bool enable); // enables or disables both record and backlog
    void saveBackLog();
    void recordButtonToggled(bool enabled);
    void useLogfileLocation(bool enabled);

private:
    QString createLogFilename() const;
    void startLogfile();

private:
    enum class LogState {
        PENDING,
        LOGGING,
        BACKLOG
    } m_logState;
    const bool m_isReplay;
    bool m_useSettingLocation = false;
    BacklogWriter *m_backlogWriter;
    QThread *m_backlogThread;
    LogFileWriter *m_logFile;
    QThread *m_logFileThread;

    robot::Team m_yellowTeam;
    robot::Team m_blueTeam;
    QString m_yellowTeamName;
    QString m_blueTeamName;

    qint64 m_lastTime;

    bool m_isLoggingEnabled;

    CombinedLogWriterInternal::SignalSource *m_signalSource;
};

#endif // COMBINEDLOGWRITER_H
