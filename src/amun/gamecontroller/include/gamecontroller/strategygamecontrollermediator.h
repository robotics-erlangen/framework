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

#pragma once

#include "gamecontrollerci.h"
#include "gamecontrollersocket.h"
#include "protobuf/ssl_gc/rcon/ssl_gc_rcon.pb.h"
#include "protobuf/ssl_gc/rcon/ssl_gc_rcon_autoref.pb.h"
#include <google/protobuf/message.h>
#include <QObject>
#include <QList>
#include <memory>
#include <optional>

class InternalGameController;

class StrategyGameControllerMediator : public QObject
{
    Q_OBJECT

public:
    StrategyGameControllerMediator(bool isAutoref);
    StrategyGameControllerMediator(InternalGameController *internalGameController, bool isAutoref);
    bool connectGameController();
    void closeConnection();
    bool receiveGameControllerMessage(google::protobuf::Message *type);
    bool sendGameControllerMessage(const google::protobuf::Message *message, const QString &messageType);

public slots:
    void handleRefereeHost(QString host);
    void switchInternalGameController(bool isInternal);

private slots:
    void handleInternalGCPortsUpdated(const GameControllerPorts &ports);

private:
    GameControllerSocket& getCurrentConnection() {
        return m_isAutoref && m_useInternalGameController
            ? m_internalGameControllerConnection : m_externalGameControllerConnection;
    }

private:
    bool m_useInternalGameController = true;
    bool m_isAutoref;
    /*! \brief Ports used for the internal game controller.
     *
     * Empty if the internal game controller has not yet told us about its
     * ports.
     */
    std::optional<GameControllerPorts> m_internalPorts;

    GameControllerSocket m_externalGameControllerConnection;
    // Currently only used for the Autoref
    GameControllerSocket m_internalGameControllerConnection;
};
