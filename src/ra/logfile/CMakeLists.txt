# ***************************************************************************
# *   Copyright 2014 Alexander Danzer, Michael Eischer                      *
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

if(TARGET protobuf AND QT_FOUND)

include_directories(${PROTOBUF_INCLUDE_DIR})

set(SOURCES
    logfilereader.cpp
    logfilereader.h
    logfilewriter.cpp
    logfilewriter.h
    savesituation.cpp
    savesituation.h
)

add_library(logfile ${SOURCES})
target_link_libraries(logfile protobuf)
qt5_use_modules(logfile Widgets)

endif()
