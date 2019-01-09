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

set(LIBSM_SUBPATH "bin/${CMAKE_STATIC_LIBRARY_PREFIX}SourceMap${CMAKE_STATIC_LIBRARY_SUFFIX}")
find_package(Qt5 COMPONENTS Core REQUIRED)

ExternalProject_Add(project_sourcemap
    # from https://github.com/hicknhack-software/SourceMap-Qt.git
    URL http://www.robotics-erlangen.de/downloads/libraries/SourceMap-Qt-1.0.1.tar.gz
    URL_HASH SHA256=833ca5e1efa6f58ed69188c5cff1a9aaf493bd50785bc220ff200bc7c717ce3f
    DOWNLOAD_NO_PROGRESS true
    CONFIGURE_COMMAND ${Qt5Core_QMAKE_EXECUTABLE} "CONFIG+=NoTest" <SOURCE_DIR>
    BUILD_BYPRODUCTS
        "<BINARY_DIR>/${LIBSM_SUBPATH}"
    INSTALL_COMMAND ""
)

externalproject_get_property(project_sourcemap binary_dir source_dir)

# cmake enforces that the include directory exists
file(MAKE_DIRECTORY "${source_dir}/src")
add_library(lib::sourcemap UNKNOWN IMPORTED)
add_dependencies(lib::sourcemap project_sourcemap)
set_target_properties(lib::sourcemap PROPERTIES
    IMPORTED_LOCATION "${binary_dir}/${LIBSM_SUBPATH}"
    INTERFACE_LINK_LIBRARIES "Qt5::Core"
    INTERFACE_INCLUDE_DIRECTORIES "${source_dir}/src"
)
