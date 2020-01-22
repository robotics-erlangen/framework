/***************************************************************************
 *   Copyright 2019 Paul Bergmann                                          *
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

#ifndef SCRIPTSTATE_H
#define SCRIPTSTATE_H

#include <QStringList>

#include "protobuf/status.h"

class DebugHelper;

class ScriptState {
public:
    QStringList selectedOptions;
    DebugHelper* debugHelper = nullptr;
    bool isInternalAutoref = false;
    bool isPerformanceMode = false;
    bool isReplay = false;
    bool isFlipped = false;
    bool isTournamentMode = false;
    bool isDebugEnabled = false;
    bool isRunningInLogplayer = false;
    Status currentStatus; // used for replay tests
};

#endif // SCRIPTSTATE_H
