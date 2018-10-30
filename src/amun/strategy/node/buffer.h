/***************************************************************************
 *   Copyright 2018 Paul Bergmann                                        * Robotics Erlangen e.V.                                                *
 *   http://www.robotics-erlangen.de/                                      *
 *   info@robotics-erlangen.de                                             *
 *                                                                         *
 *   This program is free software: you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation, either version 3 of the License, or     *
 *   any later version.                                                    *
 *                                                                         *
 *   This program is distributed in the hope that it will be useful,       *
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
 *   GNU General Public License for more details.                          *
 *                                                                         *
 *   You should have received a copy of the GNU General Public License     *
 *   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
 ***************************************************************************/

#ifndef NODE_BUFFER_H
#define NODE_BUFFER_H

#include "library.h"

#include "v8.h"

namespace Node {
    class LibraryCollection;
}

namespace Node {
    class Buffer : public Library {
    public:
        Buffer(v8::Isolate* isolate, const LibraryCollection* libraryCollection);
    private:
        class BufferInstance {
        };
        static const int OBJECT_BUFFERINSTANCE_INDEX = 0;
        v8::Global<v8::Function> m_bufferConstructor;
        v8::Global<v8::ObjectTemplate> m_bufferInstanceTemplate;

        static void bufferClass(const v8::FunctionCallbackInfo<v8::Value>& args);

        static void from(const v8::FunctionCallbackInfo<v8::Value>& args);
    };
}
#endif
