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

add_subdirectory(processor)
add_subdirectory(simulator)
add_subdirectory(strategy)
add_subdirectory(gamecontroller)
add_subdirectory(seshat)
add_subdirectory(internalreferee)

add_library(amun STATIC
    include/amun/amun.h
    include/amun/amunclient.h

    amun.cpp
    amunclient.cpp
    networkinterfacewatcher.cpp
    networkinterfacewatcher.h
    receiver.cpp
    receiver.h
    optionsmanager.cpp
    optionsmanager.h
    commandconverter.cpp
    commandconverter.h
	gitinforecorder.cpp
	gitinforecorder.h
)
target_link_libraries(amun
    PRIVATE shared::core
    PRIVATE amun::processor
    PRIVATE amun::simulator
    PUBLIC amun::strategy
    PRIVATE amun::seshat
    PUBLIC shared::protobuf
    PUBLIC Qt5::Core
    PRIVATE Qt5::Network
    PUBLIC amun::gamecontroller
    PUBLIC amun::internalreferee
    PUBLIC gitconfig
)
target_include_directories(amun
    INTERFACE include
    PRIVATE include/amun
)

if(WIN32)
    target_link_libraries(amun PRIVATE wsock32)
endif()

add_library(amun::amun ALIAS amun)
