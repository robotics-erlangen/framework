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

set(PROTOBUF_URL  "https://downloads.robotics-erlangen.de/protobuf-v5.29.4.tar.gz")
set(PROTOBUF_HASH "SHA256=25a6659b46ee0b0832b1864fca02a6c37c52271bef4afcea531cdb7f31332cdd")
set(PROTOBUF_CMAKE_ARGS
    -DCMAKE_INSTALL_PREFIX:PATH=<INSTALL_DIR>
    -DCMAKE_MAKE_PROGRAM:PATH=${CMAKE_MAKE_PROGRAM}
    -DCMAKE_INSTALL_MESSAGE:STRING=NEVER
    -DCMAKE_BUILD_TYPE:STRING=Release
    "-DCMAKE_CXX_FLAGS:STRING=${CMAKE_CXX_FLAGS} -w"
    -Dprotobuf_BUILD_TESTS:BOOL=OFF
    -Dprotobuf_BUILD_LIBUPB:BOOL=OFF
    -DCMAKE_CXX_STANDARD=${CMAKE_CXX_STANDARD}
    -DABSL_PROPAGATE_CXX_STD:BOOL=ON
)

set(PROTOBUF_SUBPATH "${CMAKE_INSTALL_LIBDIR}/${CMAKE_STATIC_LIBRARY_PREFIX}protobuf${CMAKE_STATIC_LIBRARY_SUFFIX}")
set(PROTOC_SUBPATH "${CMAKE_INSTALL_BINDIR}/protoc${CMAKE_EXECUTABLE_SUFFIX}")

set(PROTOBUF_PATCH_FILE "${CMAKE_CURRENT_LIST_DIR}/protobuf.patch")

ExternalProject_Add(project_protobuf
    URL "${PROTOBUF_URL}"
    URL_HASH "${PROTOBUF_HASH}"
    DOWNLOAD_NO_PROGRESS true
    PATCH_COMMAND cat "${PROTOBUF_PATCH_FILE}" | patch -p1
    DOWNLOAD_DIR "${DEPENDENCY_DOWNLOADS}"
    CMAKE_ARGS
        -DCMAKE_TOOLCHAIN_FILE:PATH=${CMAKE_TOOLCHAIN_FILE}
        -DCMAKE_C_COMPILER:PATH=${CMAKE_C_COMPILER}
        -DCMAKE_CXX_COMPILER:PATH=${CMAKE_CXX_COMPILER}
        ${PROTOBUF_CMAKE_ARGS}
)

EPHelper_Add_Cleanup(project_protobuf ${CMAKE_INSTALL_LIBDIR} ${CMAKE_INSTALL_BINDIR} ${CMAKE_INSTALL_INCLUDEDIR})
EPHelper_Mark_For_Download(project_protobuf)

externalproject_get_property(project_protobuf install_dir)

include(ProtobufDependencies)
bundle_protobuf_dependencies(protobuf_dependencies PROTOBUF_DEPENDENCIES_BYPRODUCTS)

# the byproducts are available after the install step
ExternalProject_Add_Step(project_protobuf out
    DEPENDEES install
    BYPRODUCTS
        "<INSTALL_DIR>/${PROTOBUF_SUBPATH}"
        "<INSTALL_DIR>/${PROTOC_SUBPATH}"
        ${PROTOBUF_DEPENDENCIES_BYPRODUCTS}
)

set_target_properties(project_protobuf PROPERTIES EXCLUDE_FROM_ALL true)
# cmake enforces that the include directory exists
file(MAKE_DIRECTORY "${install_dir}/include")

set(Protobuf_FOUND             true)
set(Protobuf_VERSION           "3.21.12")
set(Protobuf_INCLUDE_DIR       "${install_dir}/include")
set(Protobuf_INCLUDE_DIRS      "${Protobuf_INCLUDE_DIR}")
set(Protobuf_LIBRARY           "${install_dir}/${PROTOBUF_SUBPATH}")
set(Protobuf_LIBRARIES         "${Protobuf_LIBRARY}")
set(Protobuf_PROTOC_EXECUTABLE "${install_dir}/${PROTOC_SUBPATH}")

# this variable is necessary for cmake to wait until protobuf is built, before
# trying to use protoc to generate the cpp and header files. It is used by the
# protobuf_generate CMake function.
set(protobuf_generate_DEPENDENCIES project_protobuf CACHE INTERNAL "")

# If the user does not have Protobuf installed, the top level FindProtobuf call
# does not create the targets. We thus need to create them here. This would
# also be necessary for CMake < 3.10 but we do not support that anymore.
if(NOT TARGET protobuf::protoc)
    add_executable(protobuf::protoc IMPORTED)
endif()

# Either FindProtobuf didn't find system Protobuf, in which case we need to
# initialize the properties, or it did, in which case it references system
# Protobuf instead of our self built one.
#
# We do not use the created targets directly, but protobuf_generate references
# protobuf::protoc
set_target_properties(protobuf::protoc PROPERTIES
    IMPORTED_LOCATION "${Protobuf_PROTOC_EXECUTABLE}"
)

# Also create an imported target for the library itself. We do not use
# protobuf::libprotobuf since we need a bit of additional setup for
# ExternalProject compatibility (i.e. dependency ordering)
add_library(project_protobuf_import STATIC IMPORTED)
set_target_properties(project_protobuf_import PROPERTIES
    IMPORTED_LOCATION "${Protobuf_LIBRARY}"
    INTERFACE_INCLUDE_DIRECTORIES "${Protobuf_INCLUDE_DIR}"
)
target_link_libraries(project_protobuf_import
    INTERFACE Threads::Threads protobuf_dependencies
)

EPHelper_Add_Interface_Library(PROJECT project_protobuf ALIAS lib::protobuf)

if (MINGW AND CMAKE_CROSSCOMPILING)
    # Overwrites Protobuf_PROTOC_EXECUTABLE, protobuf::protoc and
    # protobuf_generate_DEPENDENCIES
    include(BuildProtocForHost)
endif()

message(STATUS "Building Protobuf ${Protobuf_VERSION}")
