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

add_library(timeline STATIC
    include/timeline/timelinewriter.h
    include/timeline/timelinereader.h

    timelinewriter.cpp
    timelinereader.cpp
)

target_include_directories(timeline
    INTERFACE include
    PRIVATE include/timeline
)

target_link_libraries(timeline
    PRIVATE Qt5::Core
    PRIVATE amun::seshat
)

add_library(timeline::timeline ALIAS timeline)
