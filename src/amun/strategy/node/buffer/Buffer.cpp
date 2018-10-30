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

#include "Buffer.h"

#include <string>
#include <QString>
#include <QList>

using v8::External;
using v8::Function;
using v8::FunctionCallbackInfo;
using v8::FunctionTemplate;
using v8::HandleScope;
using v8::IndexedPropertyHandlerConfiguration;
using v8::Integer;
using v8::Isolate;
using v8::Local;
using v8::NewStringType;
using v8::Object;
using v8::ObjectTemplate;
using v8::PropertyCallbackInfo;
using v8::String;
using v8::Value;

Node::Buffer::Buffer(Isolate* isolate) : Node::ObjectContainer(isolate) {
    HandleScope handleScope(m_isolate);

    Local<FunctionTemplate> functionTemplate = createTemplateWithCallbacks<FunctionTemplate>({
        { "from", &Node::Buffer::from }
    });
    Local<ObjectTemplate> instanceTemplate = functionTemplate->InstanceTemplate();
    instanceTemplate->SetInternalFieldCount(1);
    instanceTemplate->SetHandler(IndexedPropertyHandlerConfiguration {
        &Node::Buffer::Instance::indexGet, &Node::Buffer::Instance::indexSet
    });

    setHandle(functionTemplate->GetFunction(m_isolate->GetCurrentContext()).ToLocalChecked());
}

Node::Buffer::Instance::Instance(QByteArray&& data) : m_data(std::move(data)) {
}

void Node::Buffer::Instance::indexGet(quint32 index, const PropertyCallbackInfo<Value>& info) {
    auto isolate = info.GetIsolate();
    HandleScope handleScope(isolate);

    Local<External> wrap = info.Holder()->GetInternalField(Node::Buffer::Instance::OBJECT_INSTANCE_INDEX).As<External>();
    auto instance = static_cast<Node::Buffer::Instance*>(wrap->Value());

    // possibly incorrect but I choose to ignore what happens if length() is larger than (2^31)/2
    if (index < static_cast<quint32>(instance->m_data.length())) {
        info.GetReturnValue().Set(instance->m_data.at(index));
    }
}

void Node::Buffer::Instance::indexSet(quint32 index, v8::Local<v8::Value> value, const v8::PropertyCallbackInfo<v8::Value>& info) {
    auto isolate = info.GetIsolate();
    HandleScope handleScope(isolate);

    Local<External> wrap = info.Holder()->GetInternalField(Node::Buffer::Instance::OBJECT_INSTANCE_INDEX).As<External>();
    auto instance = static_cast<Node::Buffer::Instance*>(wrap->Value());

    // See Node::Buffer::Instance::indexGet
    if (index < static_cast<quint32>(instance->m_data.length()) && value->IsInt32()) {
        qint64 valueCast = value.As<Integer>()->Value();
        if (valueCast >= 0 && valueCast <= 255) {
            instance->m_data[index] = valueCast;
        }
    }
    info.GetReturnValue().Set(value);
}

void Node::Buffer::Instance::lengthGet(Local<String> property, const PropertyCallbackInfo<Value>& info) {
    auto isolate = info.GetIsolate();
    HandleScope handleScope(isolate);

    Local<External> wrap = info.Holder()->GetInternalField(Node::Buffer::Instance::OBJECT_INSTANCE_INDEX).As<External>();
    auto instance = static_cast<Node::Buffer::Instance*>(wrap->Value());

    info.GetReturnValue().Set(instance->m_data.length());
}

void Node::Buffer::from(const FunctionCallbackInfo<Value>& args) {
    auto isolate = args.GetIsolate();
    HandleScope handleScope(isolate);
    auto buffer = static_cast<Node::Buffer*>(Local<External>::Cast(args.Data())->Value());

    if (args.Length() < 1 || !args[0]->IsString()) {
        std::string errorMessage = "Buffer.from needs the first argument to be a string";
        buffer->throwV8Exception(errorMessage);
        return;
    }
    Local<Function> bufferConstructor = buffer->getHandle().As<Function>();
    Local<Object> instance = bufferConstructor->NewInstance(isolate->GetCurrentContext()).ToLocalChecked();

    QString encoding = (args.Length() >= 2 && args[1]->IsString()) ? *String::Utf8Value(args[1]) : "utf8";

    Local<String> input = args[0].As<String>();
    // WriteOneByte seems to want to write a 0 Byte
    // But we dont need it so we don't add 1 to the length
    QByteArray tempHolder(input->Length(), '\0');
    input->WriteOneByte(isolate, (unsigned char*) tempHolder.data(), 0, tempHolder.length());

    QByteArray dataHolder;
    if (encoding == "base64") {
        // this won't handle url encoded strings correctly
        // node would
        dataHolder = QByteArray::fromBase64(std::move(tempHolder));
    } else if (encoding == "hex") {
        dataHolder = QByteArray::fromHex(std::move(tempHolder));
    } else {
        dataHolder = std::move(tempHolder);
    }

    instance->SetInternalField(Node::Buffer::Instance::OBJECT_INSTANCE_INDEX, External::New(isolate, new Instance(std::move(dataHolder))));
    args.GetReturnValue().Set(instance);
}
