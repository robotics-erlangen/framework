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

if(POLICY CMP0058) # exists since cmake 3.3
    set(BULLET_BUILD_BYPRODUCTS
        "<INSTALL_DIR>/lib/${CMAKE_STATIC_LIBRARY_PREFIX}BulletDynamics${CMAKE_STATIC_LIBRARY_SUFFIX}"
        "<INSTALL_DIR>/lib/${CMAKE_STATIC_LIBRARY_PREFIX}BulletCollision${CMAKE_STATIC_LIBRARY_SUFFIX}"
        "<INSTALL_DIR>/lib/${CMAKE_STATIC_LIBRARY_PREFIX}LinearMath${CMAKE_STATIC_LIBRARY_SUFFIX}"
    )
else()
    set(BULLET_BUILD_BYPRODUCTS "")
endif()

ExternalProject_Add(project_bullet
    URL http://www.robotics-erlangen.de/downloads/libraries/bullet3-2.83.6.tar.gz
    URL_MD5 44cb2464336a2082b2c144194c2a2668
    CMAKE_ARGS
        -DCMAKE_INSTALL_PREFIX:PATH=<INSTALL_DIR>
        -DCMAKE_C_COMPILER:PATH=${CMAKE_C_COMPILER}
        -DCMAKE_CXX_COMPILER:PATH=${CMAKE_CXX_COMPILER}
        -DCMAKE_MAKE_PROGRAM:PATH=${CMAKE_MAKE_PROGRAM}
        -DCMAKE_BUILD_TYPE:STRING=${CMAKE_BUILD_TYPE}
        -DCMAKE_INSTALL_MESSAGE:STRING=NEVER
        -DBUILD_BULLET2_DEMOS:BOOL=OFF
        -DBUILD_BULLET3:BOOL=OFF
        -DBUILD_CPU_DEMOS:BOOL=OFF
        -DBUILD_EXTRAS:BOOL=OFF
        -DBUILD_OPENGL3_DEMOS:BOOL=OFF
        -DUSE_GLUT:BOOL=OFF
        -DUSE_GRAPHICAL_BENCHMARK:BOOL=OFF
        -DINSTALL_LIBS:BOOL=ON
    BUILD_BYPRODUCTS ${BULLET_BUILD_BYPRODUCTS}
)

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
set_property(TARGET lib::bullet PROPERTY IMPORTED_LINK_INTERFACE_LIBRARIES
    "${install_dir}/lib/${CMAKE_STATIC_LIBRARY_PREFIX}BulletCollision${CMAKE_STATIC_LIBRARY_SUFFIX}"
    "${install_dir}/lib/${CMAKE_STATIC_LIBRARY_PREFIX}LinearMath${CMAKE_STATIC_LIBRARY_SUFFIX}"
)
