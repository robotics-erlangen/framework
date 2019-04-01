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

#include "tsc_internal.h"

#include "node/buffer.h"
#include "node/fs.h"
#include "node/objectcontainer.h"
#include "node/os.h"
#include "node/path.h"
#include "config/config.h"

#include <iostream>
#include <QCoreApplication>
#include <QByteArray>
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

static void printExitcode(int a)
{
    std::cout << "compilation ended with exitcode: " << a << std::endl;
}

InternalTypescriptCompiler::InternalTypescriptCompiler()
{
    Isolate::CreateParams create_params;
    V8::SetFlagsFromString("--expose_gc", 12);
    create_params.array_buffer_allocator = ArrayBuffer::Allocator::NewDefaultAllocator();
    m_isolate = Isolate::New(create_params);
    m_isolate->SetRAILMode(PERFORMANCE_LOAD);
    Isolate::Scope isolateScope(m_isolate);

    HandleScope handleScope(m_isolate);
    Local<ObjectTemplate> globalTemplate = ObjectTemplate::New(m_isolate);
    registerRequireFunction(globalTemplate);
    Local<Context> context = Context::New(m_isolate, nullptr, globalTemplate);
    Context::Scope contextScope(context);

    m_requireNamespace = std::unique_ptr<Node::ObjectContainer>(new Node::ObjectContainer(m_isolate));

    m_requireNamespace->put("os", std::unique_ptr<Node::os>(new Node::os(m_isolate)));
    m_requireNamespace->put("buffer", std::unique_ptr<Node::buffer>(new Node::buffer(m_isolate)));
    m_requireNamespace->put("fs", std::unique_ptr<Node::fs>(new Node::fs(m_isolate, m_requireNamespace.get(), ".")));
    m_requireNamespace->put("path", std::unique_ptr<Node::path>(new Node::path(m_isolate)));

    delete create_params.array_buffer_allocator;

    m_context.Reset(m_isolate, context);
}

InternalTypescriptCompiler::~InternalTypescriptCompiler()
{
    // don't use an Isolate::Scope since we need to Exit before Dispose
    m_isolate->Enter();
    m_requireNamespace.reset();
    m_context.Reset();
    // This is needed for a full gc as the isolate is beeing disposed.
    // The JS memory is reclaimed easily, but its c++ callbacks are never called.
    // This GC run makes sure all callbacks are beeing called, as m_context is reset before this.
    m_isolate->RequestGarbageCollectionForTesting(v8::Isolate::GarbageCollectionType::kFullGarbageCollection);
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
    std::cout << message.toStdString() << std::endl;
}

void InternalTypescriptCompiler::registerRequireFunction(v8::Local<v8::ObjectTemplate> global)
{
    global->Set(m_isolate, "log", FunctionTemplate::New(m_isolate, &logCallback, External::New(m_isolate, this)));
    global->Set(m_isolate, "require", FunctionTemplate::New(m_isolate, &InternalTypescriptCompiler::requireCallback, External::New(m_isolate, this)));
}

void InternalTypescriptCompiler::requireCallback(const FunctionCallbackInfo<Value>& args) {
    auto isolate = args.GetIsolate();
    HandleScope handleScope(isolate);

    if (args.Length() != 1 || !args[0]->IsString()) {
        Local<String> exceptionText = String::NewFromUtf8(isolate, "require needs exactly one string argument",
                NewStringType::kNormal).ToLocalChecked();
        isolate->ThrowException(exceptionText);
        return;
    }
    std::string moduleName = *String::Utf8Value(args[0]);

    auto tsc = static_cast<InternalTypescriptCompiler*>(Local<External>::Cast(args.Data())->Value());
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

void InternalTypescriptCompiler::processCwdCallback(const FunctionCallbackInfo<Value>& args)
{
    auto data = args.Data();
    Local<External> uncasted = Local<External>::Cast(data);
    void* value = uncasted->Value();
    auto tsc = static_cast<InternalTypescriptCompiler*>(value);
    auto fs = static_cast<Node::fs*>(tsc->m_requireNamespace->get("fs"));;
    Local<String> cwd = String::NewFromUtf8(args.GetIsolate(), fs->getPath().toUtf8().data(), NewStringType::kNormal).ToLocalChecked();
    args.GetReturnValue().Set(cwd);
}

void InternalTypescriptCompiler::exitCompilation(const FunctionCallbackInfo<Value>& args)
{
    auto tsc = static_cast<InternalTypescriptCompiler*>(Local<External>::Cast(args.Data())->Value());
    if (!tsc->running) {
        return;
    }
    auto isolate = args.GetIsolate();
    int32_t exitcode;
    if (args[0]->Int32Value(args.GetIsolate()->GetCurrentContext()).To(&exitcode)){
        tsc->m_terminateFun(exitcode);
    } else {
        std::cout << "compilation ended without exitcode" << std::endl;
    }
    tsc->running = false;
    isolate->TerminateExecution();

}

void InternalTypescriptCompiler::startCompiler(const QString& filename)
{
    startCompiler(filename, printExitcode);
}

void InternalTypescriptCompiler::startCompiler(const QString& filename, std::function<void(int)> onTermination)
{
    Isolate::Scope isolateScope(m_isolate);
    QFileInfo finfo(filename);
    QString cwd = finfo.path() + "/..";
    m_terminateFun = onTermination;
    static_cast<Node::fs*>(m_requireNamespace->get("fs"))->setPath(cwd);

    HandleScope handleScope(m_isolate);
    Local<Context> context = m_context.Get(m_isolate);
    Context::Scope contextScope(context);

    QString compilerPath = QFileInfo(QString(ERFORCE_LIBDIR) + "tsc/built/local/tsc.js").canonicalFilePath();

    Local<Object> global = context->Global();

    Local<Object> process = Object::New(m_isolate);
    Local<String> processName = String::NewFromUtf8(m_isolate, "process", NewStringType::kNormal).ToLocalChecked();
    Local<Value> thisValue(External::New(m_isolate, this));
    {
        Local<Array> argv = Array::New(m_isolate, 2);
        Local<String> argvName = String::NewFromUtf8(m_isolate, "argv", NewStringType::kNormal).ToLocalChecked();

        Local<String> executable = String::NewFromUtf8(m_isolate, QCoreApplication::applicationFilePath().toUtf8().data(), NewStringType::kNormal).ToLocalChecked();
        Local<String> scriptName = String::NewFromUtf8(m_isolate, compilerPath.toUtf8().data(), NewStringType::kNormal).ToLocalChecked();

        argv->Set(0, executable);
        argv->Set(1, scriptName);

        process->Set(argvName, argv);
    }
    {
        Local<Function> exit = Function::New(m_isolate, &exitCompilation, thisValue);
        Local<String> exitName = String::NewFromUtf8(m_isolate, "exit", NewStringType::kNormal).ToLocalChecked();
        process->Set(exitName, exit);
    }
    {
        Local<Object> stdoutObject = Object::New(m_isolate);
        Local<Function> write = Function::New(m_isolate, &logCallback);
        Local<String> writeName = String::NewFromUtf8(m_isolate, "write", NewStringType::kNormal).ToLocalChecked();
        stdoutObject->Set(writeName, write);

        Local<String> stdoutName = String::NewFromUtf8(m_isolate, "stdout", NewStringType::kNormal).ToLocalChecked();
        process->Set(stdoutName, stdoutObject);
    }
    {
        // only for compiler existence check
        Local<Object> nextTick = Object::New(m_isolate);
        Local<String> nextTickName = String::NewFromUtf8(m_isolate, "nextTick", NewStringType::kNormal).ToLocalChecked();
        process->Set(nextTickName, nextTick);

        Local<Object> env = Object::New(m_isolate);
        Local<String> envName = String::NewFromUtf8(m_isolate, "env", NewStringType::kNormal).ToLocalChecked();
        process->Set(envName, env);

        Local<Function> cwd = Function::New(m_isolate, &InternalTypescriptCompiler::processCwdCallback, thisValue);
        Local<String> cwdName = String::NewFromUtf8(m_isolate, "cwd", NewStringType::kNormal).ToLocalChecked();
        process->Set(cwdName, cwd);
    }
    {
        // TODO may needs to be implemented for watch mode
        Local<Function> setTimeout = Function::New(m_isolate, nullptr);
        Local<String> setTimeoutName = String::NewFromUtf8(m_isolate, "setTimeout", NewStringType::kNormal).ToLocalChecked();
        global->Set(setTimeoutName, setTimeout);

        Local<Function> clearTimeout = Function::New(m_isolate, nullptr);
        Local<String> clearTimeoutName = String::NewFromUtf8(m_isolate, "clearTimeout", NewStringType::kNormal).ToLocalChecked();
        global->Set(clearTimeoutName, clearTimeout);

        Local<String> filename = String::NewFromUtf8(m_isolate, compilerPath.toUtf8().data(), NewStringType::kNormal).ToLocalChecked();
        Local<String> filenameName = String::NewFromUtf8(m_isolate, "__filename", NewStringType::kNormal).ToLocalChecked();
        global->Set(filenameName, filename);
    }
    global->Set(processName, process);

    QFile compilerFile(compilerPath);
    if (!compilerFile.open(QIODevice::ReadOnly | QIODevice::Text)) {
        std::cout << "Could not open compiler" << std::endl;
        return;
    }
    QByteArray compilerBytes = compilerFile.readAll();


    Local<String> source = String::NewFromUtf8(m_isolate, compilerBytes.data(), NewStringType::kNormal).ToLocalChecked();
    Local<Script> script;
    TryCatch tryCatch(m_isolate);
    if (!Script::Compile(context, source).ToLocal(&script)) {
        String::Utf8Value error(m_isolate, tryCatch.StackTrace(context).ToLocalChecked());
        std::cout << *error << std::endl;
    }
    Local<Value> exitCodeValue;
    running = true;
    if (script->Run(context).ToLocal(&exitCodeValue) && running) {
        m_terminateFun(exitCodeValue->Int32Value());
    } else if (running) {
        std::cout << "Did not return an exitcode" << std::endl;
    }
    if (tryCatch.HasTerminated() || tryCatch.HasCaught()) {
        String::Utf8Value error(m_isolate, tryCatch.StackTrace(context).ToLocalChecked());
        std::cout << *error << std::endl;
    }
}

QString InternalTypescriptCompiler::outputPath(const QString& filename)
{
    QFileInfo finfo(filename);
    return finfo.path() + "/../built/glados/init.js";
}
