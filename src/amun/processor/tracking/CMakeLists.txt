# ***************************************************************************
# *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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

add_library(tracking STATIC
    include/tracking/latency.h
    include/tracking/tracker.h
    include/tracking/visionframetime.h
    include/tracking/visionprocessingtime.h
    include/tracking/worldparameters.h

    abstractballfilter.h
    balltracker.cpp
    balltracker.h
    ballflyfilter.h
    ballflyfilter.cpp
    ballgroundcollisionfilter.h
    ballgroundcollisionfilter.cpp
    ballgroundfilter.h
    ballgroundfilter.cpp
    filter.cpp
    filter.h
    filterdebugger.h
    kalmanfilter.h
    robotfilter.cpp
    robotfilter.h
    tracker.cpp
    visionframetime.cpp
    visionprocessingtime.cpp
    worldparameters.cpp
)
target_link_libraries(tracking
    PRIVATE lib::eigen
    PUBLIC shared::core
    PUBLIC shared::protobuf
    PUBLIC Qt5::Core
)
target_include_directories(tracking
    INTERFACE include
    PRIVATE include/tracking
)

if (TRACKING_DEBUG)
    target_compile_definitions(tracking PRIVATE ENABLE_TRACKING_DEBUG)
endif()

add_library(amun::tracking ALIAS tracking)
