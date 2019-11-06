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

if(MINGW)
    set(LUAJIT_SUBPATH "lib/lua51${CMAKE_SHARED_LIBRARY_SUFFIX}")
	set(LUAJIT_EXTRA_COMMANDS
		COMMAND ${CMAKE_COMMAND} -E copy <BINARY_DIR>/src/lua51.dll <INSTALL_DIR>/${LUAJIT_SUBPATH}
	)
else()
    set(LUAJIT_SUBPATH "lib/${CMAKE_STATIC_LIBRARY_PREFIX}luajit-5.1${CMAKE_STATIC_LIBRARY_SUFFIX}")
	set(LUAJIT_EXTRA_COMMANDS "")
endif()

set(LUAJIT_OSX_TARGET)
if("${CMAKE_OSX_DEPLOYMENT_TARGET}" AND ("${CMAKE_OSX_DEPLOYMENT_TARGET}" VERSION_GREATER_EQUAL 10.14))
	set(LUAJIT_OSX_TARGET "10.14")
endif()
set(LUAJIT_FLAGS "XCFLAGS=-DLUAJIT_ENABLE_LUA52COMPAT" "MACOSX_DEPLOYMENT_TARGET=${LUAJIT_OSX_TARGET}")
set(SPACE_FREE_INSTALL_DIR "${CMAKE_CURRENT_BINARY_DIR}/project_luajit-prefix")
string(REPLACE " " "\\ " SPACE_FREE_INSTALL_DIR "${SPACE_FREE_INSTALL_DIR}")

ExternalProject_Add(project_luajit
    URL http://www.robotics-erlangen.de/downloads/libraries/LuaJIT-2.0.5.tar.gz
    URL_HASH SHA256=874b1f8297c697821f561f9b73b57ffd419ed8f4278c82e05b48806d30c1e979
    DOWNLOAD_NO_PROGRESS true
    BUILD_IN_SOURCE true
    CONFIGURE_COMMAND ""
    BUILD_COMMAND make clean && make amalg ${LUAJIT_FLAGS}
    BUILD_BYPRODUCTS "<INSTALL_DIR>/${LUAJIT_SUBPATH}"
    INSTALL_COMMAND make install ${LUAJIT_FLAGS} PREFIX=${SPACE_FREE_INSTALL_DIR}
	${LUAJIT_EXTRA_COMMANDS}
)
externalproject_get_property(project_luajit install_dir)
ExternalProject_Add_Step(project_luajit cleanup
  COMMAND rm -rf bin include lib share || true
  WORKING_DIRECTORY "${install_dir}"
  COMMENT "Cleanup old install"
  DEPENDEES download
  DEPENDERS configure
)

set_target_properties(project_luajit PROPERTIES EXCLUDE_FROM_ALL true)
add_library(lib::luajit UNKNOWN IMPORTED)
add_dependencies(lib::luajit project_luajit)
# cmake enforces that the include directory exists
file(MAKE_DIRECTORY "${install_dir}/include/luajit-2.0")
set_target_properties(lib::luajit PROPERTIES
    IMPORTED_LOCATION "${install_dir}/${LUAJIT_SUBPATH}"
    INTERFACE_INCLUDE_DIRECTORIES "${install_dir}/include/luajit-2.0"
)

if(APPLE)
  # required by LuaJIT for 64bit
  set_target_properties(lib::luajit PROPERTIES INTERFACE_LINK_LIBRARIES "-pagezero_size 10000 -image_base 100000000")
elseif(UNIX AND NOT APPLE)
  # required for the static library
  set_property(TARGET lib::luajit PROPERTY INTERFACE_LINK_LIBRARIES m dl)
endif()

ExternalProject_Add_StepTargets(project_luajit download)
add_dependencies(download project_luajit-download)
