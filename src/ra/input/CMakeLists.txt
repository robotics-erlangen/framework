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

set(SOURCES
    include/input/inputmanager.h

    inputdevice.cpp
    inputdevice.h
    inputmanager.cpp
    keyboard.cpp
    keyboard.h
)

if(TARGET sdl2)
    list(APPEND SOURCES
        joystick.cpp
        joystick.h
    )
endif()

add_library(input ${SOURCES})
target_link_libraries(input
    PRIVATE config
    PUBLIC protobuf
    PRIVATE Qt5::Widgets
)
target_include_directories(input
    INTERFACE include
    PRIVATE include/input
)

if(TARGET sdl2)
	target_link_libraries(input PRIVATE sdl2)
    target_compile_definitions(input PUBLIC SDL2_FOUND)
endif()
