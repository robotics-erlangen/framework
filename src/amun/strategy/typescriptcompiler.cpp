/***************************************************************************
 *   Copyright 2018 Andreas Wendler                                        *
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

#include "typescriptcompiler.h"

#include <QFileInfo>
#include <QDebug>
#include <QTextStream>
#include <vector>
#include <v8.h>
#include <libplatform/libplatform.h>

#include "js_amun.h"
#include "js_path.h"

using namespace v8;

TypescriptCompiler::TypescriptCompiler()
{
    Isolate::CreateParams create_params;
    create_params.array_buffer_allocator = ArrayBuffer::Allocator::NewDefaultAllocator();
    m_isolate = Isolate::New(create_params);
    m_isolate->SetRAILMode(PERFORMANCE_LOAD);
    m_isolate->Enter();

    HandleScope handleScope(m_isolate);
    Local<ObjectTemplate> globalTemplate = ObjectTemplate::New(m_isolate);
    registerRequireFunction(globalTemplate);
    Local<Context> context = Context::New(m_isolate, nullptr, globalTemplate);
    Context::Scope contextScope(context);
    m_context.Reset(m_isolate, context);
}

TypescriptCompiler::~TypescriptCompiler()
{
    m_context.Reset();
    m_isolate->Exit();
    m_isolate->Dispose();
}

void TypescriptCompiler::requireModule(const v8::FunctionCallbackInfo<v8::Value>& args)
{
    Isolate *isolate = args.GetIsolate();
    if (args.Length() != 1 || !args[0]->IsString()) {
        Local<String> exception = String::NewFromUtf8(isolate, "require need exactly 1 string argument",
                                                      NewStringType::kNormal).ToLocalChecked();
        isolate->ThrowException(exception);
    }
    QString name = *String::Utf8Value(args[0]);
    if (name == "fs") {

    } else if (name == "path") {

    } else if (name == "os") {

    } else {
        Local<String> exception = String::NewFromUtf8(isolate, "module name not found",
                                                      NewStringType::kNormal).ToLocalChecked();
        isolate->ThrowException(exception);
    }
}

void TypescriptCompiler::registerRequireFunction(v8::Local<v8::ObjectTemplate> global)
{
    Local<String> name = String::NewFromUtf8(m_isolate, "require", NewStringType::kNormal).ToLocalChecked();
    global->Set(name, FunctionTemplate::New(m_isolate, requireModule, External::New(m_isolate, this)));
}

void TypescriptCompiler::startCompiler(const QString &filename)
{
}
