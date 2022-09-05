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

#include "buffer.h"

#include <string>
#include <QString>
#include <QList>

#include "../../v8utility.h"

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

using namespace v8helper;

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
    Local<String> lengthName = v8string(m_isolate, "length");
    instanceTemplate->SetAccessor(lengthName, &Node::Buffer::Instance::lengthGet);

    auto toStringTemplate = FunctionTemplate::New(m_isolate, &Node::Buffer::Instance::toString, External::New(m_isolate, this));
    instanceTemplate->Set(m_isolate, "toString", toStringTemplate);

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

#include <QDebug>
void Node::Buffer::Instance::lengthGet(Local<String> property, const PropertyCallbackInfo<Value>& info) {
    auto isolate = info.GetIsolate();
    HandleScope handleScope(isolate);

    Local<External> wrap = info.Holder()->GetInternalField(Node::Buffer::Instance::OBJECT_INSTANCE_INDEX).As<External>();
    auto instance = static_cast<Node::Buffer::Instance*>(wrap->Value());

    info.GetReturnValue().Set(instance->m_data.length());
}

void Node::Buffer::Instance::toString(const FunctionCallbackInfo<Value>& args) {
    auto isolate = args.GetIsolate();
    HandleScope handleScope(isolate);
    auto buffer = static_cast<Node::Buffer*>(Local<External>::Cast(args.Data())->Value());
    Local<External> wrap = args.Holder()->GetInternalField(Node::Buffer::Instance::OBJECT_INSTANCE_INDEX).As<External>();
    auto instance = static_cast<Node::Buffer::Instance*>(wrap->Value());
    QString encoding = (args.Length() >= 1 && args[0]->IsString()) ? *String::Utf8Value(isolate, args[0]) : "utf8";
    uint32_t begin = 0, end=instance->m_data.length();

    if (encoding != "utf8") {
        throwError(buffer->m_isolate, "invalid encoding: "+ encoding); //TODO
        return;
    }
    if (args.Length() >= 2 && args[1]->IsUint32()) {
        if(!args[1]->Uint32Value(isolate->GetCurrentContext()).To(&begin)){
            begin = 0;
        }
    }
    if (args.Length() >= 3 && args[2]->IsUint32()) {
        if(!args[2]->Uint32Value(isolate->GetCurrentContext()).To(&end)){
            end = instance->m_data.length();
        }
    }


    QByteArray readBuffer =  instance->m_data.mid(begin, end-begin);
    Local<String> result = v8string(isolate, readBuffer);

    args.GetReturnValue().Set(result);
}

void Node::Buffer::from(const FunctionCallbackInfo<Value>& args) {
    auto isolate = args.GetIsolate();
    HandleScope handleScope(isolate);
    auto buffer = static_cast<Node::Buffer*>(Local<External>::Cast(args.Data())->Value());

    if (args.Length() < 1 || !args[0]->IsString()) {
        QString errorMessage = "Buffer.from needs the first argument to be a string";
        throwError(buffer->m_isolate, errorMessage);
        return;
    }

    QString encoding = (args.Length() >= 2 && args[1]->IsString()) ? *String::Utf8Value(isolate, args[1]) : "utf8";

    Local<String> input = args[0].As<String>();
    from(args, input, buffer, encoding);
}

void Node::Buffer::from(const FunctionCallbackInfo<Value>& res, Local<String> input, Node::Buffer* buffer, QString encoding)
{
    auto isolate = res.GetIsolate();
    HandleScope handleScope(isolate);

    Local<Function> bufferConstructor = buffer->getHandle().As<Function>();
    Local<Object> instance = bufferConstructor->NewInstance(isolate->GetCurrentContext()).ToLocalChecked();

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

    Local<External> ex = embedToExternal(isolate, std::make_unique<Instance>(std::move(dataHolder)));
    instance->SetInternalField(Node::Buffer::Instance::OBJECT_INSTANCE_INDEX, ex);
    res.GetReturnValue().Set(instance);
}
