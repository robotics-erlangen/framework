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

#include "path.h"

#include "objectcontainer.h"

#include <QList>
#include <QString>
#include <QDir>
#include <QFileInfo>

#include "../v8utility.h"

using v8::FunctionCallbackInfo;
using v8::HandleScope;
using v8::Isolate;
using v8::Local;
using v8::String;
using v8::ObjectTemplate;
using v8::Value;
using v8::External;
using v8::NewStringType;

using namespace v8helper;

Node::path::path(Isolate* isolate) : ObjectContainer(isolate) {
    HandleScope handleScope(m_isolate);

    auto objectTemplate = createTemplateWithCallbacks<ObjectTemplate>({
        { "resolve", Node::path::resolve }
    });

    setHandle(objectTemplate->NewInstance(isolate->GetCurrentContext()).ToLocalChecked());
}

#include <QDebug>
void Node::path::resolve(const FunctionCallbackInfo<Value>& args) {
    auto isolate = args.GetIsolate();
    auto path = static_cast<Node::path*>(Local<External>::Cast(args.Data())->Value());

    QString constructedPath;

    for (int currentArg = args.Length() - 1; currentArg >= 0; --currentArg) {
        if (!args[currentArg]->IsString()) {
            throwError(path->m_isolate, "The path arguments must be of type string");
            return;
        }
        if (args[currentArg].As<String>()->Length() == 0) {
            continue;
        }

        QString currentSegment = *String::Utf8Value(isolate, args[currentArg]);

        if (!constructedPath.isEmpty()) {
            constructedPath.prepend("/");
        }

        constructedPath.prepend(currentSegment);

        if (QFileInfo(constructedPath).isAbsolute()) {
            break;
        }
    }
    if (constructedPath.isEmpty()) {
        constructedPath = ".";
    } else if (!QDir::isAbsolutePath(constructedPath)) {
        constructedPath.prepend("./");
    }

    QString absolutePath = QFileInfo(constructedPath).absoluteFilePath();
    Local<String> absolutePathHandle = v8string(isolate, absolutePath);
    args.GetReturnValue().Set(absolutePathHandle);
}
