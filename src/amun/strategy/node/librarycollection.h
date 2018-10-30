/***************************************************************************
 *   Copyright 2018 Paul Bergmann                                        *
 *   Robotics Erlangen e.V.                                                *
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

#ifndef NODE_LIBRARYCOLLECTION_H
#define NODE_LIBRARYCOLLECTION_H

#include "library.h"

#include <map>
#include <memory>
#include <QString>
#include "v8.h"

namespace Node {
    class LibraryCollection {
    public:
        LibraryCollection(v8::Local<v8::Context> context);

        LibraryCollection(LibraryCollection& other) = delete;
        LibraryCollection(LibraryCollection&& other) = delete;
        LibraryCollection& operator=(LibraryCollection& rhs) = delete;
        LibraryCollection& operator=(LibraryCollection&& rhs) = delete;

        v8::MaybeLocal<v8::Object> require(const QString& moduleName) const;
    private:
        static void requireCallback(const v8::FunctionCallbackInfo<v8::Value>& args);

        v8::Isolate* m_isolate;
        v8::Global<v8::Context> m_context;
        std::map<QString, std::unique_ptr<Library>> m_libraryObjects;
    };
}
#endif // NODE_LIBRARYCOLLECTION_H
