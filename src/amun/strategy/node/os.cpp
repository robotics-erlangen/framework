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

#include "os.h"

#include "v8.h"

using namespace v8;

OS::OS(Isolate* isolate) : Library(isolate) {
    HandleScope handleScope(m_isolate);

    auto objectTemplate = createTemplateWithCallbacks<ObjectTemplate>({
        { "platform", &OS::platform }
    });

    Local<String> eolName = String::NewFromUtf8(m_isolate, "EOL");
    #ifdef Q_OS_WIN32
        Local<String> eolString = String::NewFromUtf8(m_isolate, "\r\n", NewStringType::kNormal).ToLocalChecked();
    #else
        Local<String> eolString = String::NewFromUtf8(m_isolate, "\n", NewStringType::kNormal).ToLocalChecked();
    #endif
    objectTemplate->Set(eolName, eolString);

    setLibraryHandle(objectTemplate->NewInstance(isolate->GetCurrentContext()).ToLocalChecked());
}

void OS::platform(const FunctionCallbackInfo<Value>& args) {
    #if defined Q_OS_LINUX
        const QString platform = "linux";
    #elif defined Q_OS_WIN32
        const QString platform = "win32";
    #elif defined Q_OS_DARWIN
        const QString platform = "darwin";
    #else
        #error Unsupported Platform
    #endif

    auto isolate = args.GetIsolate();
    Local<String> platformHandle = String::NewFromUtf8(isolate, platform.toUtf8().data());
    args.GetReturnValue().Set(platformHandle);
}
