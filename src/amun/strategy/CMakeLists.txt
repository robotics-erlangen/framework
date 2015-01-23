# ***************************************************************************
# *   Copyright 2014 Alexander Danzer, Michael Eischer, Philipp Nordhus     *
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

if(TARGET path AND TARGET protobuf AND LUA51_FOUND)

include_directories(${LUA_INCLUDE_DIR})
include_directories(${PROTOBUF_INCLUDE_DIR})

set(SOURCES
    abstractstrategyscript.cpp
    abstractstrategyscript.h
    filewatcher.cpp
    filewatcher.h
    lua.cpp
    lua.h
    math_eqn.cpp
    math_eqn.h
    lua_math.cpp
    lua_math.h
    lua_amun.cpp
    lua_amun.h
    lua_path.cpp
    lua_path.h
    lua_protobuf.cpp
    lua_protobuf.h
    lua_vector.cpp
    lua_vector.h
    strategy.cpp
    strategy.h
)

add_library(strategy ${SOURCES})
target_link_libraries(strategy core path protobuf ${LUA_LIBRARIES})
qt5_use_modules(strategy Core)

endif()
