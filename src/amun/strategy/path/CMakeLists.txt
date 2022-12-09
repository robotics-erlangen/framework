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


#add_compile_definitions(PATHFINDING_DEBUG)

set(path_files
    include/path/alphatimetrajectory.h
    include/path/abstractpath.h
    include/path/boundingbox.h
    include/path/kdtree.h
    include/path/linesegment.h
    include/path/path.h
    include/path/trajectorypath.h
    include/path/obstacles.h
    include/path/worldinformation.h
    include/path/trajectorysampler.h
    include/path/endinobstaclesampler.h
    include/path/escapeobstaclesampler.h
    include/path/standardsampler.h
    include/path/pathdebug.h
    include/path/speedprofile.h
    include/path/multiescapesampler.h
    include/path/parameterization.h
    include/path/trajectoryinput.h
    include/path/accelerationprofile.h

    abstractpath.cpp
    alphatimetrajectory.cpp
    kdtree.cpp
    path.cpp
    trajectorypath.cpp
    obstacles.cpp
    worldinformation.cpp
    endinobstaclesampler.cpp
    escapeobstaclesampler.cpp
    standardsampler.cpp
    pathdebug.cpp
    speedprofile.cpp
    multiescapesampler.cpp
    parameterization.cpp
)

add_library(path STATIC ${path_files})
target_link_libraries(path
    PRIVATE shared::core
    PUBLIC shared::protobuf
    PUBLIC Qt5::Core
    PRIVATE shared::config
)
target_include_directories(path
    INTERFACE include
    PRIVATE include/path
)

add_library(amun::path ALIAS path)

add_library(path_parameter_optimization STATIC ${path_files})
target_link_libraries(path_parameter_optimization
    PRIVATE shared::core
    PUBLIC shared::protobuf
    PUBLIC Qt5::Core
    PRIVATE shared::config
)
target_include_directories(path_parameter_optimization
    INTERFACE include
    PRIVATE include/path
)

add_library(amun::path_parameter_optimization ALIAS path_parameter_optimization)
target_compile_definitions(path_parameter_optimization PUBLIC ACTIVE_PATHFINDING_PARAMETER_OPTIMIZATION)
