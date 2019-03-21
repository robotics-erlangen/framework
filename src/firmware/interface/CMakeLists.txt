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

add_library(firmware-interface INTERFACE)

target_include_directories(firmware-interface
    INTERFACE include
)
add_library(firmware::interface ALIAS firmware-interface)

target_sources(firmware-interface INTERFACE
    ${CMAKE_CURRENT_LIST_DIR}/include/firmware-interface/radiocommand2018.h
    ${CMAKE_CURRENT_LIST_DIR}/include/firmware-interface/radiocommand2014.h
    ${CMAKE_CURRENT_LIST_DIR}/include/firmware-interface/radiocommand.h
    ${CMAKE_CURRENT_LIST_DIR}/include/firmware-interface/transceiver2012.h
)
