# ***************************************************************************
# *   Copyright 2022 Tobias Heineken                                        *
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


# This cmake file is build as a script that is triggered by src/git/CMakeLists.txt
# to make sure the git-stuff is not done at configure time, but for every build time.

# The idea of this script is to give `git write-tree` the option to write to a file (which it sadly cannot out of the box)

# It requires the following Variables:
# TARGET (The location of the file that contains the SHA for the current index tree-ish), GIT_BASE_DIR (CMAKE_SOURCE_DIR)

# It created the following file:
# TARGET


execute_process(WORKING_DIRECTORY ${GIT_BASE_DIR}
	OUTPUT_FILE ${TARGET}
	COMMAND git write-tree
)

