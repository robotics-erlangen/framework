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
    include/simulator/simulator.h

    mesh.cpp
    mesh.h
    simball.cpp
    simball.h
    simfield.cpp
    simfield.h
    simrobot.cpp
    simrobot.h
    simulator.cpp
)

add_library(simulator ${SOURCES})
target_link_libraries(simulator
    PRIVATE core
    PUBLIC protobuf
    PRIVATE bullet
    PUBLIC Qt5::Core
    PRIVATE Qt5::Gui
)
target_include_directories(simulator
    INTERFACE include
    PRIVATE include/simulator
)

if (CMAKE_CXX_COMPILER_ID MATCHES "Clang")
    # silence warnings about usage of the register specifier in header files of bullet
    set_property(TARGET simulator APPEND PROPERTY COMPILE_FLAGS "-Wno-deprecated-register")
endif()
