# ***************************************************************************
# *   Copyright 2018 Andreas Wendler                                        *
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

add_executable(logcutter-cli
    logcuttercli.cpp
)
target_link_libraries(logcutter-cli
    amun::seshat
    ra::logcutter
    Qt5::Core
)
target_include_directories(logcutter-cli
    PRIVATE "${CMAKE_CURRENT_BINARY_DIR}"
    PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}"
)
if (TARGET lib::jemalloc)
    target_link_libraries(logcutter-cli lib::jemalloc)
endif()

add_executable(visionlogcutter-cli
    visionlogcutter.cpp
)
target_link_libraries(visionlogcutter-cli
    visionlog::visionlog
    shared::protobuf
    Qt5::Core
)
target_include_directories(visionlogcutter-cli
    PRIVATE "${CMAKE_CURRENT_BINARY_DIR}"
    PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}"
)
if (TARGET lib::jemalloc)
    target_link_libraries(visionlogcutter-cli lib::jemalloc)
endif()
