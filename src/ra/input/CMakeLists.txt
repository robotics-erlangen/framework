# ***************************************************************************
# *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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

include_directories(${PROTOBUF_INCLUDE_DIR})
if(SDL2_FOUND)
    include_directories(${SDL2_INCLUDE_DIR})
endif()

set(SOURCES
    inputdevice.cpp
    inputdevice.h
    inputmanager.cpp
    inputmanager.h
    keyboard.cpp
    keyboard.h
)

if(SDL2_FOUND)
    set(SOURCES ${SOURCES}
        joystick.cpp
        joystick.h
    )
endif()

add_library(input ${SOURCES})
target_link_libraries(input protobuf)
qt5_use_modules(input Widgets)
if(SDL2_FOUND)
	target_link_libraries(input ${SDL2_LIBRARY})
	add_dependencies(input sdl2)
endif()

endif()
