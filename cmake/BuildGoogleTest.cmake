# ***************************************************************************
# *   Copyright 2020 Andreas Wendler                                        *
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

set(GOOGLETEST_PATCH_FILE "${CMAKE_CURRENT_LIST_DIR}/googletest.patch")
ExternalProject_Add(project_googletest
    URL https://www.robotics-erlangen.de/downloads/googletest-release-1.10.0.tar.gz
    URL_HASH SHA256=9f7370ce748fdd7c23a4dcd785d49c45f718899381af947de59b65544b08c7eb
    DOWNLOAD_NO_PROGRESS true
    PATCH_COMMAND cat "${GOOGLETEST_PATCH_FILE}" | patch -p1
    CMAKE_ARGS
        -DCMAKE_TOOLCHAIN_FILE:PATH=${CMAKE_TOOLCHAIN_FILE}
        -DCMAKE_INSTALL_PREFIX:PATH=<INSTALL_DIR>
        -DCMAKE_C_COMPILER:PATH=${CMAKE_C_COMPILER}
        -DCMAKE_CXX_COMPILER:PATH=${CMAKE_CXX_COMPILER}
        -DCMAKE_MAKE_PROGRAM:PATH=${CMAKE_MAKE_PROGRAM}
        -DCMAKE_INSTALL_MESSAGE:STRING=NEVER
        -DBUILD_SHARED_LIBS:BOOL=OFF
        -DLIBTYPE:STRING=STATIC
    BUILD_BYPRODUCTS
    "<INSTALL_DIR>/${CMAKE_INSTALL_LIBDIR}/${CMAKE_STATIC_LIBRARY_PREFIX}gtest${CMAKE_STATIC_LIBRARY_SUFFIX}"
    "<INSTALL_DIR>/${CMAKE_INSTALL_LIBDIR}/${CMAKE_STATIC_LIBRARY_PREFIX}gtest_main${CMAKE_STATIC_LIBRARY_SUFFIX}"
    DOWNLOAD_DIR "${DEPENDENCY_DOWNLOADS}"
)
EPHelper_Add_Cleanup(project_googletest bin include ${CMAKE_INSTALL_LIBDIR} share)
EPHelper_Add_Clobber(project_googletest "${GOOGLETEST_PATCH_FILE}")
EPHelper_Mark_For_Download(project_googletest)

externalproject_get_property(project_googletest install_dir)
set_target_properties(project_googletest PROPERTIES EXCLUDE_FROM_ALL true)

add_library(lib::googletest STATIC IMPORTED)
add_dependencies(lib::googletest project_googletest)

externalproject_get_property(project_googletest install_dir)
file(MAKE_DIRECTORY "${install_dir}/include/")
set_property(TARGET lib::googletest PROPERTY INTERFACE_INCLUDE_DIRECTORIES "${install_dir}/include")
# just select a library
set_property(TARGET lib::googletest PROPERTY IMPORTED_LOCATION
	"${install_dir}/${CMAKE_INSTALL_LIBDIR}/${CMAKE_STATIC_LIBRARY_PREFIX}gtest${CMAKE_STATIC_LIBRARY_SUFFIX}"
)
set_property(TARGET lib::googletest PROPERTY INTERFACE_LINK_LIBRARIES
	"${install_dir}/${CMAKE_INSTALL_LIBDIR}/${CMAKE_STATIC_LIBRARY_PREFIX}gtest_main${CMAKE_STATIC_LIBRARY_SUFFIX}"
)
