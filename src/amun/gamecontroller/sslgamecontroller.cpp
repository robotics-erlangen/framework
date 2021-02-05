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

#include "sslgamecontroller.h"
#include "sslvisiontracked.h"
#include "core/timer.h"
#include "protobuf/ssl_gc_ci.pb.h"

#include <QDebug>
#include <QRegularExpression>
#include <QFile>

SSLGameController::SSLGameController(const Timer *timer, QObject *parent) :
    QObject(parent),
    m_timer(timer),
    m_gcCIProtocolConnection(10009, this)
{
    m_gcCIProtocolConnection.setRefereeHost("127.0.0.1");
    start();
}

SSLGameController::~SSLGameController()
{
    if (m_gcProcess) {
        m_gcCIProtocolConnection.closeConnection();
        m_gcProcess->close();
        m_gcProcess = nullptr;
    }
}

void SSLGameController::handleGCStdout()
{
    Status status(new amun::Status);
    auto debug = status->add_debug();
    debug->set_source(amun::DebugSource::GameController);
    while (m_gcProcess->canReadLine()) {
        QByteArray line = m_gcProcess->readLine();
        // Remove log dates of the form 2021/01/10 10:00:10
        QString simplified = QString(line).replace(QRegularExpression("[0-9]+/[0-9]+/[0-9]+ [0-9]+:[0-9]+:[0-9]+ "), "");
        auto log = debug->add_log();
        log->set_timestamp(m_timer->currentTime());
        log->set_text(simplified.toStdString());

        if (simplified.contains("UI is available at")) {
            connectToGC();
        }
    }
    emit sendStatus(status);
}

void SSLGameController::connectToGC()
{
    m_gcCIProtocolConnection.connectGameController();
}

void SSLGameController::handleStatus(const Status &status)
{
    if (!m_trackedVisionGenerator) {
        return;
    }
    // TODO: restart the game controller when the geometry changes
    if (status->has_world_state()) {
        gameController::CiInput ciInput;
        ciInput.set_timestamp(status->world_state().time());
        m_trackedVisionGenerator->createTrackedFrame(status->world_state(), ciInput.mutable_tracker_packet());

        if (m_gcCIProtocolConnection.sendGameControllerMessage(&ciInput)) {
            gameController::CiOutput ciOutput;
            if (!m_gcCIProtocolConnection.receiveGameControllerMessage(&ciOutput)) {
                return;
            }

            if (!ciOutput.has_referee_msg()) {
                return;
            }

            const SSL_Referee referee = ciOutput.referee_msg();

            QByteArray packetData;
            packetData.resize(referee.ByteSize());
            if (referee.SerializeToArray(packetData.data(), packetData.size())) {
                emit gotPacketForReferee(packetData);
            }
        }
    }
}

void SSLGameController::handleCommand(const amun::CommandReferee &refereeCommand)
{
    if (refereeCommand.has_command()) {
//        const std::string &c = refereeCommand.command();
//        handleGuiCommand(QByteArray(c.data(), c.size()));
    }
}

void SSLGameController::gcFinished(int exitCode, QProcess::ExitStatus exitStatus)
{
    // TODO: report the game controller crashing
}

void SSLGameController::start()
{
    if (!m_trackedVisionGenerator) {
        m_trackedVisionGenerator.reset(new SSLVisionTracked());
    }

    QString gameControllerExecutable(GAMECONTROLLER_EXECUTABLE_LOCATION);

    // the downloaded game controller file is not executable at first (relevant for linux and mac only)
    QFile::setPermissions(gameControllerExecutable, QFileDevice::ExeUser);

    QStringList arguments;
    arguments << "-timeAcquisitionMode" << "ci";

    // TODO: copy/modify config file with different ports and geometry

    m_gcProcess = new QProcess(this);
    m_gcProcess->setReadChannel(QProcess::StandardOutput);
    m_gcProcess->setProcessChannelMode(QProcess::MergedChannels);

    connect(m_gcProcess, &QProcess::readyReadStandardOutput, this, &SSLGameController::handleGCStdout);
    connect(m_gcProcess, QOverload<int, QProcess::ExitStatus>::of(&QProcess::finished), this, &SSLGameController::gcFinished);

    m_gcProcess->start(gameControllerExecutable, arguments, QIODevice::ReadOnly);
}
