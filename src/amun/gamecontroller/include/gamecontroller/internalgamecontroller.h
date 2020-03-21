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

#ifndef INTERNALGAMECONTROLLER_H
#define INTERNALGAMECONTROLLER_H

#include "core/timer.h"
#include "protobuf/ssl_game_controller_team.pb.h"
#include "protobuf/ssl_game_controller_auto_ref.pb.h"
#include "protobuf/world.pb.h"
#include "protobuf/status.h"
#include "protobuf/command.h"

#include <QObject>
#include <QTimer>

class InternalGameController : public QObject
{
    Q_OBJECT

public:
    InternalGameController(const Timer *timer, QObject *parent = nullptr);
    void handleGuiCommand(const QByteArray &data);
    void handleGameEvent(std::shared_ptr<gameController::AutoRefToController> message);

public slots:
    void handleStatus(const Status& status);
    void handleCommand(const amun::CommandReferee& refereeCommand);

signals:
    void gotPacketForReferee(const QByteArray &data);
    void gotControllerReply(const gameController::ControllerReply &reply);
    void sendCommand(Command command);

private slots:
    void sendUpdate();
    void setScaling(double scaling);

private:
    struct Vector {
        float x, y;
    };
    Vector ballPlacementPosForFoul(Vector foulPosition);
    void issueCommand(SSL_Referee::Command command);

private:
    const Timer *m_timer;

    world::Geometry m_geometry;

    SSL_Referee m_packet;
    qint64 m_currentActionStartTime = -1;
    qint64 m_currentActionAllowedTime;
    bool m_isFirstPlacement;
    Vector m_lastPlacementPos = {0, 0};

    QTimer *m_trigger;

    const int UPDATE_INTERVAL_MS = 500;
    const float FIELD_LINE_DISTANCE = 0.3f;
    const float GOAL_LINE_DISTANCE = 0.35f;
    const float DEFENSE_DISTANCE = 1;

    // constants from the rules
    const int BALL_PLACEMENT_TIME = 30000000;
    const int FREEKICK_TIME = 5000000;
};

#endif // INTERNALGAMECONTROLLER_H
