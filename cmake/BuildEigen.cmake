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

ExternalProject_Add(project_eigen
    URL http://www.robotics-erlangen.de/downloads/libraries/eigen-3.3.3-67e894c6cd8f.tar.bz2
    URL_MD5 b2ddade41040d9cf73b39b4b51e8775b
    DOWNLOAD_NO_PROGRESS true
    BINARY_DIR "${CMAKE_CURRENT_BINARY_DIR}/project_eigen-prefix/build"
    CMAKE_ARGS
        -DCMAKE_INSTALL_PREFIX:PATH=<INSTALL_DIR>
        -DCMAKE_C_COMPILER:PATH=${CMAKE_C_COMPILER}
        -DCMAKE_CXX_COMPILER:PATH=${CMAKE_CXX_COMPILER}
        -DCMAKE_MAKE_PROGRAM:PATH=${CMAKE_MAKE_PROGRAM}
        -DCMAKE_INSTALL_MESSAGE:STRING=NEVER
)
externalproject_get_property(project_eigen install_dir)
set_target_properties(project_eigen PROPERTIES EXCLUDE_FROM_ALL true)
add_library(eigen INTERFACE)

target_compile_options(eigen INTERFACE -Wno-deprecated-declarations)
add_dependencies(eigen project_eigen)
target_include_directories(eigen INTERFACE "${install_dir}/include/eigen3")
add_library(lib::eigen ALIAS eigen)
