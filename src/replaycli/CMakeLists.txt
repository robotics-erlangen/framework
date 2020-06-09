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

add_executable(replay-cli
    replaycli.cpp
    replaytestrunner.h
    replaytestrunner.cpp
    timingstatistics.h
    timingstatistics.cpp
    ${CMAKE_BINARY_DIR}/run_replay_tests.py
)
target_link_libraries(replay-cli
    amun::strategy
    shared::protobuf
    amun::seshat
    shared::core
    Qt5::Core
    Threads::Threads
    amuncli::testtools
)
v8_copy_deps(replay-cli)
target_include_directories(replay-cli
    PRIVATE "${CMAKE_CURRENT_BINARY_DIR}"
    PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}"
)
add_custom_command(
    OUTPUT ${CMAKE_BINARY_DIR}/run_replay_tests.py
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_SOURCE_DIR}/cmake/run_replay_tests.py ${CMAKE_BINARY_DIR}/run_replay_tests.py
    DEPENDS ${CMAKE_SOURCE_DIR}/cmake/run_replay_tests.py
)
if (TARGET lib::jemalloc)
    target_link_libraries(replay-cli lib::jemalloc)
endif()
