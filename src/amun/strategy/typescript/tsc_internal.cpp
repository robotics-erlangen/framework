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
#include "v8utility.h"

#include <iostream>
#include <QCoreApplication>
#include <QByteArray>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QIODevice>
#include <QString>
#include <string>
#include <utility>
#include "v8.h"

using namespace v8;
using namespace v8helper;

InternalTypescriptCompiler::InternalTypescriptCompiler(const QFileInfo &tsconfig) :
    TypescriptCompiler(tsconfig),
    m_isolate(nullptr),
    m_compilerPath(QFileInfo(QString(ERFORCE_LIBDIR) + "tsc/built/local/tsc.js").canonicalFilePath())
{
}

InternalTypescriptCompiler::~InternalTypescriptCompiler()
{
    if (m_isolate) {
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
}

static Local<Array> createStringArray(Isolate* isolate, const QList<QString>& values)
{
    EscapableHandleScope handleScope(isolate);
    Local<Context> context = isolate->GetCurrentContext();
    Local<Array> array = Array::New(isolate, values.size());
    for (int i = 0; i < values.size(); ++i) {
        Local<String> current = v8string(isolate, values[i]);
        array->Set(context, i, current).Check();
    }
    return handleScope.Escape(array);
}

template <typename T>
static void addObjectField(Isolate* isolate, Local<Object> target, QString name, Local<T> value)
{
    Local<Context> context = isolate->GetCurrentContext();
    Local<String> fieldName = v8string(isolate, name);
    target->Set(context, fieldName, value).Check();
}

void InternalTypescriptCompiler::initializeEnvironment()
{
    Isolate::CreateParams create_params;
    m_arrayAllocator.reset(ArrayBuffer::Allocator::NewDefaultAllocator());
    create_params.array_buffer_allocator = m_arrayAllocator.get();
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

    static_cast<Node::fs*>(m_requireNamespace->get("fs"))->setPath(m_tsconfig.dir().absolutePath() + "/");

    m_context.Reset(m_isolate, context);

    Local<Object> global = context->Global();

    Local<Object> process = Object::New(m_isolate);
    Local<Value> thisValue(External::New(m_isolate, this));
    {
        Local<Array> argv = createStringArray(m_isolate, {
            QCoreApplication::applicationFilePath(),
            m_compilerPath,
            "--pretty", "false", "--incremental", "true",
            "--outDir", "built/built-tmp/"
        });
        addObjectField(m_isolate, process, "argv", argv);
    }
    {
        Local<Function> exit = Function::New(context, &exitCompilation, thisValue).ToLocalChecked();
        addObjectField(m_isolate, process, "exit", exit);
    }
    {
        Local<Object> stdoutObject = Object::New(m_isolate);
        Local<Function> write = Function::New(context, &stdoutCallback, thisValue).ToLocalChecked();
        addObjectField(m_isolate, stdoutObject, "write", write);
        addObjectField(m_isolate, process, "stdout", stdoutObject);
    }
    {
        // only for compiler existence check
        Local<Object> nextTick = Object::New(m_isolate);
        addObjectField(m_isolate, process, "nextTick", nextTick);

        Local<Object> env = Object::New(m_isolate);
        addObjectField(m_isolate, process, "env", env);

        Local<Function> cwd = Function::New(context, &InternalTypescriptCompiler::processCwdCallback, thisValue).ToLocalChecked();
        addObjectField(m_isolate, process, "cwd", cwd);
    }
    {
        // TODO may needs to be implemented for watch mode
        Local<Function> setTimeout = Function::New(context, nullptr).ToLocalChecked();
        addObjectField(m_isolate, global, "setTimeout", setTimeout);

        Local<Function> clearTimeout = Function::New(context, nullptr).ToLocalChecked();
        addObjectField(m_isolate, global, "clearTimeout", clearTimeout);

        Local<String> filename = v8string(m_isolate, m_compilerPath);
        addObjectField(m_isolate, global, "__filename", filename);
    }
    addObjectField(m_isolate, global, "process", process);
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
        Local<String> exceptionText = v8string(isolate, "require needs exactly one string argument");
        isolate->ThrowException(exceptionText);
        return;
    }
    std::string moduleName = *String::Utf8Value(isolate, args[0]);

    auto tsc = static_cast<InternalTypescriptCompiler*>(Local<External>::Cast(args.Data())->Value());
    Node::ObjectContainer* moduleContainer = tsc->m_requireNamespace->get(moduleName);

    if (moduleContainer) {
        args.GetReturnValue().Set(moduleContainer->getHandle());
    } else {
        std::string errorMessage = "module '";
        errorMessage += moduleName;
        errorMessage += "' not found";

        Local<String> exceptionText = v8string(isolate, errorMessage);
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
    Local<String> cwd = v8string(args.GetIsolate(), fs->getPath());
    args.GetReturnValue().Set(cwd);
}

void InternalTypescriptCompiler::exitCompilation(const FunctionCallbackInfo<Value>& args)
{
    auto tsc = static_cast<InternalTypescriptCompiler*>(Local<External>::Cast(args.Data())->Value());
    if (!tsc->running) {
        return;
    }
    auto isolate = args.GetIsolate();
    int32_t exitcode = -1;
    bool exitcodeValid = args[0]->Int32Value(args.GetIsolate()->GetCurrentContext()).To(&exitcode);
    tsc->handleExitcode(exitcodeValid, exitcode);
    tsc->running = false;
    isolate->TerminateExecution();

}

void InternalTypescriptCompiler::stdoutCallback(const FunctionCallbackInfo<Value>& args)
{
    auto tsc = static_cast<InternalTypescriptCompiler*>(Local<External>::Cast(args.Data())->Value());
    HandleScope handleScope(args.GetIsolate());
    bool first = true;
    for (int i = 0; i < args.Length(); ++i) {
        if (first)
            first = false;
        else
            tsc->m_stdout += " ";
        String::Utf8Value str(args.GetIsolate(), args[i]);
        tsc->m_stdout += *str;
    }
}

std::pair<InternalTypescriptCompiler::CompileResult, QString> InternalTypescriptCompiler::performCompilation()
{
    if (!m_isolate) {
        initializeEnvironment();
    }
    Isolate::Scope isolateScope(m_isolate);

    HandleScope handleScope(m_isolate);
    Local<Context> context = m_context.Get(m_isolate);
    Context::Scope contextScope(context);

    QFile compilerFile(m_compilerPath);
    if (!compilerFile.open(QIODevice::ReadOnly | QIODevice::Text)) {
        return { CompileResult::Error, "Could not open compiler" };
    }
    QByteArray compilerBytes = compilerFile.readAll();


    Local<String> source = v8string(m_isolate, compilerBytes);
    Local<Script> script;
    TryCatch tryCatch(m_isolate);
    if (!Script::Compile(context, source).ToLocal(&script)) {
        String::Utf8Value errorMsg(m_isolate, tryCatch.StackTrace(context).ToLocalChecked());
        return { CompileResult::Error, *errorMsg };
    }
    Local<Value> exitCodeValue;
    running = true;
    bool exitcodeValid = script->Run(context).ToLocal(&exitCodeValue);
    if (running) {
        handleExitcode(
            exitcodeValid,
            exitcodeValid
                ? exitCodeValue->Int32Value(context).ToChecked()
                : -1
        );
    } else {
        m_isolate->CancelTerminateExecution();
    }
    if (tryCatch.HasTerminated() || tryCatch.HasCaught()) {
        String::Utf8Value errorMsg(m_isolate, tryCatch.StackTrace(context).ToLocalChecked());
        return { CompileResult::Error, *errorMsg };
    }

    return m_lastResult;
}

void InternalTypescriptCompiler::handleExitcode(bool exitcodeValid, int exitcode)
{
    // see tsc/src/compiler/types.ts - ExitStatus
    enum ExitCode {
        Success = 0,
        ErrorNoOutput = 1,
        Error = 2,
        InvalidProject = 3,
        ProjectReferenceCycle = 4,
        Warning = 5,
    };
    m_stdout = m_stdout.replace("\n", "<br/>");
    if (!exitcodeValid) {
        m_lastResult = { CompileResult::Error, "Compiler did not return an exit code" };
    } else switch (exitcode) {
        case ExitCode::Success:
            m_lastResult = { CompileResult::Success, "" };
            break;
        case ExitCode::Warning:
            m_lastResult = { CompileResult::Warning, m_stdout };
            break;
        case ExitCode::Error:
        case ExitCode::ErrorNoOutput:
        case ExitCode::InvalidProject:
        case ExitCode::ProjectReferenceCycle:
            m_lastResult = { CompileResult::Error, m_stdout };
            break;
        default:
            m_lastResult = { CompileResult::Error, QString("Compiler returned unknown exit code '%1'").arg(exitcode) };
            break;
    }
    m_stdout.clear();
}
