# ***************************************************************************
# *   Copyright 2019 Paul Bergmann                                          *
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

add_library(lua STATIC
    include/strategy/lua/lua.h

    lua.cpp
    lua_amun.cpp
    lua_amun.h
    lua_path.cpp
    lua_path.h
    lua_protobuf.cpp
    lua_protobuf.h
    lua_eigen.cpp
    lua_eigen.h
)

target_include_directories(lua
    INTERFACE include
    PRIVATE include/strategy/lua
)

target_link_libraries(lua
    PUBLIC lib::luajit

    PUBLIC Qt5::Core

    PRIVATE amun::path
    PUBLIC amun::strategy::script
    PUBLIC lib::eigen
)

add_library(amun::strategy::lua ALIAS lua)
