# ***************************************************************************
# *   Copyright 2021 Tobias Heineken                                        *
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

execute_process(COMMAND ${CMAKE_COMMAND} -E touch ${CMAKE_CURRENT_BINARY_DIR}/stamp)

add_custom_command(
    OUTPUT "${CMAKE_CURRENT_BINARY_DIR}/gitconfig.cpp"
    MAIN_DEPENDENCY gitconfig.cpp.in
    DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/stamp
    DEPENDS ${CMAKE_SOURCE_DIR}/cmake/checkGit.cmake
    COMMAND ${CMAKE_COMMAND} -D TARGET=${CMAKE_CURRENT_BINARY_DIR}/gitconfig.cpp -D GIT_BASE_DIR=${CMAKE_SOURCE_DIR} -D SOURCE=${CMAKE_CURRENT_SOURCE_DIR}/gitconfig.cpp.in -D STAMP=${CMAKE_CURRENT_BINARY_DIR}/stamp -P ${CMAKE_SOURCE_DIR}/cmake/checkGit.cmake
    COMMENT "Checking git"
)

add_library(gitconfig
    ${CMAKE_CURRENT_BINARY_DIR}/gitconfig.cpp
    include/git/gitconfig.h
    )

target_include_directories(gitconfig
    INTERFACE include
    PRIVATE include/git
)
add_library(shared::gitconfig ALIAS gitconfig)
