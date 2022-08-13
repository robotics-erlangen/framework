#.rst:
# FindJemalloc
# -------
#
# Finds the jemalloc library
#
# This will define the following variables::
#
#   JEMALLOC_FOUND - True if the system has the jemalloc library
#
# and the following imported targets::
#
#   lib::jemalloc  - The jemalloc library

# ***************************************************************************
# *   Copyright 2017 Michael Eischer                                        *
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

find_path(JEMALLOC_INCLUDE_DIR
  NAMES jemalloc.h
  HINTS $ENV{JEMALLOC_DIR}
  PATH_SUFFIXES include/jemalloc
  PATHS
    ~/Library/Frameworks
    /Library/Frameworks
    /usr/local
    /usr
    /sw # Fink
    /opt/local # DarwinPorts
    /opt/csw # Blastwave
    /opt
)

find_library(JEMALLOC_LIBRARY
  NAMES jemalloc
  HINTS $ENV{JEMALLOC_DIR}
  PATH_SUFFIXES lib64 lib
  PATHS
    ~/Library/Frameworks
    /Library/Frameworks
    /usr/local
    /usr
    /sw
    /opt/local
    /opt/csw
    /opt
)

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(Jemalloc
  FOUND_VAR JEMALLOC_FOUND
  REQUIRED_VARS
    JEMALLOC_LIBRARY
    JEMALLOC_INCLUDE_DIR
)
mark_as_advanced(
  JEMALLOC_INCLUDE_DIR
  JEMALLOC_LIBRARY
)

if(JEMALLOC_FOUND)
  add_library(lib::jemalloc UNKNOWN IMPORTED)
  set_target_properties(lib::jemalloc PROPERTIES
    IMPORTED_LOCATION "${JEMALLOC_LIBRARY}"
    INTERFACE_INCLUDE_DIRECTORIES "${JEMALLOC_INCLUDE_DIR}"
  )
endif()
