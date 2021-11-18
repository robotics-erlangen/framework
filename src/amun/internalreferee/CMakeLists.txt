# ***************************************************************************
# *   Copyright 2021 Paul Bergmann                                          *
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

add_library(internalreferee STATIC
    include/internalreferee/internalreferee.h

    internalreferee.cpp
)

target_link_libraries(internalreferee
    PUBLIC shared::protobuf
    PUBLIC Qt5::Core
)

target_include_directories(internalreferee
    INTERFACE include
    PRIVATE include/internalreferee
)

add_library(amun::internalreferee ALIAS internalreferee)
