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
set(PROTOC_SUBPATH "${CMAKE_INSTALL_BINDIR}/protoc${CMAKE_EXECUTABLE_SUFFIX}")

ExternalProject_Add(project_protobuf
    URL http://downloads.robotics-erlangen.de/protobuf-cpp-3.21.12.tar.gz
    URL_HASH SHA256=4eab9b524aa5913c6fffb20b2a8abf5ef7f95a80bc0701f3a6dbb4c607f73460
    DOWNLOAD_NO_PROGRESS true
    DOWNLOAD_DIR "${DEPENDENCY_DOWNLOADS}"
    CMAKE_ARGS
        -DCMAKE_INSTALL_PREFIX:PATH=<INSTALL_DIR>
        -DCMAKE_TOOLCHAIN_FILE:PATH=${CMAKE_TOOLCHAIN_FILE}
        -DCMAKE_C_COMPILER:PATH=${CMAKE_C_COMPILER}
        -DCMAKE_CXX_COMPILER:PATH=${CMAKE_CXX_COMPILER}
        -DCMAKE_MAKE_PROGRAM:PATH=${CMAKE_MAKE_PROGRAM}
        -DCMAKE_INSTALL_MESSAGE:STRING=NEVER
        -DCMAKE_BUILD_TYPE:STRING=Release
        "-DCMAKE_CXX_FLAGS:STRING=${CMAKE_CXX_FLAGS} -w"
        -Dprotobuf_BUILD_TESTS:BOOL=OFF
)

EPHelper_Add_Cleanup(project_protobuf ${CMAKE_INSTALL_LIBDIR} ${CMAKE_INSTALL_BINDIR} ${CMAKE_INSTALL_INCLUDEDIR})
EPHelper_Mark_For_Download(project_protobuf)

# the byproducts are available after the install step
ExternalProject_Add_Step(project_protobuf out
    DEPENDEES install
    BYPRODUCTS
        "<INSTALL_DIR>/${PROTOBUF_SUBPATH}"
        "<INSTALL_DIR>/${PROTOC_SUBPATH}"
)

externalproject_get_property(project_protobuf install_dir)
set_target_properties(project_protobuf PROPERTIES EXCLUDE_FROM_ALL true)
# cmake enforces that the include directory exists
file(MAKE_DIRECTORY "${install_dir}/include")

set(PROTOBUF_FOUND true)
set(PROTOBUF_VERSION "3.21.12")
set(PROTOBUF_INCLUDE_DIR "${install_dir}/include")
set(PROTOBUF_INCLUDE_DIRS "${PROTOBUF_INCLUDE_DIR}")
set(PROTOBUF_LIBRARY "${install_dir}/${PROTOBUF_SUBPATH}")
set(PROTOBUF_LIBRARIES "${PROTOBUF_LIBRARY}")
set(PROTOBUF_PROTOC_EXECUTABLE "${install_dir}/${PROTOC_SUBPATH}")
set(Protobuf_PROTOC_EXECUTABLE "${install_dir}/${PROTOC_SUBPATH}")
# this variable is necessary for cmake to wait until protobuf is built,
# before trying to use protoc to generate the cpp and header files
set(protobuf_generate_DEPENDENCIES project_protobuf CACHE TARGET "" FORCE)
# compatibility with cmake 3.10
if(NOT TARGET protobuf::protoc)
    # avoid error if target was already created for an older version
    add_executable(protobuf::protoc IMPORTED)
endif()
set_target_properties(protobuf::protoc PROPERTIES
    IMPORTED_LOCATION "${Protobuf_PROTOC_EXECUTABLE}"
)

message(STATUS "Building protobuf ${PROTOBUF_VERSION}")
