# ***************************************************************************
# *   Copyright 2015 Alexander Danzer, Michael Eischer, Philipp Nordhus     *
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

add_subdirectory(path)

set(SOURCES
    include/strategy/strategy.h
    include/strategy/strategytype.h

    abstractstrategyscript.cpp
    abstractstrategyscript.h
    filewatcher.cpp
    filewatcher.h
    lua.cpp
    lua.h
    lua_amun.cpp
    lua_amun.h
    lua_path.cpp
    lua_path.h
    lua_protobuf.cpp
    lua_protobuf.h
    strategy.cpp
)

add_library(strategy ${SOURCES})
target_link_libraries(strategy
    PRIVATE shared::core
    PRIVATE amun::path
    PUBLIC shared::protobuf
    PRIVATE lib::luajit
    PUBLIC Qt5::Core
    PRIVATE Qt5::Network
)
target_include_directories(strategy
    INTERFACE include
    PRIVATE include/strategy
)

add_library(amun::strategy ALIAS strategy)
