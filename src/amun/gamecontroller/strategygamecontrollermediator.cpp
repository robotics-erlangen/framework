/***************************************************************************
 *   Copyright 2020 Andreas Wendler                                        *
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

#include <cstdint>

#include "strategygamecontrollermediator.h"
#include "core/sslprotocols.h"

static constexpr std::uint16_t getExternalPort(bool isAutoref) {
    return isAutoref ? SSL_AUTOREF_TO_GC_PORT : SSL_TEAM_TO_GC_PORT;
}

StrategyGameControllerMediator::StrategyGameControllerMediator(InternalGameController *internalGameController, bool isAutoref) :
    m_isAutoref(isAutoref),
    m_externalGameControllerConnection(getExternalPort(m_isAutoref), this)
{
    connect(this, &StrategyGameControllerMediator::gotMessageForInternalGameController, internalGameController, &InternalGameController::handleGameEvent);
    connect(internalGameController, &InternalGameController::gotControllerReply, this, &StrategyGameControllerMediator::handleInternalGameControllerReply);
}

StrategyGameControllerMediator::StrategyGameControllerMediator(bool isAutoref) :
    m_isAutoref(isAutoref),
    m_externalGameControllerConnection(getExternalPort(m_isAutoref), this)
{ }

void StrategyGameControllerMediator::handleInternalGameControllerReply(const gameController::ControllerReply &reply)
{
    m_internalGameControllerReplies.push_back(reply);
}

void StrategyGameControllerMediator::switchInternalGameController(bool isInternal)
{
    if (isInternal && !m_useInternalGameController) {
        closeConnection();
    }
    m_useInternalGameController = isInternal;
}

void StrategyGameControllerMediator::handleRefereeHost(QString host)
{
    m_externalGameControllerConnection.setRefereeHost(host);
}

bool StrategyGameControllerMediator::connectGameController()
{
    if (m_isAutoref && m_useInternalGameController) {
        return true;
    } else {
        return m_externalGameControllerConnection.connectGameController();
    }
}

void StrategyGameControllerMediator::closeConnection()
{
    m_internalGameControllerReplies.clear();
    m_externalGameControllerConnection.closeConnection();
}

bool StrategyGameControllerMediator::receiveGameControllerMessage(google::protobuf::Message *type)
{
    if (m_isAutoref && m_useInternalGameController) {
        if (m_internalGameControllerReplies.size() > 0) {
            type->CopyFrom(m_internalGameControllerReplies.front());
            m_internalGameControllerReplies.pop_front();
            return true;
        }
        return false;
    } else {
        return m_externalGameControllerConnection.receiveGameControllerMessage(type);
    }
}

bool StrategyGameControllerMediator::sendGameControllerMessage(const google::protobuf::Message *message, const QString &messageType)
{
    if (m_isAutoref && m_useInternalGameController) {
        // registration messages are not handled by the game controller
        if (messageType == "AutoRefRegistration") {
            gameController::ControllerReply reply;
            reply.set_status_code(gameController::ControllerReply::OK);
            m_internalGameControllerReplies.append(reply);
            return true;
        }
        std::shared_ptr<gameController::AutoRefToController> messageCopy(new gameController::AutoRefToController);
        messageCopy->CopyFrom(*static_cast<const gameController::AutoRefToController*>(message));
        emit gotMessageForInternalGameController(messageCopy);
        return true;
    } else {
        return m_externalGameControllerConnection.sendGameControllerMessage(message);
    }
}
