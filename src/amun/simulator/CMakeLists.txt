# ***************************************************************************
# *   Copyright 2014 Michael Eischer, Philipp Nordhus                       *
# *   Robotics Erlangen e.V.                                                *
# *   http://www.robotics-erlangen.de/                                      *
# *   info@robotics-erlangen.de                                             *
# *                                                                         *
# *   This program is free software: you can redistribute it and/or modify  *
# *   it under the terms of the GNU General Public License as published by  *
# *   the Free Software Foundation, either version 3 of the License, or     *
# *   any later version.                                                    *
# *                                                                         *
# *   This program is distributed in the hope that it will be useful,       *
# *   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
# *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
# *   GNU General Public License for more details.                          *
# *                                                                         *
# *   You should have received a copy of the GNU General Public License     *
# *   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
# ***************************************************************************

if(TARGET protobuf AND QT_FOUND)

include_directories(${BULLET_INCLUDE_DIRS})
include_directories(${PROTOBUF_INCLUDE_DIR})

set(SOURCES
    mesh.cpp
    mesh.h
    simball.cpp
    simball.h
    simfield.cpp
    simfield.h
    simrobot.cpp
    simrobot.h
    simulator.cpp
    simulator.h
)

add_library(simulator ${SOURCES})
target_link_libraries(simulator protobuf ${BULLET_LIBRARIES})
add_dependencies(simulator bullet)
qt5_use_modules(simulator Core Gui)

endif()
