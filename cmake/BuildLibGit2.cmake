# ***************************************************************************
# *   Copyright 2018 Tobias Heineken                                        *
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

set(LIBGIT_SUBPATH "lib/${CMAKE_STATIC_LIBRARY_PREFIX}git2${CMAKE_STATIC_LIBRARY_SUFFIX}")

find_package(OpenSSL REQUIRED)
find_package(CURL REQUIRED)
ExternalProject_Add(project_libgit2
    URL https://github.com/libgit2/libgit2/archive/v0.27.5.tar.gz
    DOWNLOAD_NO_PROGRESS true
    CMAKE_ARGS
        -DCMAKE_INSTALL_PREFIX:PATH=<INSTALL_DIR>
        -DBUILD_SHARED_LIBS:STRING=OFF
        -DUSE_EXT_HTTP_PARSER:STRING=OFF
        -DUSE_BUNDLED_ZLIB:STRING=ON
        -DUSE_SSH:STRING=OFF
        -DSHA1_BACKEND:STRING=OpenSSL
        -DCMAKE_C_COMPILER:PATH=${CMAKE_C_COMPILER}
        -DCMAKE_BUILD_TYPE:STRING=Release
    BUILD_BYPRODUCTS
            "<INSTALL_DIR>/${LIBGIT_SUBPATH}"
)

externalproject_get_property(project_libgit2 install_dir)

add_library(lib::git2 UNKNOWN IMPORTED)
add_dependencies(lib::git2 project_libgit2)
# cmake enforces that the include directory exists
file(MAKE_DIRECTORY "${install_dir}/include/git-2.0")
set_target_properties(lib::git2 PROPERTIES
    IMPORTED_LOCATION "${install_dir}/${LIBGIT_SUBPATH}"
    INTERFACE_LINK_LIBRARIES "${install_dir}/${LIBGIT_SUBPATH};${OPENSSL_LIBRARIES};${CURL_LIBRARIES};${LIBSSH2_LIBRARIES}"
    INTERFACE_INCLUDE_DIRECTORIES "${install_dir}/include/git-2.0"
)
