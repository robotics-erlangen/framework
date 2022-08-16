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
# and the following imported targets::
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

if(MINGW AND CMAKE_SIZEOF_VOID_P EQUAL 4)
    set(V8_ARCHITECTURE x86)
else()
    set(V8_ARCHITECTURE x64)
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
    NAMES obj/${CMAKE_STATIC_LIBRARY_PREFIX}v8_base${CMAKE_STATIC_LIBRARY_SUFFIX}
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

if((NOT V8_OUTPUT_DIR OR NOT V8_INCLUDE_DIR) AND DOWNLOAD_V8)
    if(MINGW)
        set(V8_PRECOMPILED_DOWNLOAD "http://downloads.robotics-erlangen.de/software-precompiled/v8-7.0-windows.zip")
        set(V8_PRECOMPILED_HASH f9db8ad1a1483f649ddf9ad5a1fa29c46e4ecbb6b0fe31c53916794da74edbb8)
        # not elegant, but the values must be known at configure time, before v8 is downloaded
        set(V8_PRECOMPILED_INCLUDE_SUFFIX "include")
        set(V8_PRECOMPILED_OUTPUT_SUFFIX "out/x64.release")
        set(V8_VERSION "7.0.0")
        set(V8_IS_DYNAMIC FALSE)
    elseif(UNIX AND NOT APPLE)
        set(V8_PRECOMPILED_DOWNLOAD "http://downloads.robotics-erlangen.de/software-precompiled/v8-7.0-ubuntu-20-04.zip")
        set(V8_PRECOMPILED_HASH 40df9024ed012d248467fc04437b76a77fddd3a8989ea659dbcd6d18854c241d)
        # not elegant, but the values must be known at configure time, before v8 is downloaded
        set(V8_PRECOMPILED_INCLUDE_SUFFIX "include")
        set(V8_PRECOMPILED_OUTPUT_SUFFIX "out/x64.release")
        set(V8_VERSION "7.0.0")
        set(V8_IS_DYNAMIC TRUE)
    endif()

    message("Could not find V8 - downloading a precompiled version")

    if(V8_PRECOMPILED_DOWNLOAD)
        ExternalProject_Add(v8_download
            URL ${V8_PRECOMPILED_DOWNLOAD}
            URL_HASH SHA256=${V8_PRECOMPILED_HASH}
            CONFIGURE_COMMAND ""
            BUILD_COMMAND ""
            INSTALL_COMMAND ""
            DOWNLOAD_NO_PROGRESS true
            DOWNLOAD_DIR "${DEPENDENCY_DOWNLOADS}"
            TEST_COMMAND ${CMAKE_COMMAND} -D V8_INCLUDE_DIR=<SOURCE_DIR>/${V8_PRECOMPILED_INCLUDE_SUFFIX} -D REQUESTED_V8_VERSION=${V8_VERSION} -P ${CMAKE_SOURCE_DIR}/cmake/CheckV8Version.cmake
        )
        EPHelper_Add_Cleanup(v8_download bin include lib share)
        EPHelper_Add_Clobber(v8_download ${CMAKE_CURRENT_LIST_DIR}/stub.patch)
        EPHelper_Mark_For_Download(v8_download)

        ExternalProject_Get_property(v8_download SOURCE_DIR)
        set(V8_INCLUDE_DIR "${SOURCE_DIR}/${V8_PRECOMPILED_INCLUDE_SUFFIX}")
        set(V8_OUTPUT_DIR "${SOURCE_DIR}/${V8_PRECOMPILED_OUTPUT_SUFFIX}")

        file(MAKE_DIRECTORY "${V8_INCLUDE_DIR}")
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
        if(NOT MINGW)
            message("Please rebuild V8 at your convenience")
        endif()
    endif()

    add_library(lib::v8 UNKNOWN IMPORTED)
    if(V8_PRECOMPILED_DOWNLOAD)
        add_dependencies(lib::v8 v8_download)
    endif()
    set_target_properties(lib::v8 PROPERTIES INTERFACE_INCLUDE_DIRECTORIES "${V8_INCLUDE_DIR}")
    if(V8_IS_DYNAMIC)
        set_target_properties(lib::v8 PROPERTIES IMPORTED_LOCATION "${V8_OUTPUT_DIR}/${CMAKE_SHARED_LIBRARY_PREFIX}v8${CMAKE_SHARED_LIBRARY_SUFFIX}")
    else()
        set_target_properties(lib::v8 PROPERTIES IMPORTED_LOCATION "${V8_OUTPUT_DIR}/obj/${CMAKE_STATIC_LIBRARY_PREFIX}v8_base${CMAKE_STATIC_LIBRARY_SUFFIX}")
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
        set_property(TARGET lib::v8 APPEND PROPERTY INTERFACE_LINK_LIBRARIES -Wl,--push-state,--no-as-needed -Wl,--start-group)
    endif()

    if(V8_IS_DYNAMIC)
        set(V8_LIBS
            ${V8_OUTPUT_DIR}/${CMAKE_SHARED_LIBRARY_PREFIX}icui18n${CMAKE_SHARED_LIBRARY_SUFFIX}
            ${V8_OUTPUT_DIR}/${CMAKE_SHARED_LIBRARY_PREFIX}icuuc${CMAKE_SHARED_LIBRARY_SUFFIX}
            ${V8_OUTPUT_DIR}/${CMAKE_SHARED_LIBRARY_PREFIX}v8_libbase${CMAKE_SHARED_LIBRARY_SUFFIX}
            ${V8_OUTPUT_DIR}/${CMAKE_SHARED_LIBRARY_PREFIX}v8_libplatform${CMAKE_SHARED_LIBRARY_SUFFIX}
        )
        set_property(TARGET lib::v8 APPEND PROPERTY INTERFACE_LINK_LIBRARIES ${V8_LIBS})
        set(V8_DLL
		    $<TARGET_FILE:lib::v8>
            ${V8_LIBS}
        )
    else()
        set_property(TARGET lib::v8 APPEND PROPERTY INTERFACE_LINK_LIBRARIES
            ${V8_OUTPUT_DIR}/obj/${CMAKE_STATIC_LIBRARY_PREFIX}v8_base${CMAKE_STATIC_LIBRARY_SUFFIX}
            ${V8_OUTPUT_DIR}/obj/${CMAKE_STATIC_LIBRARY_PREFIX}v8_external_snapshot${CMAKE_STATIC_LIBRARY_SUFFIX}
            ${V8_OUTPUT_DIR}/obj/${CMAKE_STATIC_LIBRARY_PREFIX}v8_libbase${CMAKE_STATIC_LIBRARY_SUFFIX}
            ${V8_OUTPUT_DIR}/obj/${CMAKE_STATIC_LIBRARY_PREFIX}v8_libplatform${CMAKE_STATIC_LIBRARY_SUFFIX}
            ${V8_OUTPUT_DIR}/obj/${CMAKE_STATIC_LIBRARY_PREFIX}v8_libsampler${CMAKE_STATIC_LIBRARY_SUFFIX}
            ${V8_OUTPUT_DIR}/obj/src/inspector/${CMAKE_STATIC_LIBRARY_PREFIX}inspector${CMAKE_STATIC_LIBRARY_SUFFIX}
            ${V8_OUTPUT_DIR}/obj/third_party/icu/${CMAKE_STATIC_LIBRARY_PREFIX}icui18n${CMAKE_STATIC_LIBRARY_SUFFIX}
            ${V8_OUTPUT_DIR}/obj/third_party/icu/${CMAKE_STATIC_LIBRARY_PREFIX}icuuc${CMAKE_STATIC_LIBRARY_SUFFIX}
        )
        set(V8_DLL)
    endif()

    if(USING_GCC)
        set_property(TARGET lib::v8 APPEND PROPERTY INTERFACE_LINK_LIBRARIES -Wl,--end-group -Wl,--pop-state)
    endif()

    if(MINGW)
        set_property(TARGET lib::v8 APPEND PROPERTY INTERFACE_LINK_LIBRARIES
            -lwinmm
            -ldbghelp
            -lshlwapi
            -lssp
        )
        if(NOT V8_IS_DYNAMIC)
            set_property(TARGET lib::v8 APPEND PROPERTY INTERFACE_LINK_LIBRARIES
                # strip binary in release mode to keep file size below 1,2GB
                $<$<CONFIG:Release>:-Wl,-s>
            )
        endif()
    elseif(LINUX)
        set_property(TARGET lib::v8 APPEND PROPERTY INTERFACE_LINK_LIBRARIES
            -lrt
            -ldl
            Threads::Threads
        )
   endif()

    macro(v8_copy_deps target)
        add_custom_command(TARGET ${target} POST_BUILD
            COMMAND ${CMAKE_COMMAND} -E copy_if_different
                ${V8_OUTPUT_DIR}/icudtl.dat
                ${V8_OUTPUT_DIR}/natives_blob.bin
                ${V8_OUTPUT_DIR}/snapshot_blob.bin
                    $<TARGET_FILE_DIR:${target}>
        )
    endmacro()
else()
    macro(v8_copy_deps target)
    endmacro()
endif()
