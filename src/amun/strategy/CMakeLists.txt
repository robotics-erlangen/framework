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

add_library(v8 STATIC IMPORTED)
set_target_properties(v8 PROPERTIES
    IMPORTED_LOCATION /somewhere/v8/out.gn/x64.release/obj/libv8_base.a
    IMPORTED_LOCATION /somewhere/v8/out.gn/x64.release/obj/libv8_libbase.a
    IMPORTED_LOCATION /somewhere/v8/out.gn/x64.release/obj/libv8_external_snapshot.a
    IMPORTED_LOCATION /somewhere/v8/out.gn/x64.release/obj/libv8_libplatform.a
    IMPORTED_LOCATION /somewhere/v8/out.gn/x64.release/obj/libv8_libsampler.a
    IMPORTED_LOCATION /somewhere/v8/out.gn/x64.release/obj/third_party/icu/libicuuc.a
    IMPORTED_LOCATION /somewhere/v8/out.gn/x64.release/obj/third_party/icu/libicui18n.a
    IMPORTED_LOCATION /somewhere/v8/out.gn/x64.release/obj/src/inspector/libinspector.a
    INTERFACE_INCLUDE_DIRECTORIES /somewhere/v8/include
)

set(THREADS_PREFER_PTHREAD_FLAG ON)
find_package(Threads REQUIRED)

add_library(strategy
    include/strategy/debughelper.h
    include/strategy/strategy.h
    include/strategy/strategytype.h
    include/strategy/strategyreplayhelper.h

    abstractstrategyscript.cpp
    abstractstrategyscript.h
    debughelper.cpp
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
    strategyreplayhelper.cpp
    typescript.cpp
    typescript.h
)
target_link_libraries(strategy
    PRIVATE lib::luajit
    PRIVATE shared::core
    PRIVATE amun::path
    PUBLIC shared::protobuf
    PUBLIC Qt5::Core
    PRIVATE Qt5::Network
    #PRIVATE v8
    -Wl,--start-group
    /somewhere/v8/out.gn/x64.release/obj/libv8_base.a
    /somewhere/v8/out.gn/x64.release/obj/libv8_libbase.a
    /somewhere/v8/out.gn/x64.release/obj/libv8_external_snapshot.a
    /somewhere/v8/out.gn/x64.release/obj/libv8_libplatform.a
    /somewhere/v8/out.gn/x64.release/obj/libv8_libsampler.a
    /somewhere/v8/out.gn/x64.release/obj/third_party/icu/libicuuc.a
    /somewhere/v8/out.gn/x64.release/obj/third_party/icu/libicui18n.a
    /somewhere/v8/out.gn/x64.release/obj/src/inspector/libinspector.a
    -Wl,--end-group
    -lrt
    -ldl
    Threads::Threads
)

target_include_directories(strategy
    INTERFACE include
    PRIVATE include/strategy
    PRIVATE /somewhere/v8/include
)

add_library(amun::strategy ALIAS strategy)
