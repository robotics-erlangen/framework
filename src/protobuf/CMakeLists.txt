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

if(PROTOBUF_FOUND)

include_directories(${PROTOBUF_INCLUDE_DIR})

set(SOURCES
    command.h
    geometry.cpp
    geometry.h
    ssl_referee.cpp
    ssl_referee.h
    status.h
)

set(PROTO_FILES
    command.proto
    debug.proto
    gamestate.proto
    robot.proto
    ssl_detection.proto
    ssl_geometry.proto
    ssl_referee.proto
    ssl_wrapper.proto
    status.proto
    userinput.proto
    world.proto
)

protobuf_generate_cpp(PROTO_SOURCES PROTO_HEADERS ${PROTO_FILES})

add_library(protobuf ${SOURCES} ${PROTO_SOURCES} ${PROTO_HEADERS} ${PROTO_FILES})
target_link_libraries(protobuf ${PROTOBUF_LIBRARY})

endif()
