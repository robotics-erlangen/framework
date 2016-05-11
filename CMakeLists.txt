# ***************************************************************************
# *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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

cmake_minimum_required(VERSION 2.8.12)
project(erforce)
set(CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/cmake")
# CMP0028 and CMP0037 enforce restrictions of cmake target names added in CMake 3.0
if(POLICY CMP0028 AND POLICY CMP0037 AND POLICY CMP0045)
    cmake_policy(SET CMP0028 NEW)
    cmake_policy(SET CMP0037 NEW)
    cmake_policy(SET CMP0045 NEW)
endif()
if(POLICY CMP0043) # compatibility with CMake 3.0.1
    cmake_policy(SET CMP0043 OLD)
endif()
if(POLICY CMP0058)
    cmake_policy(SET CMP0058 NEW)
endif()

SET(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -std=gnu++11")

if(NOT CMAKE_BUILD_TYPE)
    message(STATUS "Setting build type to Release")
    set(CMAKE_BUILD_TYPE "Release")
endif()

if(MINGW)
    find_program(WINDRES_EXECUTABLE NAMES windres)
    set(CMAKE_RC_COMPILER_INIT ${WINDRES_EXECUTABLE})
    enable_language(RC)
    set(CMAKE_RC_COMPILE_OBJECT "<CMAKE_RC_COMPILER> <FLAGS> -O coff <DEFINES> -I${CMAKE_SOURCE_DIR}/data/pkg -i <SOURCE> -o <OBJECT>")
endif(MINGW)

if(APPLE)
    # the option "S" prevents execution of ranlib
    SET(CMAKE_C_ARCHIVE_CREATE "<CMAKE_AR> Sqc <TARGET> <LINK_FLAGS> <OBJECTS>")
    SET(CMAKE_CXX_ARCHIVE_CREATE "<CMAKE_AR> Sqc <TARGET> <LINK_FLAGS> <OBJECTS>")
    # silence ranlib "has no symbols"-warning
    SET(CMAKE_C_ARCHIVE_FINISH "<CMAKE_RANLIB> -no_warning_for_no_symbols <TARGET>")
    SET(CMAKE_CXX_ARCHIVE_FINISH "<CMAKE_RANLIB> -no_warning_for_no_symbols <TARGET>")
endif()

find_package(OpenGL REQUIRED)
find_package(Threads REQUIRED)
find_package(Protobuf REQUIRED)

set(CMAKE_AUTOMOC ON)
find_package(Qt5Core REQUIRED)
find_package(Qt5Widgets REQUIRED)
find_package(Qt5Network REQUIRED)
find_package(Qt5OpenGL REQUIRED)

find_package(LuaJIT2 REQUIRED)
find_package(USB)
# sdl2 version 2.0.2 required for loading controller mappings from config file
find_package(SDL2 2.0.2)
if (NOT TARGET lib::sdl2)
    include(BuildSDL2)
endif()

include(BuildBullet)
include(BuildEigen)

include(FixCodeBlocks)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
add_subdirectory(src)

if(UNIX AND NOT APPLE)
    configure_file(data/pkg/ra.desktop.in ra.desktop)
    configure_file(data/pkg/ra-logplayer.desktop.in ra-logplayer.desktop)
    add_custom_target(install-menu
        COMMAND xdg-desktop-menu install --novendor ${CMAKE_BINARY_DIR}/ra.desktop ${CMAKE_BINARY_DIR}/ra-logplayer.desktop
        COMMENT "Installing menu entries" VERBATIM
    )
endif()

fixup_targets()
