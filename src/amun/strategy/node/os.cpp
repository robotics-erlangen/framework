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

#include "os.h"

#include <QList>
#include "v8.h"

using v8::FunctionCallbackInfo;
using v8::HandleScope;
using v8::Isolate;
using v8::Local;
using v8::NewStringType;
using v8::ObjectTemplate;
using v8::String;
using v8::Value;

Node::os::os(Isolate* isolate) : ObjectContainer(isolate) {
    HandleScope handleScope(m_isolate);

    auto objectTemplate = createTemplateWithCallbacks<ObjectTemplate>({
        { "platform", &Node::os::platform }
    });

    #ifdef Q_OS_WIN32
        Local<String> eolString = String::NewFromUtf8(m_isolate, "\r\n", NewStringType::kNormal).ToLocalChecked();
    #else
        Local<String> eolString = String::NewFromUtf8(m_isolate, "\n", NewStringType::kNormal).ToLocalChecked();
    #endif
    objectTemplate->Set(m_isolate, "EOL", eolString);

    setHandle(objectTemplate->NewInstance(m_isolate->GetCurrentContext()).ToLocalChecked());
}

void Node::os::platform(const FunctionCallbackInfo<Value>& args) {
    #if defined Q_OS_LINUX
        const char* platform = "linux";
    #elif defined Q_OS_WIN32
        const char* platform = "win32";
    #elif defined Q_OS_DARWIN
        const char* platform = "darwin";
    #else
        #error Unsupported Platform
    #endif

    auto isolate = args.GetIsolate();
    Local<String> platformHandle = String::NewFromUtf8(isolate, platform, NewStringType::kNormal).ToLocalChecked();
    args.GetReturnValue().Set(platformHandle);
}
