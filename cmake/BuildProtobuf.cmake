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

set(PROTOBUF_SUBPATH "${CMAKE_INSTALL_LIBDIR}/${CMAKE_STATIC_LIBRARY_PREFIX}protobuf${CMAKE_STATIC_LIBRARY_SUFFIX}")
set(PROTOC_SUBPATH "bin/protoc${CMAKE_EXECUTABLE_SUFFIX}")

ExternalProject_Add(project_protobuf
    URL http://www.robotics-erlangen.de/downloads/libraries/protobuf-cpp-3.6.1.tar.gz
    URL_HASH SHA256=b3732e471a9bb7950f090fd0457ebd2536a9ba0891b7f3785919c654fe2a2529
    DOWNLOAD_NO_PROGRESS true
    PATCH_COMMAND cp ${CMAKE_CURRENT_LIST_DIR}/protobuf.CMakeLists.txt CMakeLists.txt
    DOWNLOAD_DIR "${DEPENDENCY_DOWNLOADS}"
    CMAKE_ARGS
        -DCMAKE_INSTALL_PREFIX:PATH=<INSTALL_DIR>
        -DCMAKE_TOOLCHAIN_FILE:PATH=${CMAKE_TOOLCHAIN_FILE}
        -DCMAKE_C_COMPILER:PATH=${CMAKE_C_COMPILER}
        -DCMAKE_CXX_COMPILER:PATH=${CMAKE_CXX_COMPILER}
        -DCMAKE_MAKE_PROGRAM:PATH=${CMAKE_MAKE_PROGRAM}
        -DCMAKE_INSTALL_MESSAGE:STRING=NEVER
        -DCMAKE_BUILD_TYPE:STRING=Release
        -DCMAKE_CXX_FLAGS:STRING=-std=gnu++11
        # the tests fail to build :-(
        -Dprotobuf_BUILD_TESTS:BOOL=OFF
    STEP_TARGETS install
)
# the byproducts are available after the install step
ExternalProject_Add_Step(project_protobuf out
    DEPENDEES install
    BYPRODUCTS
        "<INSTALL_DIR>/${PROTOBUF_SUBPATH}"
        "<INSTALL_DIR>/${PROTOC_SUBPATH}"
)
EPHelper_Mark_For_Download(project_protobuf)

externalproject_get_property(project_protobuf install_dir)
set_target_properties(project_protobuf PROPERTIES EXCLUDE_FROM_ALL true)
# cmake enforces that the include directory exists
file(MAKE_DIRECTORY "${install_dir}/include")

set(PROTOBUF_FOUND true)
set(PROTOBUF_VERSION "3.6.1")
set(PROTOBUF_INCLUDE_DIR "${install_dir}/include")
set(PROTOBUF_INCLUDE_DIRS "${PROTOBUF_INCLUDE_DIR}")
set(PROTOBUF_LIBRARY "${install_dir}/${PROTOBUF_SUBPATH}")
set(PROTOBUF_LIBRARIES "${PROTOBUF_LIBRARY}")
set(PROTOBUF_PROTOC_EXECUTABLE "${install_dir}/${PROTOC_SUBPATH}")
set(Protobuf_PROTOC_EXECUTABLE "${install_dir}/${PROTOC_SUBPATH}")
# compatibility with cmake 3.10
if(NOT TARGET protobuf::protoc)
    # avoid error if target was already created for an older version
    add_executable(protobuf::protoc IMPORTED)
endif()
set_target_properties(protobuf::protoc PROPERTIES
    IMPORTED_LOCATION "${Protobuf_PROTOC_EXECUTABLE}"
)

message(STATUS "Building protobuf ${PROTOBUF_VERSION}")
