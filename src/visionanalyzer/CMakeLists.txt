# ***************************************************************************
# *   Copyright 2017 Alexander Danzer                                       *
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


include_directories(${CMAKE_CURRENT_SOURCE_DIR}/../amun/processor/tracking)
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/../amun/processor/tracking/include/tracking)

set(SOURCES
   visionanalyzer.cpp
   visionlogreader.cpp
   visionlogreader.h
   miniprocessor.cpp
   miniprocessor.h
   ../amun/processor/referee.h
   ../amun/processor/tracking/ballcollisionfilter.cpp
   ../amun/processor/tracking/ballflyfilter.cpp
   ../amun/processor/tracking/ballgroundfilter.cpp
   ../amun/processor/tracking/balltracker.cpp
   ../amun/processor/tracking/filter.cpp
   ../amun/processor/tracking/quadraticleastsquaresfitter.cpp
   ../amun/processor/tracking/robotfilter.cpp
   ../amun/processor/tracking/tracker.cpp
)

add_executable(visionanalyzer ${SOURCES} ${UIC_SOURCES})
target_link_libraries(visionanalyzer
    PRIVATE shared::core
    PRIVATE ra::logfile
    PRIVATE lib::eigen
    PRIVATE amun::strategy
    PRIVATE amun::processor
    PRIVATE shared::protobuf
    PUBLIC Qt5::Core
)
target_include_directories(visionanalyzer
    PRIVATE "${CMAKE_CURRENT_BINARY_DIR}"
    PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}"
)
target_compile_options(visionanalyzer
    PRIVATE "-DENABLE_TRACKING_DEBUG"
)
if (JEMALLOC_FOUND)
    target_link_libraries(visionanalyzer PRIVATE lib::jemalloc)
endif(JEMALLOC_FOUND)

