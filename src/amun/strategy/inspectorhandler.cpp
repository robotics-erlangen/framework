/***************************************************************************
 *   Copyright 2018 Andreas Wendler                                        *
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

#include "inspectorhandler.h"
#include "websocketprotocol.h"
#include "typescript.h"

InspectorHandler::InspectorHandler(Typescript *strategy, std::shared_ptr<QTcpSocket> &socket, QObject *parent) :
    QObject(parent),
    m_socket(socket),
    m_strategy(strategy),
    m_shouldResetHolder(false)
{
    m_socket->setParent(this);
    connect(socket.get(), SIGNAL(readyRead()), this, SLOT(readData()));
}

InspectorHandler::~InspectorHandler()
{
    if (m_shouldResetHolder) {
        m_strategy->removeInspectorHandler();
    }
}

void InspectorHandler::readData()
{
    QByteArray data = m_socket->readAll();

    std::vector<char> buffer(data.begin(), data.end());
    do {
        int bytes_consumed = 0;
        std::vector<char> output;
        bool compressed = false;

        ws_decode_result r =  decode_frame_hybi17(buffer, true, &bytes_consumed, &output, &compressed);
        if (compressed || r == FRAME_ERROR || r == FRAME_CLOSE) {
            // errors are handled by closing the connection

            // cant be removed here since we might still be in the message loop
            m_shouldResetHolder = true;
            quitMessageLoopOnPause();
            bytes_consumed = 0;
            m_socket->readAll(); // just clear everything so that this function is not called anymore
            deleteLater();
            break;
        } else if (r == FRAME_OK) {
            dispatchProtocolMessage((uint8_t*)output.data(), output.size());
        }
        buffer.erase(buffer.begin(), buffer.begin() + bytes_consumed);
    } while (buffer.size() > 0);
}

void InspectorHandler::startMessageLoopOnPause()
{
    m_strategy->disableTimeoutOnce();
    sendPauseSimulator(true);
}

void InspectorHandler::endMessageLoopOnPause()
{
    if (m_shouldResetHolder) {
        emit frontendDisconnected();
    }
    sendPauseSimulator(false);
}

void InspectorHandler::messageLoop()
{
    m_socket->waitForReadyRead();
    readData();
}

void InspectorHandler::inspectorResponse(QString content)
{
    QByteArray byteContent = content.toUtf8();
    std::vector<char> data(byteContent.begin(), byteContent.end());
    std::vector<char> toSend = encode_frame_hybi17(data);
    m_socket->write(toSend.data(), toSend.size());
    m_socket->flush();
}

void InspectorHandler::inspectorNotification(QString content)
{
    QByteArray byteContent = content.toUtf8();
    std::vector<char> data(byteContent.begin(), byteContent.end());
    std::vector<char> toSend = encode_frame_hybi17(data);
    m_socket->write(toSend.data(), toSend.size());
    m_socket->flush();
}

void InspectorHandler::inspectorFlush()
{
    m_socket->flush();
}

void InspectorHandler::sendPauseSimulator(bool pause)
{
    Command command(new amun::Command);
    amun::PauseSimulatorReason reason = amun::DebugBlueStrategy;
    switch (m_strategy->getStrategyType()) {
    case StrategyType::BLUE:
        reason = amun::DebugBlueStrategy;
        break;
    case StrategyType::YELLOW:
        reason = amun::DebugYellowStrategy;
        break;
    case StrategyType::AUTOREF:
        reason = amun::DebugAutoref;
        break;
    }
    command->mutable_pause_simulator()->set_reason(reason);
    command->mutable_pause_simulator()->set_pause(pause);
    m_strategy->sendCommand(command);
}
