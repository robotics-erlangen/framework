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
# TARGET (The location of the file after processing), GIT_BASE_DIR (CMAKE_SOURCE_DIR), SOURCE (The file to be processed), STAMP (The file to be touched)

# It created the following file:
# TARGET

# It touches the following file: (to be run again next time even if no file has changed)
# STAMP

execute_process(WORKING_DIRECTORY ${GIT_BASE_DIR}
    OUTPUT_VARIABLE GIT_DIFF
    COMMAND git diff-files -p --no-color ${GIT_BASE_DIR}/src ${GIT_BASE_DIR}/cmake
)

execute_process(WORKING_DIRECTORY ${GIT_BASE_DIR}
    OUTPUT_VARIABLE GIT_COMMIT
    COMMAND git rev-parse HEAD
    OUTPUT_STRIP_TRAILING_WHITESPACE
)

string(REGEX REPLACE "[\\]" "\\\\\\\\" GIT_DIFF "${GIT_DIFF}")
string(REGEX REPLACE "\n" "\\\\n" GIT_DIFF "${GIT_DIFF}")

configure_file(${SOURCE} ${TARGET} ESCAPE_QUOTES)

execute_process(COMMAND ${CMAKE_COMMAND} -E touch ${STAMP})
