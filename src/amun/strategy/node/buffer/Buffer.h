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

#ifndef NODE_Buffer_H
#define NODE_Buffer_H

#include "../objectcontainer.h"

#include <QByteArray>
#include <QString>
#include <QtGlobal>

namespace v8 {
    class Isolate;
    class Value;
    template<typename T> class PropertyCallbackInfo;
}

namespace Node {
    class Buffer : public Node::ObjectContainer {
    public:
        Buffer(v8::Isolate* isolate);
        static void from(const v8::FunctionCallbackInfo<v8::Value>& res, v8::Local<v8::String> data, Buffer* buffer, QString encoding = "utf8");
    private:
        class Instance {
        public:
            Instance(QByteArray&& data);
        private:
            const static int OBJECT_INSTANCE_INDEX = 0;
            static void indexGet(quint32 index, const v8::PropertyCallbackInfo<v8::Value>& info);
            static void indexSet(quint32 index, v8::Local<v8::Value> value, const v8::PropertyCallbackInfo<v8::Value>& info);

            static void lengthGet(v8::Local<v8::String> property, const v8::PropertyCallbackInfo<v8::Value>& info);
            static void toString(const v8::FunctionCallbackInfo<v8::Value>& args);

            QByteArray m_data;
            friend class Node::Buffer;
        };

        static void from(const v8::FunctionCallbackInfo<v8::Value>& args);
    };
}

#endif
