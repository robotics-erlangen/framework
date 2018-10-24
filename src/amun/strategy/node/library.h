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

#ifndef NODE_LIBRARY_H
#define NODE_LIBRARY_H

#include <QList>

#include "v8.h"

class Library {
public:
    Library(v8::Isolate* isolate);
    // copying, moving is disabled since constructors can't be virtual
    // a childs constructor wouldn't be used, which means their own members won't be copied/moved
    Library(const Library& other) = delete;
    Library& operator=(const Library& rhs) = delete;
    Library(Library&& other) = delete;
    Library& operator=(Library&& other) = delete;

    v8::Local<v8::Object> getHandle();
protected:
    void setLibraryHandle(v8::Local<v8::Object> handle);
    v8::Isolate* m_isolate;
    v8::Global<v8::Object> m_libraryHandle;

    struct CallbackInfo {
        const char *name;
        void (*callback)(v8::FunctionCallbackInfo<v8::Value> const &);
    };

    template<typename T> v8::Local<T> createTemplateWithCallbacks(const QList<CallbackInfo>& callbackInfos);
    void throwV8Exception(const QString& message) const;
};

#endif
