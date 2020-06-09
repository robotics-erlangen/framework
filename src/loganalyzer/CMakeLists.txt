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

add_executable(loganalyzer
    loganalyzer.cpp
)
target_link_libraries(loganalyzer
    shared::protobuf
    amun::seshat
)

target_include_directories(loganalyzer
    PRIVATE "${CMAKE_CURRENT_BINARY_DIR}"
    PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}"
)

if (TARGET lib::jemalloc)
    target_link_libraries(loganalyzer lib::jemalloc)
endif()
