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

if (${CMAKE_VERSION} VERSION_GREATER 2.8.13)
	add_library(firmware-interface INTERFACE)
else()
	file(WRITE "${CMAKE_CURRENT_BINARY_DIR}/dummy.cpp" "\n")
	add_library(firmware-interface "${CMAKE_CURRENT_BINARY_DIR}/dummy.cpp")
endif()

target_include_directories(firmware-interface
    INTERFACE include
)
add_library(firmware::interface ALIAS firmware-interface)

if (${CMAKE_VERSION} VERSION_GREATER 3.0.4)
    target_sources(firmware-interface INTERFACE
        ${CMAKE_CURRENT_LIST_DIR}/include/firmware-interface/radiocommand2012.h
        ${CMAKE_CURRENT_LIST_DIR}/include/firmware-interface/radiocommand2014.h
        ${CMAKE_CURRENT_LIST_DIR}/include/firmware-interface/radiocommand.h
        ${CMAKE_CURRENT_LIST_DIR}/include/firmware-interface/transceiver2012.h
    )
endif()
