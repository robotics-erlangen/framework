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

/*! \brief Multiplexes a RCON connection to the game controller.
 *
 * This class can connect to both an external and an internal game controller.
 * Users (e.g. the Strategies or the Autoref) can send and receive RCON
 * messages to either without having to know which one is currently active.
 */
class StrategyGameControllerMediator : public QObject
{
    Q_OBJECT

public:
    /*! \brief Constructor without internal game controller.
     *
     * Since no internal game controller is provided, this instance can only
     * connect to an external game controller.
     */
    StrategyGameControllerMediator(bool isAutoref);

    /*! \brief Constructor with internal game controller.
     *
     * This instance can connect to an external game controller and also
     * communicate with the internal game controller.
     */
    StrategyGameControllerMediator(InternalGameController *internalGameController, bool isAutoref);

    bool connectGameController();

    /*! \brief Close the connection to both game controllers. */
    void closeConnection();
    bool receiveGameControllerMessage(google::protobuf::Message *type);
    bool sendGameControllerMessage(const google::protobuf::Message *message, const QString &messageType);

public slots:
    /*! \brief Switch over to a new host for the external game controller. */
    void handleExternalRefereeHost(QString host);

    /*! \brief Enable or disable usage of the internal game controller. */
    void switchInternalGameController(bool isInternal);

private slots:
    void handleInternalGCPortsUpdated(const GameControllerPorts &ports);

private:
    GameControllerSocket& getCurrentConnection() {
        return m_useInternalGameController
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
    GameControllerSocket m_internalGameControllerConnection;
};
