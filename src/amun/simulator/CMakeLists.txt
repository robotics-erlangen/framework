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

add_library(simulator
    include/simulator/simulator.h
    include/simulator/fastsimulator.h

    mesh.cpp
    mesh.h
    simball.cpp
    simball.h
    simfield.cpp
    simfield.h
    simrobot.cpp
    simrobot.h
    simulator.cpp
    fastsimulator.cpp
    erroraggregator.h
    erroraggregator.cpp
)
target_link_libraries(simulator
    PRIVATE shared::core
    PUBLIC shared::protobuf
    PRIVATE lib::bullet
    PUBLIC Qt5::Core
    PRIVATE Qt5::Gui
    PRIVATE lib::eigen
)
target_include_directories(simulator
    INTERFACE include
    PRIVATE include/simulator
)

if (CMAKE_CXX_COMPILER_ID MATCHES "Clang")
    # silence warnings about usage of the register specifier in header files of bullet
    set_property(TARGET simulator APPEND PROPERTY COMPILE_FLAGS "-Wno-deprecated-register")
endif()

add_library(amun::simulator ALIAS simulator)

include(FetchContent)

set(PYTHON_EXECUTABLE /home/mathew/.pyenv/versions/underbots/bin/python)
FetchContent_Declare(
        pybind11
        GIT_REPOSITORY https://github.com/pybind/pybind11.git
        GIT_TAG        v2.10.0
        GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(pybind11)

#set(PYTHON_EXECUTABLE /home/mathew/.pyenv/versions/underbots/bin/python)
#set(PYTHON_LIBRARY /home/mathew/.pyenv/versions/3.9.7/lib/libpython3.9.a)
#set(PYTHON_INCLUDE_DIR /home/mathew/.pyenv/versions/3.9.7/include/python3.9/)
pybind11_add_module(pysimulator simulator_pybind.cpp)
target_link_libraries(pysimulator
        PUBLIC amun::simulator
)
