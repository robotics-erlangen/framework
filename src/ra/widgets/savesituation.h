/***************************************************************************
 *   Copyright 2015 Alexander Danzer                                       *
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

#ifndef SAVESITUATION_H
#define SAVESITUATION_H

#include "protobuf/status.h"
#include "fieldwidget.h"
#include <QHash>

void saveSituation(world::State worldState, amun::GameState gameState);

void saveSituationTypescript(TrackingFrom useTrackingFrom, world::State worldState, amun::GameState gameState,
                             const world::Geometry &geometry, const QHash<uint, robot::Specs> &blueRobots,
                             const QHash<uint, robot::Specs> &yellowRobots);

#endif // SAVESITUATION_H
