/***************************************************************************
 *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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

#ifndef REFEREE_H
#define REFEREE_H

#include "protobuf/gamestate.pb.h"
#include "protobuf/world.pb.h"
#include "protobuf/ssl_referee.pb.h"
#include <QByteArray>

class Referee
{
public:
    explicit Referee(bool isInternalReferee);

public:
    const amun::GameState& gameState() const { return m_gameState; }

public:
    void handlePacket(const QByteArray &data);
    void process(const world::State &worldState);

private:
    void handleCommand(SSL_Referee::Command command);

private:
    const bool m_isInternalReferee;
    amun::GameState m_gameState;
    world::Ball m_ball;
    quint32 m_counter;
};

#endif // REFEREE_H
