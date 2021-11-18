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


add_library(script STATIC
    include/strategy/script/abstractstrategyscript.h
    include/strategy/script/compiler.h
    include/strategy/script/compilerregistry.h
    include/strategy/script/debughelper.h
    include/strategy/script/filewatcher.h
    include/strategy/script/scriptstate.h
    include/strategy/script/strategytype.h

    abstractstrategyscript.cpp
    compiler.cpp
    compilerregistry.cpp
    debughelper.cpp
    filewatcher.cpp
)

target_link_libraries(script
    PUBLIC amun::gamecontroller

    PRIVATE shared::core
    PUBLIC shared::protobuf

    PRIVATE Qt5::Network
    PUBLIC Qt5::Core
)

target_include_directories(script
    INTERFACE include
    PRIVATE include/strategy/script
)

add_library(amun::strategy::script ALIAS script)

