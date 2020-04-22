# ***************************************************************************
# *   Copyright 2015 Alexander Danzer, Michael Eischer                      *
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

add_library(logfile
    include/logfile/backlogwriter.h
    include/logfile/combinedlogwriter.h
    include/logfile/logfilereader.h
    include/logfile/seqlogfilereader.h
    include/logfile/logfilewriter.h
    include/logfile/statussource.h
    include/logfile/visionlogliveconverter.h
    include/logfile/logfilehasher.h
    include/logfile/bufferedstatussource.h
    include/logfile/timedstatussource.h

    backlogwriter.cpp
    combinedlogwriter.cpp
    logfilereader.cpp
    seqlogfilereader.cpp
    logfilewriter.cpp
    visionlogliveconverter.cpp
    logfilehasher.cpp
    bufferedstatussource.cpp
    timedstatussource.cpp
)
target_link_libraries(logfile
    PUBLIC shared::protobuf
    PUBLIC shared::core
    PUBLIC amun::processor
    PUBLIC visionlog
)
target_include_directories(logfile
    INTERFACE include
    PRIVATE include/logfile
)

add_library(ra::logfile ALIAS logfile)
