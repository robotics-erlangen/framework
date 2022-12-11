# ***************************************************************************
# *   Copyright 2020 Andreas Wendler                                        *
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

add_executable(cpptests
    core/vector.cpp
    core/rng.cpp
    core/run_out_of_scope.cpp
    core/coordinates.cpp
    amun/strategy/path/boundingbox.cpp
    amun/strategy/path/speedprofile.cpp
    amun/strategy/path/linesegment.cpp
    amun/strategy/path/obstacles.cpp
    amun/strategy/path/endinobstaclesampler.cpp
    amun/strategy/path/escapeobstaclesampler.cpp
    amun/strategy/path/trajectorypath.cpp
    amun/amun.cpp
    amun/seshat/combinedlogwriter.cpp
    amun/seshat/logfilereader.cpp
    amun/simulator/simulator.cpp
    amun/processor/tracking/ballgroundcollisionfilter.cpp
)

target_compile_definitions(cpptests PRIVATE AMUNCLI_DIR="${CMAKE_RUNTIME_OUTPUT_DIRECTORY}")

target_link_libraries(cpptests
    lib::googletest
    amun::amun
    amun::path
    shared::core
    shared::config
    amun::seshat
    amun::simulator
    amun::tracking
    amuncli::testtools
    visionlog
    pthread
    Qt5::Gui
)
