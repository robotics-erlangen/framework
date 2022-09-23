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

set(BULLET_PATCH_FILE ${CMAKE_CURRENT_LIST_DIR}/bullet.patch)
ExternalProject_Add(project_bullet
    URL http://www.robotics-erlangen.de/downloads/libraries/bullet3-2.83.6.tar.gz
    URL_HASH SHA256=dcd5448f31ded71c7bd22fddd7d816ac590ae7b97e1fdda8d1253f8ff3655571
    DOWNLOAD_NO_PROGRESS true
    PATCH_COMMAND cat ${BULLET_PATCH_FILE} | patch -p1
    CMAKE_ARGS
        -DCMAKE_TOOLCHAIN_FILE:PATH=${CMAKE_TOOLCHAIN_FILE}
        -DCMAKE_INSTALL_PREFIX:PATH=<INSTALL_DIR>
        -DCMAKE_C_COMPILER:PATH=${CMAKE_C_COMPILER}
        -DCMAKE_CXX_COMPILER:PATH=${CMAKE_CXX_COMPILER}
        -DCMAKE_MAKE_PROGRAM:PATH=${CMAKE_MAKE_PROGRAM}
        -DCMAKE_BUILD_TYPE:STRING=${CMAKE_BUILD_TYPE}
        -DCMAKE_DEBUG_POSTFIX:STRING=
        -DCMAKE_MINSIZEREL_POSTFIX:STRING=
        -DCMAKE_RELWITHDEBINFO_POSTFIX:STRING=
        -DCMAKE_INSTALL_MESSAGE:STRING=NEVER
        -DBUILD_BULLET2_DEMOS:BOOL=OFF
        -DBUILD_BULLET3:BOOL=OFF
        -DBUILD_CPU_DEMOS:BOOL=OFF
        -DBUILD_EXTRAS:BOOL=OFF
        -DBUILD_OPENGL3_DEMOS:BOOL=OFF
        -DUSE_GLUT:BOOL=OFF
        -DUSE_GRAPHICAL_BENCHMARK:BOOL=OFF
        -DINSTALL_LIBS:BOOL=ON
        -DBUILD_SHARED_LIBS:BOOL=OFF
        -DLIBTYPE:STRING=STATIC
    BUILD_BYPRODUCTS
        "<INSTALL_DIR>/lib/${CMAKE_STATIC_LIBRARY_PREFIX}BulletDynamics${CMAKE_STATIC_LIBRARY_SUFFIX}"
        "<INSTALL_DIR>/lib/${CMAKE_STATIC_LIBRARY_PREFIX}BulletCollision${CMAKE_STATIC_LIBRARY_SUFFIX}"
        "<INSTALL_DIR>/lib/${CMAKE_STATIC_LIBRARY_PREFIX}LinearMath${CMAKE_STATIC_LIBRARY_SUFFIX}"
    DOWNLOAD_DIR "${DEPENDENCY_DOWNLOADS}"
)
EPHelper_Add_Cleanup(project_bullet bin include lib share)
EPHelper_Add_Clobber(project_bullet ${BULLET_PATCH_FILE})
EPHelper_Mark_For_Download(project_bullet)

externalproject_get_property(project_bullet install_dir)
set_target_properties(project_bullet PROPERTIES EXCLUDE_FROM_ALL true)
add_library(lib::bullet STATIC IMPORTED)
add_dependencies(lib::bullet project_bullet)
# cmake enforces that the include directory exists
file(MAKE_DIRECTORY "${install_dir}/include/bullet")
set_property(TARGET lib::bullet PROPERTY INTERFACE_INCLUDE_DIRECTORIES "${install_dir}/include/bullet")
# just select a library
set_property(TARGET lib::bullet PROPERTY IMPORTED_LOCATION
    "${install_dir}/lib/${CMAKE_STATIC_LIBRARY_PREFIX}BulletDynamics${CMAKE_STATIC_LIBRARY_SUFFIX}"
)
set_property(TARGET lib::bullet PROPERTY INTERFACE_LINK_LIBRARIES
    "${install_dir}/lib/${CMAKE_STATIC_LIBRARY_PREFIX}BulletCollision${CMAKE_STATIC_LIBRARY_SUFFIX}"
    "${install_dir}/lib/${CMAKE_STATIC_LIBRARY_PREFIX}LinearMath${CMAKE_STATIC_LIBRARY_SUFFIX}"
)
