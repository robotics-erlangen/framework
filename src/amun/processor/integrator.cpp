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

#include "integrator.h"

Integrator::Integrator() :
    m_isReplay(false)
{ }

void Integrator::handleStatus(const Status &status)
{ }

void Integrator::handleReplayStatus(const Status &status)
{
    emit sendReplayStatus(status);
}

void Integrator::handleCommand(const Command &command)
{
    if (command->has_replay()) {
        const amun::CommandReplay &replay = command->replay();
        if (replay.has_enable()) {
            m_isReplay = replay.enable();
        }
    }
}
