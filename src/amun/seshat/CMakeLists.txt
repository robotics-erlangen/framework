# ***************************************************************************
# *   Copyright 2020 Alexander Danzer, Michael Eischer, Tobias Heineken     *
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

add_library(seshat STATIC
    include/seshat/seshat.h
    seshat.cpp

    include/seshat/backlogwriter.h
    include/seshat/combinedlogwriter.h
    include/seshat/logfilereader.h
    include/seshat/seqlogfilereader.h
    include/seshat/logfilewriter.h
    include/seshat/statussource.h
    include/seshat/visionlogliveconverter.h
    include/seshat/logfilehasher.h
    include/seshat/bufferedstatussource.h
    include/seshat/timedstatussource.h
    include/seshat/visionconverter.h

    backlogwriter.cpp
    combinedlogwriter.cpp
    logfilereader.cpp
    seqlogfilereader.cpp
    logfilewriter.cpp
    visionlogliveconverter.cpp
    logfilehasher.cpp
    bufferedstatussource.cpp
    timedstatussource.cpp
    visionconverter.cpp
    logfilefinder.cpp
    logfilefinder.h
    longlivingstatuscache.cpp
    longlivingstatuscache.h
)

target_link_libraries(seshat
    PUBLIC shared::protobuf
    PUBLIC shared::core
    PUBLIC amun::processor
    PUBLIC Qt5::Core
    PUBLIC visionlog
)

target_include_directories(seshat
    INTERFACE include
    PRIVATE include/seshat
    PRIVATE "${CMAKE_CURRENT_BINARY_DIR}"
    PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}"
)

add_library(amun::seshat ALIAS seshat)
