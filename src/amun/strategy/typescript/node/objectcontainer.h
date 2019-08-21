/***************************************************************************
 *   Copyright 2018 Paul Bergmann                                          *
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

#ifndef NODE_OBJECT_H
#define NODE_OBJECT_H

#include <map>
#include <memory>
#include <string>
#include "v8.h"

template<typename T> class QList;
class QString;

namespace Node
{
    // TODO maybe template this class for different kinds of v8 objects (functions, arrays, etc.)
    class ObjectContainer {
    public:
        ObjectContainer(v8::Isolate* isolate, const ObjectContainer* requireNamespace = nullptr);
        virtual ~ObjectContainer();

        // Copying and moving is disabled since constructors can't be virtual
        // A childs constructor would not be used, leading to their own members not being copying/moved
        ObjectContainer(const ObjectContainer& other) = delete;
        ObjectContainer(ObjectContainer&& other) = delete;
        ObjectContainer& operator=(const ObjectContainer& rhs) = delete;
        ObjectContainer& operator=(ObjectContainer&& rhs) = delete;

        v8::Local<v8::Object> getHandle();

        // TODO maybe use v8::Maybe
        ObjectContainer* get(const std::string& index) const;
        void put(const std::string& index, std::unique_ptr<ObjectContainer> object);
    protected:
        v8::Isolate* m_isolate;
        const ObjectContainer* m_requireNamespace;

        void setHandle(v8::Local<v8::Object> handle);

        struct CallbackInfo {
            const char* name;
            void (*callback)(const v8::FunctionCallbackInfo<v8::Value>&);
        };
        template<typename TemplateType> v8::Local<TemplateType> createTemplateWithCallbacks(const QList<CallbackInfo>& callbackInfos);
    private:
        std::map<std::string, std::unique_ptr<ObjectContainer>> m_children;

        v8::Global<v8::Object> m_handle;
    };
}

#endif
