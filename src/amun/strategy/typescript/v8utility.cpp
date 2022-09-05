/***************************************************************************
 *   Copyright 2019 Paul Bergmann                                          *
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

#include "v8utility.h"

#include "v8.h"
#include <QByteArray>
#include <QList>
#include <QString>
#include <functional>
#include <string>

using namespace v8;

namespace v8helper {

template<>
Local<String> v8string(Isolate* isolate, const char* str)
{
    return String::NewFromUtf8(isolate, str, NewStringType::kNormal).ToLocalChecked();
}

template<>
Local<String> v8string(Isolate* isolate, std::string str)
{
    return String::NewFromUtf8(isolate, str.c_str(), NewStringType::kNormal, str.length()).ToLocalChecked();
}

template<>
Local<String> v8string(Isolate* isolate, QByteArray str)
{
    return String::NewFromUtf8(isolate, str.data(), NewStringType::kNormal, str.length()).ToLocalChecked();
}

template<>
Local<String> v8string(Isolate* isolate, QString str)
{
    return v8string(isolate, str.toUtf8());
}

template<typename StringType>
void throwError(Isolate* isolate, StringType text)
{
    auto exceptionText = v8string(isolate, text);
    isolate->ThrowException(Exception::Error(exceptionText));
}

template<typename Target>
Local<Target> installCallbacks(Isolate* isolate, Local<Target> target, const QList<CallbackInfo>& callbacks, const CallbackDataMapper& dataMapper)
{
    Local<Context> context = isolate->GetCurrentContext();
    for (const auto& callback : callbacks) {
        auto functionTemplate = FunctionTemplate::New(isolate, callback.function, dataMapper(callback),
                Local<Signature>(), 0, ConstructorBehavior::kThrow, SideEffectType::kHasSideEffect);
        Local<Function> function = functionTemplate->GetFunction(isolate->GetCurrentContext()).ToLocalChecked();

        auto name = v8string(isolate, callback.name);
        function->SetName(name);
        target->Set(context, name, function).Check();

    }
    return target;
}

template<typename Target>
Local<Target> installCallbacks(Isolate* isolate, Local<Target> target, const QList<CallbackInfo>& callbacks, Local<Value> data)
{
    return installCallbacks(isolate, target, callbacks, [data](auto _) { return data; });
}

template void throwError(Isolate*, QByteArray);
template void throwError(Isolate*, QString);
template void throwError(Isolate*, const char*);
template void throwError(Isolate*, std::string);

template Local<Object> installCallbacks(Isolate*, Local<Object>, const QList<CallbackInfo>&, const CallbackDataMapper&);
template Local<Object> installCallbacks(Isolate*, Local<Object>, const QList<CallbackInfo>&, Local<Value>);
}
