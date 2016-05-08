#.rst:
# FindLuaJIT2
# -----------
#
# Finds the LuaJIT2 library
#
# This will define the following variables::
#
#   LUAJIT_FOUND - True if the system has the LuaJIT2 library
#   LUAJIT_VERSION  - The version of the LuaJIT2 library which was found
#
# and the following imported targets::
#
#   lib::luajit  - The LuaJIT2 library
#
# Include lua using
#  #include <lua.hpp>
# or
#  #include <lua.h>

# ***************************************************************************
# *   Copyright 2016 Michael Eischer, Philipp Nordhus                       *
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

find_path(LUAJIT_INCLUDE_DIR
  NAMES luajit.h
  HINTS $ENV{LUA_DIR}
  PATH_SUFFIXES include/luajit-2.0
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

find_library(LUAJIT_LIBRARY
  NAMES luajit-5.1
  HINTS $ENV{LUA_DIR}
  PATH_SUFFIXES lib
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

if(LUAJIT_INCLUDE_DIR AND EXISTS "${LUAJIT_INCLUDE_DIR}/luajit.h")
  file(STRINGS "${LUAJIT_INCLUDE_DIR}/luajit.h" LUAJIT_VERSION_LINE REGEX "^#define[ \t]+LUAJIT_VERSION[ \t]+\"LuaJIT ([0-9.]+)\"$")
  string(REGEX REPLACE "^#define[ \t]+LUAJIT_VERSION[ \t]+\"LuaJIT ([0-9.]+)\"$" "\\1" LUAJIT_VERSION "${LUAJIT_VERSION_LINE}")
  unset(LUAJIT_VERSION_LINE)
endif()


include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(LUAJIT
  FOUND_VAR LUAJIT_FOUND
  REQUIRED_VARS
    LUAJIT_LIBRARY
    LUAJIT_INCLUDE_DIR
  VERSION_VAR LUAJIT_VERSION
)
mark_as_advanced(
  LUAJIT_INCLUDE_DIR
  LUAJIT_LIBRARY
)

if(LUAJIT_FOUND)
  add_library(lib::luajit UNKNOWN IMPORTED)
  set_target_properties(lib::luajit PROPERTIES
    IMPORTED_LOCATION "${LUAJIT_LIBRARY}"
    INTERFACE_INCLUDE_DIRECTORIES "${LUAJIT_INCLUDE_DIR}"
  )
  if(APPLE)
      # required by LuaJIT for 64bit
      set_target_properties(lib::luajit PROPERTIES INTERFACE_LINK_LIBRARIES "-pagezero_size 10000 -image_base 100000000")
  endif()
endif()
