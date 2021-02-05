/***************************************************************************
 *   Copyright 2021 Andreas Wendler                                        *
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

#pragma once

#include <QObject>
#include <QProcess>
#include <memory>

#include "gamecontrollerconnection.h"
#include "protobuf/status.h"

class Timer;
class SSLVisionTracked;

class SSLGameController : public QObject
{
    Q_OBJECT
public:
    SSLGameController(const Timer *timer, QObject *parent);
    ~SSLGameController();

    void start();

private:
    void connectToGC();

signals:
    void sendStatus(const Status &status);
    void gotPacketForReferee(const QByteArray &data);

public slots:
    void handleStatus(const Status &status);
    void handleCommand(const amun::CommandReferee &refereeCommand);

private slots:
    void handleGCStdout();
    void gcFinished(int exitCode, QProcess::ExitStatus exitStatus);

private:
    const Timer *m_timer;
    QProcess *m_gcProcess = nullptr;
    ExternalGameController m_gcCIProtocolConnection;
    std::unique_ptr<SSLVisionTracked> m_trackedVisionGenerator;
};
