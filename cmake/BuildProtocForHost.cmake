# ***************************************************************************
# *   Copyright 2025 Michel Schmid, Paul Bergmann                           *
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

if (NOT CMAKE_C_HOST_COMPILER OR NOT CMAKE_CXX_HOST_COMPILER)
    message(FATAL_ERROR "When building protobuf during cross compilation the CMAKE_C_HOST_COMPILER and CMAKE_CXX_HOST_COMPILER variables \
                        need to be set as arguments to the cmake call, because protoc needs to be built for the host machine and the mxe toolchain \
                        does not set these variables correctly. e.g.:
                        \$MXE_ROOT_DIR/usr/bin/x86_64-w64-mingw32.static-cmake CMAKE_C_HOST_COMPILER=gcc CMAKE_CXX_HOST_COMPILER=g++ ..")
endif()

set(_host_protoc_subpath "${CMAKE_INSTALL_BINDIR}/protoc")

# compile the protoc for the HOST system
ExternalProject_Add(project_protobuf_host
    URL "${PROTOBUF_URL}"
    URL_HASH "${PROTOBUF_HASH}"
    DOWNLOAD_NO_PROGRESS true
    PATCH_COMMAND cat "${PROTOBUF_PATCH_FILE}" | patch -p1
    DOWNLOAD_DIR "${DEPENDENCY_DOWNLOADS}"
    CMAKE_ARGS
        -DCMAKE_C_COMPILER:PATH=${CMAKE_C_HOST_COMPILER}
        -DCMAKE_CXX_COMPILER:PATH=${CMAKE_CXX_HOST_COMPILER}
        ${PROTOBUF_CMAKE_ARGS}
)

EPHelper_Add_Cleanup(project_protobuf_host ${CMAKE_INSTALL_LIBDIR} ${CMAKE_INSTALL_BINDIR} ${CMAKE_INSTALL_INCLUDEDIR})
EPHelper_Mark_For_Download(project_protobuf_host)

# the byproducts are available after the install step
ExternalProject_Add_Step(project_protobuf_host out
    DEPENDEES install
    BYPRODUCTS
        "<INSTALL_DIR>/${_host_protoc_subpath}"
)

add_dependencies(project_protobuf project_protobuf_host)

# Use function to create a new CMake variable scope, in order not to overwrite
# install_dir. This script is included by BuildProtobuf.cmake, which uses that
# variable, so overwriting it would be unexpected.
function(_get_host_protoc_path return_var)
    ExternalProject_Get_Property(project_protobuf_host install_dir)
    set(${return_var} "${install_dir}/${_host_protoc_subpath}" PARENT_SCOPE)
endfunction()

_get_host_protoc_path(_host_protoc_fullpath)

# Patch variables and targets used by the rest of the build system
set(Protobuf_PROTOC_EXECUTABLE "${_host_protoc_fullpath}")
set_target_properties(protobuf::protoc PROPERTIES IMPORTED_LOCATION "${_host_protoc_fullpath}")

set(protobuf_generate_DEPENDENCIES project_protobuf_host CACHE INTERNAL "")
