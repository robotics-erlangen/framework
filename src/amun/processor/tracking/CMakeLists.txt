# ***************************************************************************
# *   Copyright 2014 Michael Eischer, Philipp Nordhus                       *
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

if(TARGET core AND TARGET protobuf)

include_directories(${PROTOBUF_INCLUDE_DIR})
include_directories(${EIGEN_INCLUDE_DIR})

set(SOURCES
    ballfilter.cpp
    ballfilter.h
    filter.cpp
    filter.h
    kalmanfilter.h
    robotfilter.cpp
    robotfilter.h
    tracker.cpp
    tracker.h
)

add_library(tracking ${SOURCES})
target_link_libraries(tracking core protobuf)
add_dependencies(tracking eigen)
qt5_use_modules(tracking Core)

endif()
