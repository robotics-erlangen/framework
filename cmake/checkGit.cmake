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


# This cmake file is build as a script that is triggered by src/config/CMakeLists.txt
# to make sure the git-stuff is not done at configure time, but for every build time.
# It requires the following Variables:
# TARGET (The location of the file after processing), GIT_BASE_DIR (CMAKE_SOURCE_DIR), SOURCE (The file to be processed), STAMP (The file to be touched), ESCAPE (True if we need to escape curly braces for git )

# It created the following file:
# TARGET

# It touches the following file: (to be run again next time even if no file has changed)
# STAMP


if(${ESCAPE})
    set(MASTER_TREEISH "master@\\\\{u\\\\}")
else()
    set(MASTER_TREEISH "master@{u}")
endif()

macro(set_git_vars)
    if(NOT ${ARGC} EQUAL 2)
        message(FATAL_ERROR "set_git_vars needs exactly two arguments")
    endif()
    execute_process(WORKING_DIRECTORY ${GIT_BASE_DIR}
        OUTPUT_VARIABLE GIT_DIFF_${ARGV0}
        COMMAND git diff-index ${ARGV1} -p --no-color --ignore-cr-at-eol ${GIT_BASE_DIR}/src ${GIT_BASE_DIR}/cmake
    )

    execute_process(WORKING_DIRECTORY ${GIT_BASE_DIR}
        OUTPUT_VARIABLE GIT_COMMIT_${ARGV0}
        COMMAND git rev-parse ${ARGV1}
        OUTPUT_STRIP_TRAILING_WHITESPACE
    )
endmacro()

macro(c_escape)
    if(NOT ${ARGC} EQUAL 1)
        message(FATAL_ERROR "c_escape needs exactly one argument")
    endif()
    string(REGEX REPLACE "[\\]" "\\\\\\\\" ${ARGV0} "${${ARGV0}}")
    string(REGEX REPLACE "[?]" "\\\\?" ${ARGV0} "${${ARGV0}}")
    string(REGEX REPLACE "\n" "\\\\n" ${ARGV0} "${${ARGV0}}")
endmacro()

set_git_vars(HEAD HEAD)
set_git_vars(MASTER ${MASTER_TREEISH})

c_escape(GIT_DIFF_HEAD)
c_escape(GIT_DIFF_MASTER)

configure_file(${SOURCE} ${TARGET} ESCAPE_QUOTES)

execute_process(COMMAND ${CMAKE_COMMAND} -E touch ${STAMP})
