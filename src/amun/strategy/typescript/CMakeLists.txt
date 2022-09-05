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

add_library(typescript STATIC
    include/strategy/typescript/typescript.h

    checkforscripttimeout.h
    inspectorhandler.cpp
    inspectorhandler.h
    inspectorholder.cpp
    inspectorholder.h
    inspectorserver.cpp
    inspectorserver.h
    internaldebugger.cpp
    internaldebugger.h
    js_amun.cpp
    js_amun.h
    js_path.cpp
    js_path.h
    js_protobuf.cpp
    js_protobuf.h
    protobuftypings.cpp
    protobuftypings.h
    tsc_internal.cpp
    tsc_internal.h
    typescript.cpp
    typescriptcompiler.cpp
    typescriptcompiler.h
    v8utility.cpp
    v8utility.h
    websocketprotocol.cpp
    websocketprotocol.h

    node/buffer/buffer.cpp
    node/buffer/buffer.h
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

target_link_libraries(typescript
    PUBLIC Qt5::Core
    PUBLIC Qt5::Network

    PRIVATE lib::luajit
    PRIVATE lib::sourcemap
    PUBLIC lib::v8

    PRIVATE amun::path
    PUBLIC amun::strategy::script

    PRIVATE shared::config
    PRIVATE shared::core
    PRIVATE shared::protobuf
)

if(NOT MINGW32)
    target_compile_definitions(typescript
        PUBLIC V8_COMPRESS_POINTERS=1 V8_31BIT_SMIS_ON_64BIT_ARCH=1
    )
endif()

target_include_directories(typescript
    INTERFACE include
    PRIVATE include/strategy/typescript
    # older cmake versions don't add includes for automoc generated sources
    PRIVATE "${CMAKE_CURRENT_BINARY_DIR}"
)

add_library(amun::strategy::typescript ALIAS typescript)
