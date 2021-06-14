/***************************************************************************
 *   Copyright 2020 Tobias Heineken                                        *
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

#ifndef AMUN_SESHAT_SESHAT_H
#define AMUN_SESHAT_SESHAT_H

#include <QObject>
#include "protobuf/status.h"
#include "protobuf/command.h"
#include "combinedlogwriter.h"

class TimedStatusSource;
class StatusSource;

class Seshat : public QObject {
    Q_OBJECT

public:
    Seshat(int backlogLength, QObject* parent = nullptr);
    ~Seshat();
    Seshat(const Seshat& other) = delete;
    Seshat& operator=(const Seshat& other) = delete;

signals:
    void sendUi(const Status& status);
    void sendReplayStrategy(const Status& status);
    void sendTrackingReplay(const Status& status);
    void simPauseCommand(const Command& command);
    void changeStatusSource();

public slots:
    void handleCommand(const Command& comm);
    void handleStatus(const Status& status);
    void handleReplayStatus(const Status& status);

private slots:
    void handleLogStatus(const Status& status);

private:
    void handleCheckHaltStatus(const Status &status);
    void setStatusSource(std::shared_ptr<StatusSource> source);
    void forceUi(bool ra);
    void openLogfile(const logfile::LogRequest& filename);
    void sendLogfileInfo(const std::string& message, bool success);
    void sendSimulatorCommand();
    void exportVisionLog(const std::string& filename);
    void handleUIDRequest();
    void handleLogFindRequest(const std::string& logHash);
    void sendBufferedStatus();

private:

    CombinedLogWriter m_logger, m_replayLogger;
    QThread *m_logthread;
    TimedStatusSource* m_statusSource = nullptr;
    bool m_isPlayback = false;
    bool m_storedPlaybackPaused = true;
    bool m_isTrackingReplay = false;
    QList<Status> m_horusStrategyBuffer;
};

#endif
