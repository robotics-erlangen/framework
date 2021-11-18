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

add_library(input STATIC
    include/input/inputmanager.h

    inputdevice.cpp
    inputdevice.h
    inputmanager.cpp
    keyboard.cpp
    keyboard.h
)
target_link_libraries(input
    PRIVATE shared::config
    PUBLIC shared::protobuf
    PRIVATE Qt5::Widgets
)
target_include_directories(input
    INTERFACE include
    PRIVATE include/input
)

if(TARGET lib::sdl2)
    target_sources(input PRIVATE
        joystick.cpp
        joystick.h
    )
    target_link_libraries(input PRIVATE lib::sdl2)
    target_compile_definitions(input PUBLIC SDL2_FOUND)
endif()

add_library(ra::input ALIAS input)
