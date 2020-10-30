# ***************************************************************************
# *   Copyright 2016 Michael Eischer                                        *
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

configure_file(include/config/config.h.in include/config/config.h)
add_library(config INTERFACE)
target_include_directories(config
    INTERFACE "${CMAKE_CURRENT_BINARY_DIR}/include"
)
target_sources(config
    INTERFACE "${CMAKE_CURRENT_BINARY_DIR}/include/config/config.h"
)
if (RELATIVE_DATA_DIRS)
	target_compile_definitions(config
		INTERFACE RELATIVE_DATA_DIRS
	)
endif()

add_library(shared::config ALIAS config)
