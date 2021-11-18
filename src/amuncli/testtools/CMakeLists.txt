# ***************************************************************************
# *   Copyright 2019 Andreas Wendler                                        *
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

add_library(testtools STATIC
    include/testtools/testtools.h
    include/testtools/connector.h

    testtools.cpp
    connector.cpp
)

qt5_wrap_ui(UIC_SOURCES ${UI_SOURCES})
target_sources(testtools PRIVATE ${UIC_SOURCES})

target_link_libraries(testtools
    PUBLIC Qt5::Core
    PUBLIC shared::protobuf
    PUBLIC shared::config
    PUBLIC amun::seshat
    PUBLIC amun::strategy
    PUBLIC amun::internalreferee
    PUBLIC Threads::Threads
)
target_include_directories(testtools
    INTERFACE include
    PRIVATE include/testtools
    PRIVATE "${CMAKE_CURRENT_BINARY_DIR}"
    PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}"
)

add_library(amuncli::testtools ALIAS testtools)
