/***************************************************************************
 *   Copyright 2018 Andreas Wendler, Paul Bergmann                         *
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

#include "node/buffer.h"
#include "node/fs.h"
#include "node/objectcontainer.h"
#include "node/os.h"

#include <QByteArray>
#include <QDebug>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QIODevice>
#include <QTextStream>
#include <QTextStream>
#include <string>
#include <string>
#include <utility>
#include "v8.h"

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

    m_requireNamespace = std::unique_ptr<Node::ObjectContainer>(new Node::ObjectContainer(m_isolate));

    m_requireNamespace->put("os", std::unique_ptr<Node::os>(new Node::os(m_isolate)));
    m_requireNamespace->put("buffer", std::unique_ptr<Node::buffer>(new Node::buffer(m_isolate)));
    m_requireNamespace->put("fs", std::unique_ptr<Node::fs>(new Node::fs(m_isolate, m_requireNamespace.get())));

    m_context.Reset(m_isolate, context);
}

TypescriptCompiler::~TypescriptCompiler()
{
    m_requireNamespace.release();
    m_context.Reset();
    m_isolate->Exit();
    m_isolate->Dispose();
}

void logCallback(const v8::FunctionCallbackInfo<v8::Value>& args) {
    bool first = true;
    QString message = "";
    for (int i = 0; i < args.Length(); ++i) {
        HandleScope handleScope(args.GetIsolate());
        if (first) {
            first = false;
        } else {
            message += " ";
        }
        String::Utf8Value str(args.GetIsolate(), args[i]);
        message += *str;
    }
    qDebug() << message;
}

void TypescriptCompiler::registerRequireFunction(v8::Local<v8::ObjectTemplate> global)
{
    global->Set(m_isolate, "log", FunctionTemplate::New(m_isolate, &logCallback, External::New(m_isolate, this)));
    global->Set(m_isolate, "require", FunctionTemplate::New(m_isolate, &TypescriptCompiler::requireCallback, External::New(m_isolate, this)));
}

void TypescriptCompiler::requireCallback(const FunctionCallbackInfo<Value>& args) {
    auto isolate = args.GetIsolate();
    HandleScope handleScope(isolate);

    if (args.Length() != 1 || !args[0]->IsString()) {
        Local<String> exceptionText = String::NewFromUtf8(isolate, "require needs exactly one string argument",
                NewStringType::kNormal).ToLocalChecked();
        isolate->ThrowException(exceptionText);
        return;
    }
    std::string moduleName = *String::Utf8Value(args[0]);

    auto tsc = static_cast<TypescriptCompiler*>(Local<External>::Cast(args.Data())->Value());
    Node::ObjectContainer* moduleContainer = tsc->m_requireNamespace->get(moduleName);

    if (moduleContainer) {
        args.GetReturnValue().Set(moduleContainer->getHandle());
    } else {
        std::string errorMessage = "module '";
        errorMessage += moduleName;
        errorMessage += "' not found";

        Local<String> exceptionText = String::NewFromUtf8(isolate, errorMessage.c_str(), NewStringType::kNormal).ToLocalChecked();
        isolate->ThrowException(exceptionText);
        return;
    }
}

void TypescriptCompiler::startCompiler(const QString &filename)
{
    // TODO
    QFile file(filename);
    if (!file.open(QIODevice::ReadOnly | QIODevice::Text)) {
        qDebug() << "could not open file " << filename;
        return;
    }
    QTextStream in(&file);
    QString content = in.readAll();
    QByteArray contentBytes = content.toUtf8();

    HandleScope handleScope(m_isolate);
    Local<Context> context = m_context.Get(m_isolate);
    Context::Scope contextScope(context);

    Local<String> source = String::NewFromUtf8(m_isolate, contentBytes.data(), NewStringType::kNormal).ToLocalChecked();

    Local<Script> script;
    TryCatch tryCatch(m_isolate);
    if (!Script::Compile(context, source).ToLocal(&script)) {
        String::Utf8Value error(m_isolate, tryCatch.StackTrace(context).ToLocalChecked());
        qDebug() << *error;
    }
    script->Run(context);
    if (tryCatch.HasTerminated() || tryCatch.HasCaught()) {
        String::Utf8Value error(m_isolate, tryCatch.Exception());
        qDebug() << *error;
    }
}
