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
add_subdirectory(script)
add_subdirectory(lua)

add_library(strategy STATIC
    include/strategy/strategy.h
    include/strategy/strategyreplayhelper.h

    strategy.cpp
    strategyreplayhelper.cpp
)
target_link_libraries(strategy
    PUBLIC shared::protobuf

    PUBLIC amun::gamecontroller
    PUBLIC amun::strategy::script

    PRIVATE Qt5::Network
    PUBLIC Qt5::Core

    PRIVATE amun::strategy::lua
    PRIVATE shared::config
)

target_include_directories(strategy
    INTERFACE include
    PRIVATE include/strategy
)

if(V8_FOUND)
    target_compile_definitions(strategy PUBLIC V8_FOUND)
    add_subdirectory(typescript)
    target_link_libraries(strategy
        PRIVATE lib::v8
        PRIVATE amun::strategy::typescript
    )

    if(NOT MINGW32)
        target_compile_definitions(strategy
            PRIVATE V8_COMPRESS_POINTERS=1 V8_31BIT_SMIS_ON_64BIT_ARCH=1
        )
    endif()
endif()

add_library(amun::strategy ALIAS strategy)
