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
    PATHS
        ${CMAKE_SOURCE_DIR}/libs/v8/v8
)

if(V8_INCLUDE_DIR AND EXISTS "${V8_INCLUDE_DIR}/v8-version.h")
    file(STRINGS "${V8_INCLUDE_DIR}/v8-version.h" V8_VERSION_MAJOR_LINE REGEX "^#define[ \t]+V8_MAJOR_VERSION[ \t]+([0-9]+)$")
    file(STRINGS "${V8_INCLUDE_DIR}/v8-version.h" V8_VERSION_MINOR_LINE REGEX "^#define[ \t]+V8_MINOR_VERSION[ \t]+([0-9]+)$")
    file(STRINGS "${V8_INCLUDE_DIR}/v8-version.h" V8_VERSION_PATCH_LINE REGEX "^#define[ \t]+V8_PATCH_LEVEL[ \t]+([0-9]+)$")
    string(REGEX REPLACE "^#define[ \t]+V8_MAJOR_VERSION[ \t]+([0-9]+)$" "\\1" V8_VERSION_MAJOR "${V8_VERSION_MAJOR_LINE}")
    string(REGEX REPLACE "^#define[ \t]+V8_MINOR_VERSION[ \t]+([0-9]+)$" "\\1" V8_VERSION_MINOR "${V8_VERSION_MINOR_LINE}")
    string(REGEX REPLACE "^#define[ \t]+V8_PATCH_LEVEL[ \t]+([0-9]+)$" "\\1" V8_VERSION_PATCH "${V8_VERSION_PATCH_LINE}")
    set(V8_VERSION ${V8_VERSION_MAJOR}.${V8_VERSION_MINOR}.${V8_VERSION_PATCH})
    unset(V8_VERSION_MAJOR_LINE)
    unset(V8_VERSION_MINOR_LINE)
    unset(V8_VERSION_PATCH_LINE)
    unset(V8_VERSION_MAJOR)
    unset(V8_VERSION_MINOR)
    unset(V8_VERSION_PATCH)
endif()

set(V8_STATIC_LIBRARY_PREFIX ${CMAKE_STATIC_LIBRARY_PREFIX})
set(V8_STATIC_LIBRARY_SUFFIX ${CMAKE_STATIC_LIBRARY_SUFFIX})
if(MINGW)
    set(V8_ARCHITECTURE x86)
else()
    set(V8_ARCHITECTURE x64)
endif()

find_path(V8_OUTPUT_DIR
    NAMES obj/${V8_STATIC_LIBRARY_PREFIX}v8_base${V8_STATIC_LIBRARY_SUFFIX}
    HINTS $ENV{V8_OUTPUT_DIR}
    NO_DEFAULT_PATH
    PATHS
        ${CMAKE_SOURCE_DIR}/libs/v8/v8/out/${V8_ARCHITECTURE}.release
)

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
    V8_OUTPUT_DIR
)

if(V8_FOUND)
    set(V8_LIBRARY_DIR "${V8_OUTPUT_DIR}/obj")
    add_library(lib::v8 UNKNOWN IMPORTED)
    set_target_properties(lib::v8 PROPERTIES
        IMPORTED_LOCATION "${V8_LIBRARY_DIR}/${V8_STATIC_LIBRARY_PREFIX}v8_libbase${V8_STATIC_LIBRARY_SUFFIX}"
        INTERFACE_INCLUDE_DIRECTORIES "${V8_INCLUDE_DIR}"
    )

    if("${CMAKE_CXX_COMPILER_ID}" STREQUAL "GNU")
        set(USING_GCC TRUE)
    else()
        set(USING_GCC FALSE)
    endif()

    if(USING_GCC)
        set_property(TARGET lib::v8 APPEND PROPERTY INTERFACE_LINK_LIBRARIES -Wl,--start-group)
    endif()

    set_property(TARGET lib::v8 APPEND PROPERTY INTERFACE_LINK_LIBRARIES
        ${V8_LIBRARY_DIR}/${V8_STATIC_LIBRARY_PREFIX}v8_base${V8_STATIC_LIBRARY_SUFFIX}
        ${V8_LIBRARY_DIR}/${V8_STATIC_LIBRARY_PREFIX}v8_external_snapshot${V8_STATIC_LIBRARY_SUFFIX}
        ${V8_LIBRARY_DIR}/${V8_STATIC_LIBRARY_PREFIX}v8_libbase${V8_STATIC_LIBRARY_SUFFIX}
        ${V8_LIBRARY_DIR}/${V8_STATIC_LIBRARY_PREFIX}v8_libplatform${V8_STATIC_LIBRARY_SUFFIX}
        ${V8_LIBRARY_DIR}/${V8_STATIC_LIBRARY_PREFIX}v8_libsampler${V8_STATIC_LIBRARY_SUFFIX}
        ${V8_LIBRARY_DIR}/src/inspector/${V8_STATIC_LIBRARY_PREFIX}inspector${V8_STATIC_LIBRARY_SUFFIX}
        ${V8_LIBRARY_DIR}/third_party/icu/${V8_STATIC_LIBRARY_PREFIX}icui18n${V8_STATIC_LIBRARY_SUFFIX}
        ${V8_LIBRARY_DIR}/third_party/icu/${V8_STATIC_LIBRARY_PREFIX}icuuc${V8_STATIC_LIBRARY_SUFFIX}
    )

    if(USING_GCC)
        set_property(TARGET lib::v8 APPEND PROPERTY INTERFACE_LINK_LIBRARIES -Wl,--end-group)
    endif()

    if(MINGW)
        set_property(TARGET lib::v8 APPEND PROPERTY INTERFACE_LINK_LIBRARIES
            -lwinmm
            -ldbghelp
            -lshlwapi
            # strip binary to keep file size below 1,2GB
            -Wl,-s
        )
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
