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

#include <QByteArray>
#include <QFile>
#include <QFileInfo>
#include <QIODevice>
#include <QTextStream>
#include <QDebug>
#include <QDir>
#include <QString>
#include <QTextStream>
#include <utility>
#include <string>

#include "node/os.h"
#include "node/fs.h"

#include "v8.h"
#include "libplatform/libplatform.h"
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
    createLibraryObjects();
}

TypescriptCompiler::~TypescriptCompiler()
{
    m_libraryObjects.clear();
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
    TypescriptCompiler* tsc = static_cast<TypescriptCompiler*>(Local<External>::Cast(args.Data())->Value());
    QString name = *String::Utf8Value(args[0]);
    /* if (tsc->m_libraryObjects.contains(name)) { */
    auto library = tsc->m_libraryObjects.find(name);
    if (library != tsc->m_libraryObjects.end()) {
        args.GetReturnValue().Set(library->second->getHandle());
    } else {
        QString message("module ");
        message += name;
        message += " not found";
        Local<String> exception = String::NewFromUtf8(isolate, message.toUtf8().data(),
                                                      NewStringType::kNormal).ToLocalChecked();
        isolate->ThrowException(exception);
    }
}

void TypescriptCompiler::createLibraryObjects() {
    // TODO funktioniert das (polymorphismus + move)?
    // update: *offensichtlich* nicht
    m_libraryObjects.emplace(std::make_pair("os", std::unique_ptr<Library>(new OS(m_isolate))));
    m_libraryObjects.emplace(std::make_pair("fs", std::unique_ptr<Library>(new FS(m_isolate))));
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
    Local<String> name = String::NewFromUtf8(m_isolate, "require", NewStringType::kNormal).ToLocalChecked();
    global->Set(name, FunctionTemplate::New(m_isolate, requireModule, External::New(m_isolate, this)));

    Local<String> logname = String::NewFromUtf8(m_isolate, "log", NewStringType::kNormal).ToLocalChecked();
    global->Set(logname, FunctionTemplate::New(m_isolate, &logCallback, External::New(m_isolate, this)));
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
