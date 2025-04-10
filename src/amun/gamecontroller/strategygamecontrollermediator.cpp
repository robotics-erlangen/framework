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
#include "internalgamecontroller.h"

static constexpr std::uint16_t getExternalPort(bool isAutoref) {
    return isAutoref ? SSL_AUTOREF_TO_GC_PORT : SSL_TEAM_TO_GC_PORT;
}

StrategyGameControllerMediator::StrategyGameControllerMediator(InternalGameController *internalGameController, bool isAutoref) :
    m_isAutoref(isAutoref),
    m_externalGameControllerConnection(getExternalPort(isAutoref), this),
    m_internalGameControllerConnection(-1, this)
{
    connect(internalGameController, &InternalGameController::internalGCPortsUpdated, this, &StrategyGameControllerMediator::handleInternalGCPortsUpdated);

    // Has to be a numeric IP (not "localhost")
    m_internalGameControllerConnection.setRefereeHost("127.0.0.1");
}

StrategyGameControllerMediator::StrategyGameControllerMediator(bool isAutoref) :
    m_isAutoref(isAutoref),
    m_externalGameControllerConnection(getExternalPort(isAutoref), this),
    m_internalGameControllerConnection(-1, this)
{ }

void StrategyGameControllerMediator::switchInternalGameController(bool isInternal)
{
    if (isInternal != m_useInternalGameController) {
        // TODO Check if this is necessary - the line has just always been
        // there
        closeConnection();
    }
    if (!isInternal) {
        // Reset the internal ports, so in case the internal game controller is
        // reactivated, we don't accidentally reuse the old ports - the new
        // internal game controller may have chosen a different set
        m_internalPorts.reset();
    }

    m_useInternalGameController = isInternal;
}

void StrategyGameControllerMediator::handleInternalGCPortsUpdated(const GameControllerPorts &ports)
{
    m_internalPorts = ports;

    if (m_useInternalGameController) {
        // Unlikely that this is relevant often (i.e. already being connected
        // to the internal game controller but now changing the port), but
        // still robust to catch this.
        m_internalGameControllerConnection.closeConnection();
    }

    m_internalGameControllerConnection.setPort(m_isAutoref ? ports.autoref : ports.team);
}

void StrategyGameControllerMediator::handleExternalRefereeHost(QString host)
{
    m_externalGameControllerConnection.setRefereeHost(host);
}

bool StrategyGameControllerMediator::connectGameController()
{
    if (m_useInternalGameController && !m_internalPorts) {
        return false;
    }
    return getCurrentConnection().connectGameController();
}

void StrategyGameControllerMediator::closeConnection()
{
    m_internalGameControllerConnection.closeConnection();
    m_externalGameControllerConnection.closeConnection();
}

bool StrategyGameControllerMediator::receiveGameControllerMessage(google::protobuf::Message *type)
{
    if (m_useInternalGameController && !m_internalPorts) {
        return false;
    }
    return getCurrentConnection().receiveGameControllerMessage(type);
}

bool StrategyGameControllerMediator::sendGameControllerMessage(const google::protobuf::Message *message, const QString &messageType)
{
    if (m_useInternalGameController && !m_internalPorts) {
        return false;
    }
    return getCurrentConnection().sendGameControllerMessage(message);
}
