#.rst:
# FindV8
# -----------
#
# Finds the V8 library
#
# This will define the following variables::
#
#   V8_FOUND - True if the system has the V8 library
#   V8_VERSION  - The version of the V8 library which was found
#
# and the following targets:
#
#   lib::v8  - The V8 library

# ***************************************************************************
# *   Copyright 2018 Michael Eischer                                        *
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

find_path(V8_INCLUDE_DIR
    NAMES v8.h
    HINTS $ENV{V8_INCLUDE_DIR}
    PATH_SUFFIXES include
    NO_DEFAULT_PATH
    NO_CMAKE_FIND_ROOT_PATH
    PATHS
        ${CMAKE_SOURCE_DIR}/libs/v8/v8
)

if(V8_INCLUDE_DIR AND EXISTS "${V8_INCLUDE_DIR}/v8-version.h")
    include (${CMAKE_SOURCE_DIR}/cmake/CheckV8Version.cmake)
endif()

if(MINGW32)
    set(V8_ARCHITECTURE x86)
else()
    # CMAKE_SYSTEM_PROCESSOR uses uname -m on linux and these are all the possible values for arm64
    if (CMAKE_SYSTEM_PROCESSOR STREQUAL "aarch64_be" OR
        CMAKE_SYSTEM_PROCESSOR STREQUAL "aarch64" OR
        CMAKE_SYSTEM_PROCESSOR STREQUAL "armv8b" OR
        CMAKE_SYSTEM_PROCESSOR STREQUAL "armv8l")
            set(V8_ARCHITECTURE arm64)
        else()
            set(V8_ARCHITECTURE x64)
        endif()
endif()

find_path(V8_OUTPUT_DIR_DYNAMIC
    NAMES ${CMAKE_SHARED_LIBRARY_PREFIX}v8${CMAKE_SHARED_LIBRARY_SUFFIX}
    HINTS $ENV{V8_OUTPUT_DIR}
    NO_DEFAULT_PATH
    NO_CMAKE_FIND_ROOT_PATH
    PATHS
        ${CMAKE_SOURCE_DIR}/libs/v8/v8/out/${V8_ARCHITECTURE}.release
)
find_path(V8_OUTPUT_DIR_STATIC
    NAMES obj/${CMAKE_STATIC_LIBRARY_PREFIX}v8_monolith${CMAKE_STATIC_LIBRARY_SUFFIX}
    HINTS $ENV{V8_OUTPUT_DIR}
    NO_DEFAULT_PATH
    NO_CMAKE_FIND_ROOT_PATH
    PATHS
        ${CMAKE_SOURCE_DIR}/libs/v8/v8/out/${V8_ARCHITECTURE}.release
)

# prefer dynamic linking of v8, but allow fallback to static linking
set(V8_OUTPUT_DIR ${V8_OUTPUT_DIR_DYNAMIC})
set(V8_IS_DYNAMIC TRUE)
if (NOT V8_OUTPUT_DIR)
    set(V8_OUTPUT_DIR ${V8_OUTPUT_DIR_STATIC})
    set(V8_IS_DYNAMIC FALSE)
endif()

if((NOT V8_OUTPUT_DIR OR NOT V8_INCLUDE_DIR OR NOT ${V8_VERSION} MATCHES ${V8_FIND_VERSION}) AND DOWNLOAD_V8)
    if(MINGW32)
        set(V8_PRECOMPILED_DOWNLOAD "http://downloads.robotics-erlangen.de/software-precompiled/v8-version2-windows-x86.zip")
        set(V8_PRECOMPILED_HASH "b211960171de4aa26835a8d719973ef030b26e1112a1df901882479309de643b")
    elseif(MINGW64)
        set(V8_PRECOMPILED_DOWNLOAD "http://downloads.robotics-erlangen.de/software-precompiled/v8-version2-windows-x86_64.zip")
        set(V8_PRECOMPILED_HASH "78d8134808c0b57c5c8d595c7fff974f45e72cd78ef0cb88d50e916eea25c1b6")
    elseif(UNIX AND NOT APPLE)
        if (V8_ARCHITECTURE STREQUAL "arm64")
            set(V8_PRECOMPILED_DOWNLOAD "http://downloads.robotics-erlangen.de/software-precompiled/v8-version-2-ubuntu-24.04-arm64.tar.gz")
            set(V8_PRECOMPILED_HASH "d80e64b83070f63a54e55103e1da103d3e5055765af7e9ef6d8191ce4035a2f9")
        else()
            set(V8_PRECOMPILED_DOWNLOAD "http://downloads.robotics-erlangen.de/software-precompiled/v8-version-2-ubuntu-24.04-x64.tar.gz")
            set(V8_PRECOMPILED_HASH "f68bd515b5a0b71a7a261ec27b84c142aa9063d06a5098dd363f8da4267bd229")
        endif()
    endif()

    set(V8_IS_DYNAMIC FALSE)
    set(V8_VERSION "10.5.7")

    message("Could not find V8 - downloading a precompiled version")

    if(V8_PRECOMPILED_DOWNLOAD)
        ExternalProject_Add(project_v8
            URL ${V8_PRECOMPILED_DOWNLOAD}
            URL_HASH SHA256=${V8_PRECOMPILED_HASH}
            CONFIGURE_COMMAND ""
            BUILD_COMMAND ""
            INSTALL_COMMAND ""
            DOWNLOAD_NO_PROGRESS true
            DOWNLOAD_DIR "${DEPENDENCY_DOWNLOADS}"
            TEST_COMMAND ${CMAKE_COMMAND} -D V8_INCLUDE_DIR=<SOURCE_DIR>/include -D REQUESTED_V8_VERSION=${V8_VERSION} -P ${CMAKE_SOURCE_DIR}/cmake/CheckV8Version.cmake
        )
        EPHelper_Add_Cleanup(project_v8 bin include lib share)
        EPHelper_Add_Clobber(project_v8 ${CMAKE_CURRENT_LIST_DIR}/stub.patch)
        EPHelper_Mark_For_Download(project_v8)

        ExternalProject_Get_property(project_v8 SOURCE_DIR)
        set(V8_INCLUDE_DIR "${SOURCE_DIR}/include")
        set(V8_OUTPUT_DIR "${SOURCE_DIR}/out/${V8_ARCHITECTURE}.release")
        # the byproducts are available after the build step
        ExternalProject_Add_Step(project_v8 out
            DEPENDEES build
            BYPRODUCTS
                "${V8_OUTPUT_DIR}/obj/${CMAKE_STATIC_LIBRARY_PREFIX}v8_monolith${CMAKE_STATIC_LIBRARY_SUFFIX}"
        )

        file(MAKE_DIRECTORY "${V8_INCLUDE_DIR}")
    else()
        message(FATAL_ERROR "There is no V8 download available for your platform")
    endif()
endif()


include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(V8
    FOUND_VAR V8_FOUND
    REQUIRED_VARS
        V8_OUTPUT_DIR
        V8_INCLUDE_DIR
    VERSION_VAR V8_VERSION
)
mark_as_advanced(
    V8_INCLUDE_DIR
    V8_OUTPUT_DIR_DYNAMIC
    V8_OUTPUT_DIR_STATIC
)

if(V8_FOUND)
    if(NOT V8_IS_DYNAMIC)
        message("Statically linking V8")
    endif()

    if (V8_IS_DYNAMIC)
        set(LIBRARY_IMPORT_LOCATION "${V8_OUTPUT_DIR}/${CMAKE_SHARED_LIBRARY_PREFIX}v8${CMAKE_SHARED_LIBRARY_SUFFIX}")
    else()
        set(LIBRARY_IMPORT_LOCATION "${V8_OUTPUT_DIR}/obj/${CMAKE_STATIC_LIBRARY_PREFIX}v8_monolith${CMAKE_STATIC_LIBRARY_SUFFIX}")
    endif()

    add_library(project_v8_import UNKNOWN IMPORTED)
    set_target_properties(project_v8_import PROPERTIES
        IMPORTED_LOCATION "${LIBRARY_IMPORT_LOCATION}"
        INTERFACE_INCLUDE_DIRECTORIES "${V8_INCLUDE_DIR}"
    )

    if(V8_PRECOMPILED_DOWNLOAD)
        EPHelper_Add_Interface_Library(PROJECT project_v8 ALIAS lib::v8)
    else()
        add_library(lib::v8 ALIAS project_v8_import)
    endif()

    if("${CMAKE_CXX_COMPILER_ID}" STREQUAL "GNU")
        set(USING_GCC TRUE)
    else()
        set(USING_GCC FALSE)
    endif()

    if(USING_GCC)
        # force the linker to explcitly include all v8 libs
        # this is necesary as otherwise dependencies of v8 are resolved
        # using the standard library search path which will fail.
        set_property(TARGET project_v8_import APPEND PROPERTY INTERFACE_LINK_LIBRARIES -Wl,--push-state,--no-as-needed -Wl,--start-group)
    endif()

    if(V8_IS_DYNAMIC)
        set(V8_LIBS
            ${V8_OUTPUT_DIR}/${CMAKE_SHARED_LIBRARY_PREFIX}icui18n${CMAKE_SHARED_LIBRARY_SUFFIX}
            ${V8_OUTPUT_DIR}/${CMAKE_SHARED_LIBRARY_PREFIX}icuuc${CMAKE_SHARED_LIBRARY_SUFFIX}
            ${V8_OUTPUT_DIR}/${CMAKE_SHARED_LIBRARY_PREFIX}v8_libbase${CMAKE_SHARED_LIBRARY_SUFFIX}
            ${V8_OUTPUT_DIR}/${CMAKE_SHARED_LIBRARY_PREFIX}v8_libplatform${CMAKE_SHARED_LIBRARY_SUFFIX}
        )
        set_property(TARGET project_v8_import APPEND PROPERTY INTERFACE_LINK_LIBRARIES ${V8_LIBS})
        set(V8_DLL
            $<TARGET_FILE:project_v8_import>
            ${V8_LIBS}
        )
    else()
        set_property(TARGET project_v8_import APPEND PROPERTY INTERFACE_LINK_LIBRARIES
            ${V8_OUTPUT_DIR}/obj/${CMAKE_STATIC_LIBRARY_PREFIX}v8_monolith${CMAKE_STATIC_LIBRARY_SUFFIX}
        )
        set(V8_DLL)
    endif()

    if(USING_GCC)
        set_property(TARGET project_v8_import APPEND PROPERTY INTERFACE_LINK_LIBRARIES -Wl,--end-group -Wl,--pop-state)
    endif()

    if(MINGW)
        set_property(TARGET project_v8_import APPEND PROPERTY INTERFACE_LINK_LIBRARIES
            -lwinmm
            -ldbghelp
            -lshlwapi
            -lssp
        )
    elseif(LINUX)
        set_property(TARGET project_v8_import APPEND PROPERTY INTERFACE_LINK_LIBRARIES
            -lrt
            -ldl
            Threads::Threads
        )
    endif()

    macro(v8_copy_deps target)
        add_custom_command(TARGET ${target} POST_BUILD
            COMMAND ${CMAKE_COMMAND} -E copy_if_different
                ${V8_OUTPUT_DIR}/icudtl.dat
                    $<TARGET_FILE_DIR:${target}>
        )
    endmacro()
else()
    macro(v8_copy_deps target)
    endmacro()
endif()
