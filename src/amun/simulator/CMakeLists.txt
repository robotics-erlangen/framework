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

include(FetchContent)


set(PYTHON_EXECUTABLE /home/mathew/.pyenv/versions/underbots/bin/python)
FetchContent_Declare(
        pybind11
        GIT_REPOSITORY https://github.com/pybind/pybind11.git
        GIT_TAG        v2.10.0
        GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(pybind11)

#FetchContent_Declare(
#        pybind11_protobuf
##        GIT_REPOSITORY https://github.com/pybind/pybind11_protobuf
#        GIT_REPOSITORY https://github.com/sfunderbots/pybind11_protobuf
#        GIT_TAG 17d3fa04dbc114ae9294dfbe8c9597ee1a7ea54f
#        GIT_SHALLOW    TRUE
#)
#FetchContent_MakeAvailable(pybind11_protobuf)

#export("PYTHON_EXECUTABLE:FILEPATH=/home/mathew/")
#set(ENV{PYTHON_EXECUTABLE} /home/mathew/.pyenv/versions/underbots/bin/python)
#set(ENV{PYTHON_EXECUTABLE} /home/mathew/.pyenv/versions/underbots/bin/python)
#set_property(-DPYTHON_EXECUTABLE /home/mathew/.pyenv/versions/underbots/bin/python)
#add_subdirectory(pybind11)

#pybind11_add_module(foo STATIC
#        foo.cpp
#)

add_library(simulator SHARED
#pybind11_add_module(simulator STATIC
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
#target_compile_definitions(simulator
#        PUBLIC -fPIC)
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

#set (CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fPIC" CACHE STRING "Set C++ Compiler Flags" FORCE)
#set_target_properties(simulator PROPERTIES POSITION_INDEPENDENT_CODE ON)

if (CMAKE_CXX_COMPILER_ID MATCHES "Clang")
    # silence warnings about usage of the register specifier in header files of bullet
    set_property(TARGET simulator APPEND PROPERTY COMPILE_FLAGS "-Wno-deprecated-register")
endif()

add_library(amun::simulator ALIAS simulator)


#add_subdirectory("${pybind11_protobuf_SOURCE_DIR}")
set(PYTHON_EXECUTABLE /home/mathew/.pyenv/versions/underbots/bin/python)
#set(PYTHON_INTERPRETER /home/mathew/.pyenv/versions/underbots/bin/python)
set(PYTHON_LIBRARY /home/mathew/.pyenv/versions/3.9.7/lib/libpython3.9.a)
set(PYTHON_INCLUDE_DIR /home/mathew/.pyenv/versions/3.9.7/include/python3.9/)
#set()
#/home/mathew/.pyenv/versions/3.9.7
#add_subdirectory(pybind11)
add_subdirectory(pybind11_protobuf)
#set(PYTHON_EXECUTABLE /home/mathew/.pyenv/versions/underbots/bin/python)
pybind11_add_module(pysimulator simulator_pybind.cpp)
#set(-DCMAKE_POSITION_INDEPENDENT_CODE:BOOL=ON)
set_target_properties(pysimulator PROPERTIES POSITION_INDEPENDENT_CODE ON)
set_target_properties(pybind11_native_proto_caster PROPERTIES POSITION_INDEPENDENT_CODE ON)
set_target_properties(pybind11_wrapped_proto_caster PROPERTIES POSITION_INDEPENDENT_CODE ON)
target_link_libraries(pysimulator
        PUBLIC amun::simulator
        pybind11_native_proto_caster
        pybind11_wrapped_proto_caster
)
target_include_directories(
        pysimulator
        PUBLIC
        ${pybind11_proto_INCLUDE_DIRS}
        ${pybind11_proto_SOURCE_DIR}

)
#target_include_directories(pysimulator
#        PRIVATE pybind11_protobuf/
#        )
