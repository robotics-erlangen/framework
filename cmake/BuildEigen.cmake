# ***************************************************************************
# *   Copyright 2016 Michael Eischer, Philipp Nordhus                       *
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

ExternalProject_Add(project_eigen
    URL https://downloads.robotics-erlangen.de/eigen-3.4.0.tar.bz2
    URL_HASH SHA256=b4c198460eba6f28d34894e3a5710998818515104d6e74e5cc331ce31e46e626
    DOWNLOAD_NO_PROGRESS true
    BINARY_DIR "${CMAKE_CURRENT_BINARY_DIR}/project_eigen-prefix/build"
    CMAKE_ARGS
        -DCMAKE_INSTALL_PREFIX:PATH=<INSTALL_DIR>
        -DCMAKE_TOOLCHAIN_FILE:PATH=${CMAKE_TOOLCHAIN_FILE}
        -DCMAKE_C_COMPILER:PATH=${CMAKE_C_COMPILER}
        -DCMAKE_CXX_COMPILER:PATH=${CMAKE_CXX_COMPILER}
        -DCMAKE_MAKE_PROGRAM:PATH=${CMAKE_MAKE_PROGRAM}
        -DCMAKE_INSTALL_MESSAGE:STRING=NEVER
    DOWNLOAD_DIR ${DEPENDENCY_DOWNLOADS}
)
EPHelper_Add_Cleanup(project_eigen bin include lib share)
EPHelper_Add_Clobber(project_eigen ${CMAKE_CURRENT_LIST_DIR}/stub.patch)
EPHelper_Mark_For_Download(project_eigen)

externalproject_get_property(project_eigen install_dir)
set_target_properties(project_eigen PROPERTIES EXCLUDE_FROM_ALL true)
add_library(eigen INTERFACE)

target_compile_options(eigen INTERFACE -Wno-deprecated-declarations)
add_dependencies(eigen project_eigen)
target_include_directories(eigen INTERFACE "${install_dir}/include/eigen3")
add_library(lib::eigen ALIAS eigen)
