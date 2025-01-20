/***************************************************************************
 *   Copyright 2025 Christoph Schmidtmeier                                 *
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

#include "teamedrobotidmap.h"

#define MAX_ROBOT_ID 16
#define NUM_COLORS 2

TeamedRobotID::TeamedRobotID(TeamColor color, uint8_t id) {
    this->team = color;
    this->id = id;
}

TeamedRobotID::TeamedRobotID(bool isBlue, uint8_t id) {
    this->team = isBlue ? BLUE : YELLOW;
    this->id = id;
}

TeamedRobotID TeamedRobotID::blue(uint8_t id) {
    assert(id < MAX_ROBOT_ID);
    return TeamedRobotID { BLUE, id };
}

TeamedRobotID TeamedRobotID::yellow(uint8_t id) {
    assert(id < MAX_ROBOT_ID);
    return TeamedRobotID { YELLOW, id };
}
