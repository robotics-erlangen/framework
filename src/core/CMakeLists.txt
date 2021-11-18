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

add_library(core STATIC
    include/core/fieldtransform.h
    include/core/rng.h
    include/core/timer.h
    include/core/vector.h
    include/core/protobuffilesaver.h
    include/core/protobuffilereader.h
    include/core/run_out_of_scope.h
    include/core/coordinates.h
    include/core/configuration.h
    include/core/sslprotocols.h

    fieldtransform.cpp
    rng.cpp
    timer.cpp
    protobuffilesaver.cpp
    protobuffilereader.cpp
)
target_link_libraries(core
    PUBLIC Qt5::Core
    PUBLIC shared::config
    PUBLIC shared::protobuf
)
target_include_directories(core
    INTERFACE include
    PRIVATE include/core
)

add_library(shared::core ALIAS core)
