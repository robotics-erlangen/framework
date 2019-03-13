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
)
target_link_libraries(strategy
    PRIVATE lib::sourcemap
    PRIVATE lib::luajit
    PRIVATE shared::core
    PRIVATE amun::path
    PUBLIC shared::protobuf
    PUBLIC Qt5::Core
    PRIVATE Qt5::Network
)

target_include_directories(strategy
    INTERFACE include
    PRIVATE include/strategy
)

if(V8_FOUND)
    target_sources(strategy PRIVATE
        include/strategy/typescriptcompiler.h
        checkforscripttimeout.h
        js_amun.cpp
        js_amun.h
        js_path.cpp
        js_path.h
        js_protobuf.cpp
        js_protobuf.h
        typescript.cpp
        typescript.h
        typescriptcompiler.cpp
        inspectorholder.cpp
        inspectorholder.h
        inspectorserver.cpp
        inspectorserver.h
        internaldebugger.cpp
        internaldebugger.h
        inspectorhandler.cpp
        inspectorhandler.h
        websocketprotocol.cpp
        websocketprotocol.h

        node/buffer/Buffer.cpp
        node/buffer/Buffer.h
        node/buffer.cpp
        node/buffer.h
        node/fs.cpp
        node/fs.h
        node/objectcontainer.cpp
        node/objectcontainer.h
        node/os.cpp
        node/os.h
        node/path.cpp
        node/path.h
    )
    target_link_libraries(strategy
        PRIVATE lib::v8
        PRIVATE shared::config
    )
    target_compile_definitions(strategy PUBLIC V8_FOUND)
    target_include_directories(strategy
        # older cmake versions don't add includes for automoc generated sources
        PRIVATE "${CMAKE_CURRENT_BINARY_DIR}"
    )
endif()

add_library(amun::strategy ALIAS strategy)
