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

#ifndef GAMECONTROLLERCONNECTION_H
#define GAMECONTROLLERCONNECTION_H

#include "externalgamecontroller.h"
#include "sslgamecontroller.h"
#include "protobuf/ssl_game_controller_common.pb.h"
#include "protobuf/ssl_game_controller_auto_ref.pb.h"
#include <google/protobuf/message.h>
#include <QObject>
#include <QList>
#include <memory>

class GameControllerConnection : public QObject
{
    Q_OBJECT

public:
    GameControllerConnection(bool isAutoref);
    GameControllerConnection(SSLGameController *internalGameController, bool isAutoref);
    bool connectGameController();
    void closeConnection();
    bool receiveGameControllerMessage(google::protobuf::Message *type);
    bool sendGameControllerMessage(const google::protobuf::Message *message, const QString &messageType);

public slots:
    void handleRefereeHost(QString host);
    void switchInternalGameController(bool isInternal);

signals:
    void gotMessageForInternalGameController(std::shared_ptr<gameController::AutoRefToController> message);

private slots:
    void handleInternalGameControllerReply(const gameController::ControllerReply &reply);

private:
    bool m_useInternalGameController = true;
    bool m_isAutoref;

    QList<gameController::ControllerReply> m_internalGameControllerReplies;
    ExternalGameController m_externalGameControllerConnection;
};

#endif // GAMECONTROLLERCONNECTION_H
