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

cmake_minimum_required(VERSION 3.5.0)
project(erforce)
enable_testing()
set(CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/cmake")

if(MINGW)
    if(CMAKE_SIZEOF_VOID_P EQUAL 4)
        set(MINGW32 TRUE)
    elseif(CMAKE_SIZEOF_VOID_P EQUAL 8)
        set(MINGW64 TRUE)
    endif()
endif()

#
# Policies
#

if (POLICY CMP0071)
    cmake_policy(SET CMP0071 NEW)
endif()

if(POLICY CMP0072)
    cmake_policy(SET CMP0072 NEW)
endif()

if (POLICY CMP0114)
    cmake_policy(SET CMP0114 OLD)
endif()

if (POLICY CMP0135)
    cmake_policy(SET CMP0135 NEW)
endif()

include(CheckCXXCompilerFlag)
CHECK_CXX_COMPILER_FLAG(-std=c++17 HAVE_C17)
if (NOT HAVE_C17)
    message(FATAL_ERROR "Your compiler does not understand -std=c++17, consider updating your compiler")
endif()
SET(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall")
SET(CMAKE_CXX_STANDARD 17)
SET(CMAKE_CXX_STANDARD_REQUIRED YES)
SET(CMAKE_CXX_EXTENSIONS ON)

if(NOT CMAKE_BUILD_TYPE)
    message(STATUS "Setting build type to Release")
    set(CMAKE_BUILD_TYPE "Release")
endif()

if(MINGW)
    find_program(WINDRES_EXECUTABLE NAMES windres)
    set(CMAKE_RC_COMPILER_INIT ${WINDRES_EXECUTABLE})
    enable_language(RC)
    set(CMAKE_RC_COMPILE_OBJECT "<CMAKE_RC_COMPILER> <FLAGS> -O coff <DEFINES> \"-I${CMAKE_SOURCE_DIR}/data/pkg\" -i <SOURCE> -o <OBJECT>")
    # make sure MinGW doesn't screw up packing the radiocommands
    SET(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -mno-ms-bitfields")

    # sse floats are already the default for x64
    if(MINGW32)
        # use sse floats, not the insane x87 fpu where intermediate values
        # may have up to 80bit precision, instead of the expected 32bit for floats
        SET(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -msse2 -mfpmath=sse")
        SET(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -msse2 -mfpmath=sse")
    endif()
endif(MINGW)

if(APPLE)
    # the option "S" prevents execution of ranlib
    SET(CMAKE_C_ARCHIVE_CREATE "<CMAKE_AR> Sqc <TARGET> <LINK_FLAGS> <OBJECTS>")
    SET(CMAKE_CXX_ARCHIVE_CREATE "<CMAKE_AR> Sqc <TARGET> <LINK_FLAGS> <OBJECTS>")
    # silence ranlib "has no symbols"-warning
    SET(CMAKE_C_ARCHIVE_FINISH "<CMAKE_RANLIB> -no_warning_for_no_symbols <TARGET>")
    SET(CMAKE_CXX_ARCHIVE_FINISH "<CMAKE_RANLIB> -no_warning_for_no_symbols <TARGET>")
endif()

# Find cross compilers
macro(find_cross_compiler VARIABLE NAME)
    find_program(${VARIABLE} NAMES ${NAME})
    mark_as_advanced(${VARIABLE})

    if("${ARGN}" STREQUAL "REQUIRED")
        if(NOT ${VARIABLE})
            message("${NAME} not found, some targets will not be available.")
        endif()
    endif()
endmacro(find_cross_compiler)

find_cross_compiler(ARM_C_CROSS_COMPILER arm-none-eabi-gcc REQUIRED)
find_cross_compiler(ARM_CXX_CROSS_COMPILER arm-none-eabi-g++)
if(NOT ARM_C_CROSS_COMPILER)
    message(STATUS "No suitable cross compiler found, firmware will be unavailable")
    set(BUILD_FIRMWARE FALSE CACHE BOOL "Build the firmware" FORCE)
else()
    set(BUILD_FIRMWARE TRUE CACHE BOOL "Build the firmware")
endif()

# downloads
add_custom_target(download)

include(EnvHelper)

find_package(OpenGL REQUIRED)
set(THREADS_PREFER_PTHREAD_FLAG ON)
find_package(Threads REQUIRED)
sanitize_env()
find_package(Protobuf 3.3.0)
restore_env()
# old cmake versions can't detect the protobuf version number
# the protobuf version on such systems is too old to be useful
if(NOT ${PROTOBUF_FOUND} OR ${CMAKE_VERSION} VERSION_LESS 3.6.0 OR NOT TARGET protobuf::protoc)
    include(BuildProtobuf)
endif()

# Try to auto-locate Qt5 on MacOS (won't work with custom installs)
if (APPLE)
    if (EXISTS /usr/local/opt/qt@5)
        set(Qt5_DIR "/usr/local/opt/qt@5/lib/cmake/Qt5")
    elseif(EXISTS /usr/local/opt/qt5)
        set(Qt5_DIR "/usr/local/opt/qt5/lib/cmake/Qt5")
    else()
        message(FATAL_ERROR "Could not find Qt5. Please install with `brew install qt@5`.")
    endif()
endif()


set(CMAKE_AUTOMOC ON)
find_package(Qt5 COMPONENTS Core Widgets Network OpenGL REQUIRED)

find_package(Qt5 COMPONENTS Svg)
if (NOT TARGET Qt5::Svg)
    message(STATUS "Qt svg component not found. Svg screenshots will not be supported.")
endif()

if(UNIX AND NOT APPLE)
    # file open dialogs crash on mac
    # memory corruption with crash on windows
    find_package(Jemalloc)
endif()
find_package(USB)

set(DEPENDENCY_DOWNLOADS "${CMAKE_BINARY_DIR}/dependencies")

if(MINGW AND NOT TARGET lib::usb)
    include(BuildUSB)
endif()
# sdl2 version 2.0.2 required for loading controller mappings from config file
find_package(SDL2 2.0.2)
if (NOT TARGET lib::sdl2)
    include(BuildSDL2)
endif()

include(BuildBullet)
include(BuildEigen)
include(BuildSourceMap)
include(BuildLibGit2)
include(BuildLuaJIT2)
include(BuildGoogleTest)
include(GetGameController)
find_package(V8 10.5.7)

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

include(AddLanguageServices)

if(MINGW)
	include(CollectWindows)
endif()
