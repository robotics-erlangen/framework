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
include(ExternalProjectHelper)

set(LIBGIT_SUBPATH "${CMAKE_INSTALL_LIBDIR}/${CMAKE_STATIC_LIBRARY_PREFIX}git2${CMAKE_STATIC_LIBRARY_SUFFIX}")

find_package(OpenSSL REQUIRED)
find_package(PCRE)
find_package(PCRE2)

set(LIBGIT_INCLUDE_LIBS "")
list(APPEND LIBGIT_INCLUDE_LIBS ${OPENSSL_LIBRARIES})
list(APPEND LIBGIT_INCLUDE_LIBS ${PCRE_LIBRARIES})
list(APPEND LIBGIT_INCLUDE_LIBS ${PCRE2_LIBRARIES})
if(WIN32)
	list(APPEND LIBGIT_INCLUDE_LIBS ws2_32)
endif()

ExternalProject_Add(project_libgit2
    URL https://downloads.robotics-erlangen.de/libgitv1.3.0.zip
    URL_HASH SHA256=26bc8d7d04cdc10941a3c0c9dfa1b5b248a2b108154f1b6b4b5054a5bab2646e
    DOWNLOAD_NO_PROGRESS true
    PATCH_COMMAND cat ${CMAKE_CURRENT_LIST_DIR}/libgit.patch | patch -p1
    CMAKE_ARGS
        -DCMAKE_INSTALL_PREFIX:PATH=<INSTALL_DIR>
        -DBUILD_SHARED_LIBS:STRING=OFF
        -DUSE_BUNDLED_ZLIB:STRING=ON
        -DUSE_SSH:STRING=OFF
        -DWINHTTP:STRING=OFF
        -DCMAKE_C_COMPILER:PATH=${CMAKE_C_COMPILER}
        -DCMAKE_BUILD_TYPE:STRING=Release
        -DCMAKE_C_FLAGS:STRING=${CMAKE_C_FLAGS}
    BUILD_BYPRODUCTS
            "<INSTALL_DIR>/${LIBGIT_SUBPATH}"
    DOWNLOAD_DIR "${DEPENDENCY_DOWNLOADS}"
    TEST_COMMAND "<BINARY_DIR>/libgit2_clar" "-xclone::nonetwork" "-xremote::httpproxy::env" "-xrefs::revparse::date" "-xstream::registration::tls"
)

EPHelper_Mark_For_Download(project_libgit2)
EPHelper_Add_Cleanup(project_libgit2 bin include lib share)
EPHelper_Add_Clobber(project_libgit2 ${CMAKE_CURRENT_LIST_DIR}/libgit.patch)

externalproject_get_property(project_libgit2 install_dir)

add_library(lib::git2 UNKNOWN IMPORTED)
add_dependencies(lib::git2 project_libgit2)
# cmake enforces that the include directory exists
file(MAKE_DIRECTORY "${install_dir}/include/")
set_target_properties(lib::git2 PROPERTIES
    IMPORTED_LOCATION "${install_dir}/${LIBGIT_SUBPATH}"
    INTERFACE_LINK_LIBRARIES "${install_dir}/${LIBGIT_SUBPATH};${LIBGIT_INCLUDE_LIBS}"
    INTERFACE_INCLUDE_DIRECTORIES "${install_dir}/include/"
)
