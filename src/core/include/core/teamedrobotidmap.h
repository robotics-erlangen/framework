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

#ifndef TEAMD_ROBOT_ID_MAP_H
#define TEAMD_ROBOT_ID_MAP_H

#include <array>
#include <cassert>
#include <cstdint>

#define MAX_ROBOT_ID 16
#define NUM_COLORS 2

typedef enum {
    YELLOW = 0,
    BLUE = 1,
} TeamColor;

struct TeamedRobotID {
    TeamColor team;
    uint8_t id;

    TeamedRobotID(TeamColor color, uint8_t id);
    TeamedRobotID(bool isBlue, uint8_t id);
    static TeamedRobotID blue(uint8_t id);
    static TeamedRobotID yellow(uint8_t id);
};

template<typename T>
class TeamedRobotIDMap {
private:
    std::array<std::array<T, MAX_ROBOT_ID>, NUM_COLORS> map;

public:
    TeamedRobotIDMap(const T &initial) {
        map[YELLOW].fill(initial);
        map[BLUE].fill(initial);
    }

    T &operator[](const TeamedRobotID &teamedID) {
        return map[teamedID.team][teamedID.id];
    }

    std::array<T, MAX_ROBOT_ID> &operator[](const TeamColor &team) {
        return map[team];
    }
};

#endif /* TEAMD_ROBOT_ID_MAP_H */
