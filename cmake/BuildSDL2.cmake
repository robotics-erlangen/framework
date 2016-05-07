
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

if (UNIX AND NOT APPLE)
    include(CheckIncludeFile)
    check_include_file("libudev.h" LIBUDEV_FOUND)
    if (LIBUDEV_FOUND)
        message(STATUS "Building SDL 2.0.2 myself")
        include(ExternalProject)
        ExternalProject_Add(sdl2
            URL http://www.robotics-erlangen.de/downloads/libraries/SDL2-2.0.2.tar.gz
            URL_MD5 e8070e8b6335def073a80cee78f3a7f0
            CONFIGURE_COMMAND <SOURCE_DIR>/configure --prefix=<INSTALL_DIR>
        )

        externalproject_get_property(sdl2 install_dir)
        set_target_properties(sdl2 PROPERTIES EXCLUDE_FROM_ALL true)
        set(SDL2_FOUND TRUE)
        set(SDL2_INCLUDE_DIR "${install_dir}/include/SDL2")
        set(SDL2_LIBRARY "${install_dir}/lib/${CMAKE_SHARED_LIBRARY_PREFIX}SDL2${CMAKE_SHARED_LIBRARY_SUFFIX}")
    else()
        # actually just for plug & play, but it won't work without ...
        message(WARNING "SDL2 requires libudev for game controller support")
        set(SDL2_FOUND FALSE)
    endif()
else()
    # use prebuilt binaries on windows
    message(WARNING "Get libsdl2 with version >= 2.0.2 for game controller support")
    set(SDL2_FOUND FALSE)
endif()
