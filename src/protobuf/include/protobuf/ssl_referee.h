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

#ifndef SSL_REFEREE_H
#define SSL_REFEREE_H

#include "protobuf/ssl_referee.pb.h"
#include "protobuf/gamestate.pb.h"

#include <QtGlobal> // for qint64

void teamInfoSetDefault(SSL_Referee::TeamInfo *teamInfo);
SSL_Referee::Command commandFromGameState(amun::GameState::State state);

class SSLRefereeExtractor {
public:
    SSLRefereeExtractor(qint64 startTime) : m_gameStateChangeTime(startTime) {}

    SSL_Referee convertGameState(const amun::GameState &gameState, qint64 currentTime);

private:
    amun::GameState::State m_lastState = amun::GameState::Halt;
    qint64 m_gameStateChangeTime;
    quint32 m_refereeCounter = 0;
    SSL_Referee::Command m_lastCommand = SSL_Referee::HALT;
    qint32 m_remainingActionTime = 0;
};

#endif // SSL_REFEREE_H
