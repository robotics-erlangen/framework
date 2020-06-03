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

ExternalProject_Add(project_googletest
    URL https://github.com/google/googletest/archive/release-1.10.0.zip
    DOWNLOAD_NO_PROGRESS true
    CMAKE_ARGS
        -DCMAKE_INSTALL_PREFIX:PATH=<INSTALL_DIR>
        -DCMAKE_C_COMPILER:PATH=${CMAKE_C_COMPILER}
        -DCMAKE_CXX_COMPILER:PATH=${CMAKE_CXX_COMPILER}
        -DCMAKE_MAKE_PROGRAM:PATH=${CMAKE_MAKE_PROGRAM}
        -DCMAKE_INSTALL_MESSAGE:STRING=NEVER
    BUILD_BYPRODUCTS
        "<INSTALL_DIR>/lib/${CMAKE_STATIC_LIBRARY_PREFIX}gtest${CMAKE_STATIC_LIBRARY_SUFFIX}"
        "<INSTALL_DIR>/lib/${CMAKE_STATIC_LIBRARY_PREFIX}gtest_main${CMAKE_STATIC_LIBRARY_SUFFIX}"
)
EPHelper_Add_Cleanup(project_googletest bin include lib share)
EPHelper_Add_Clobber(project_googletest ${CMAKE_CURRENT_LIST_DIR}/stub.patch)
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
    "${install_dir}/lib/${CMAKE_STATIC_LIBRARY_PREFIX}gtest${CMAKE_STATIC_LIBRARY_SUFFIX}"
)
set_property(TARGET lib::googletest PROPERTY INTERFACE_LINK_LIBRARIES
    "${install_dir}/lib/${CMAKE_STATIC_LIBRARY_PREFIX}gtest_main${CMAKE_STATIC_LIBRARY_SUFFIX}"
)
