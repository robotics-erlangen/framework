/***************************************************************************
 *   Copyright 2015 Michael Eischer                                        *
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

#ifndef INTERNALREFEREE_H
#define INTERNALREFEREE_H

#include "protobuf/command.h"
#include "protobuf/ssl_referee.pb.h"
#include "protobuf/status.h"
#include <QObject>

class InternalReferee : public QObject
{
    Q_OBJECT
public:
    explicit InternalReferee(QObject *parent = 0);
    
signals:
    void sendCommand(const Command &command);

public slots:
    void changeCommand(SSL_Referee::Command command);
    void changeStage(SSL_Referee::Stage stage);
    void changeYellowKeeper(uint id);
    void changeBlueKeeper(uint id);
    void enableInternalAutoref(bool enable);
    void setSidesFlipped(bool flipped);
    void setYellowCard(int forTeamYellow);
    void handlePlaceBall(bool blue, float x, float y);

    void handleStatus(const Status &status);

private:
    void sendRefereePacket();
    SSL_Referee m_referee;

    uint64_t m_lastStatusTime = 1;
};

#endif // INTERNALREFEREE_H
