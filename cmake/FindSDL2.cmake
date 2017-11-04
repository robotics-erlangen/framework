#.rst:
# FindSDL2
# -----------
#
# Finds the FindSDL2 library
#
# This will define the following variables::
#
#   SDL2_FOUND - True if the system has the SDL2 library
#   SDL2_VERSION  - The version of the SDL2 library which was found
#
# and the following imported targets::
#
#   lib::sdl2  - The SDL2 library
#
# Include similar to
#   #include <SDL_events.h>

# ***************************************************************************
# *   Copyright 2016 Michael Eischer                                        *
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

find_path(SDL2_INCLUDE_DIR
  NAMES SDL.h
  HINTS $ENV{SDL2_DIR}
  PATH_SUFFIXES include/SDL2
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

find_library(SDL2_LIBRARY
  NAMES SDL2
  HINTS $ENV{SDL2_DIR}
  PATH_SUFFIXES lib64 lib
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

if (MINGW)
	sanitize_env()
	find_program(SDL2_LIBRARY_DLL
	  NAMES SDL2.dll
	  HINTS $ENV{SDL2_DIR}
	  PATH_SUFFIXES bin
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
	restore_env()
	set(SDL2_LIB_EXTRA SDL2_LIBRARY_DLL)
elseif()
	set(SDL2_LIB_EXTRA)
endif()

if(SDL2_INCLUDE_DIR AND EXISTS "${SDL2_INCLUDE_DIR}/SDL_version.h")
  file(STRINGS "${SDL2_INCLUDE_DIR}/SDL_version.h" SDL2_VERSION_MAJOR_LINE REGEX "^#define[ \t]+SDL_MAJOR_VERSION[ \t]+([0-9]+)$")
  file(STRINGS "${SDL2_INCLUDE_DIR}/SDL_version.h" SDL2_VERSION_MINOR_LINE REGEX "^#define[ \t]+SDL_MINOR_VERSION[ \t]+([0-9]+)$")
  file(STRINGS "${SDL2_INCLUDE_DIR}/SDL_version.h" SDL2_VERSION_PATCH_LINE REGEX "^#define[ \t]+SDL_PATCHLEVEL[ \t]+([0-9]+)$")
  string(REGEX REPLACE "^#define[ \t]+SDL_MAJOR_VERSION[ \t]+([0-9]+)$" "\\1" SDL2_VERSION_MAJOR "${SDL2_VERSION_MAJOR_LINE}")
  string(REGEX REPLACE "^#define[ \t]+SDL_MINOR_VERSION[ \t]+([0-9]+)$" "\\1" SDL2_VERSION_MINOR "${SDL2_VERSION_MINOR_LINE}")
  string(REGEX REPLACE "^#define[ \t]+SDL_PATCHLEVEL[ \t]+([0-9]+)$" "\\1" SDL2_VERSION_PATCH "${SDL2_VERSION_PATCH_LINE}")
  set(SDL2_VERSION ${SDL2_VERSION_MAJOR}.${SDL2_VERSION_MINOR}.${SDL2_VERSION_PATCH})
  unset(SDL2_VERSION_MAJOR_LINE)
  unset(SDL2_VERSION_MINOR_LINE)
  unset(SDL2_VERSION_PATCH_LINE)
  unset(SDL2_VERSION_MAJOR)
  unset(SDL2_VERSION_MINOR)
  unset(SDL2_VERSION_PATCH)
endif()


include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(SDL2
  FOUND_VAR SDL2_FOUND
  REQUIRED_VARS
    SDL2_LIBRARY
    SDL2_INCLUDE_DIR
	${SDL2_LIB_EXTRA}
  VERSION_VAR SDL2_VERSION
)
mark_as_advanced(
  SDL2_INCLUDE_DIR
  SDL2_LIBRARY
  ${SDL2_LIB_EXTRA}
)

if(SDL2_FOUND)
  add_library(lib::sdl2 UNKNOWN IMPORTED)
  set_target_properties(lib::sdl2 PROPERTIES
    IMPORTED_LOCATION "${SDL2_LIBRARY}"
    INTERFACE_INCLUDE_DIRECTORIES "${SDL2_INCLUDE_DIR}"
  )
  if (APPLE)
    # For OS X, SDL uses Cocoa as a backend so it must link to Cocoa.
    set_property(TARGET lib::sdl2 PROPERTY IMPORTED_LINK_INTERFACE_LIBRARIES "-framework Cocoa")
  endif()
  if(MINGW)
    set_target_properties(lib::sdl2 PROPERTIES
      IMPORTED_LOCATION "${SDL2_LIBRARY_DLL}"
      INTERFACE_LINK_LIBRARIES "${SDL2_LIBRARY}"
    )
  endif()
endif()
