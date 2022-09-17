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

include(ExternalProject)
include(ExternalProjectHelper)

if (UNIX AND NOT APPLE)
    include(CheckIncludeFile)
    check_include_file("libudev.h" LIBUDEV_FOUND)
    if (LIBUDEV_FOUND)
        set(LIBSDL_SUBPATH "${CMAKE_INSTALL_LIBDIR}/${CMAKE_SHARED_LIBRARY_PREFIX}SDL2${CMAKE_SHARED_LIBRARY_SUFFIX}")

        ExternalProject_Add(project_sdl2
            EXCLUDE_FROM_ALL true
            URL http://www.robotics-erlangen.de/downloads/libraries/SDL2-2.0.7.tar.gz
            URL_HASH SHA256=ee35c74c4313e2eda104b14b1b86f7db84a04eeab9430d56e001cea268bf4d5e
            DOWNLOAD_NO_PROGRESS true
            CONFIGURE_COMMAND <SOURCE_DIR>/configure --prefix=<INSTALL_DIR>
            BUILD_BYPRODUCTS "<INSTALL_DIR>/${LIBSDL_SUBPATH}"
            DOWNLOAD_DIR "${DEPENDENCY_DOWNLOADS}"
        )
        EPHelper_Mark_For_Download(project_sdl2)

        externalproject_get_property(project_sdl2 install_dir)
        add_library(lib::sdl2 UNKNOWN IMPORTED)
        # cmake enforces that the include directory exists
        file(MAKE_DIRECTORY "${install_dir}/include/SDL2")
        set_target_properties(lib::sdl2 PROPERTIES
            IMPORTED_LOCATION "${install_dir}/${LIBSDL_SUBPATH}"
            INTERFACE_INCLUDE_DIRECTORIES "${install_dir}/include/SDL2"
        )
        add_dependencies(lib::sdl2 project_sdl2)
        set(SDL2_FOUND true)
        set(SDL2_VERSION "2.0.7")
        message(STATUS "Building SDL ${SDL2_VERSION}")
    else()
        # actually just for plug & play, but it won't work without ...
        message(WARNING "SDL2 requires libudev for game controller support")
        set(SDL2_FOUND false)
    endif()
elseif(MINGW)
    # use prebuilt binaries on windows
    set(LIBSDL_SUBPATH "bin/SDL2${CMAKE_SHARED_LIBRARY_SUFFIX}")
    set(LIBSDL_LIBSUBPATH "${CMAKE_INSTALL_LIBDIR}/libSDL2${CMAKE_SHARED_LIBRARY_SUFFIX}.a")
    set(SPACE_FREE_INSTALL_DIR "${CMAKE_CURRENT_BINARY_DIR}/project_sdl2-prefix")
    string(REPLACE " " "\\ " SPACE_FREE_INSTALL_DIR "${SPACE_FREE_INSTALL_DIR}")

    set(ARCH i686-w64-mingw32)
    if(MINGW64)
        set(ARCH x86_64-w64-mingw32)
    endif()

    ExternalProject_Add(project_sdl2
        EXCLUDE_FROM_ALL true
        URL http://www.robotics-erlangen.de/downloads/libraries/SDL2-devel-2.0.7-mingw.tar.gz
        URL_HASH SHA256=232c399087f50f50f76219e3789452b46054503cfc33b53ab8a4b14519df35cf
        DOWNLOAD_NO_PROGRESS true
        CONFIGURE_COMMAND ""
        BUILD_COMMAND ""
        BUILD_IN_SOURCE true
        INSTALL_COMMAND make install-package arch=${ARCH} prefix=${SPACE_FREE_INSTALL_DIR}
        BUILD_BYPRODUCTS
            "<INSTALL_DIR>/${LIBSDL_SUBPATH}"
            "<INSTALL_DIR>/${LIBSDL_LIBSUBPATH}"
        DOWNLOAD_DIR "${DEPENDENCY_DOWNLOADS}"
    )
    EPHelper_Mark_For_Download(project_sdl2)

    externalproject_get_property(project_sdl2 install_dir)
    add_library(lib::sdl2 UNKNOWN IMPORTED)
    # cmake enforces that the include directory exists
    file(MAKE_DIRECTORY "${install_dir}/include/SDL2")
    set_target_properties(lib::sdl2 PROPERTIES
        IMPORTED_LOCATION "${install_dir}/${LIBSDL_SUBPATH}"
        INTERFACE_LINK_LIBRARIES "${install_dir}/${LIBSDL_LIBSUBPATH}"
        INTERFACE_INCLUDE_DIRECTORIES "${install_dir}/include/SDL2"
    )
    add_dependencies(lib::sdl2 project_sdl2)
    set(SDL2_FOUND true)
    set(SDL2_VERSION "2.0.7")
    message(STATUS "Building ${SDL2_VERSION}")
else()
    message(WARNING "Get libsdl2 with version >= 2.0.2 for game controller support")
    set(SDL2_FOUND false)
endif()
