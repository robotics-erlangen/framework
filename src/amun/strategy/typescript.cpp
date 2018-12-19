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

#include "typescript.h"

#include <QFileInfo>
#include <QTextStream>
#include <QDebug>
#include <QThread>
#include <vector>
#include <v8.h>
#include <libplatform/libplatform.h>
#include <lua.hpp>

#include "js_amun.h"
#include "js_path.h"
#include "checkforscripttimeout.h"
#include "inspectorholder.h"
#include "internaldebugger.h"

using namespace v8;

// use this to silence a warn_unused_result warning
template <typename T> inline void USE(T&&) {}

Typescript::Typescript(const Timer *timer, StrategyType type, bool debugEnabled, bool refboxControlEnabled) :
    AbstractStrategyScript (timer, type, debugEnabled, refboxControlEnabled),
    m_executionCounter(0),
    m_profiler (nullptr),
    m_scriptIdCounter(0),
    m_luaState(nullptr)
{
    Isolate::CreateParams create_params;
    create_params.array_buffer_allocator = ArrayBuffer::Allocator::NewDefaultAllocator();
    m_isolate = Isolate::New(create_params);
    m_isolate->SetRAILMode(PERFORMANCE_LOAD);
    m_isolate->Enter();

    // creates its own QThread and moves to it
    m_checkForScriptTimeout = new CheckForScriptTimeout(m_isolate, m_timeoutCounter);
    m_timeoutCheckerThread = new QThread(this);
    m_timeoutCheckerThread->start();
    m_checkForScriptTimeout->moveToThread(m_timeoutCheckerThread);

    HandleScope handleScope(m_isolate);
    Local<ObjectTemplate> globalTemplate = ObjectTemplate::New(m_isolate);
    registerDefineFunction(globalTemplate);
    Local<Context> context = Context::New(m_isolate, nullptr, globalTemplate);
    Context::Scope contextScope(context);
    Local<Object> global = context->Global();
    registerAmunJsCallbacks(m_isolate, global, this);
    registerPathJsCallbacks(m_isolate, global, this);
    // create an empty global variable used for debugging
    Local<String> objectName = String::NewFromUtf8(m_isolate, "___globalpleasedontuseinregularcode", NewStringType::kNormal).ToLocalChecked();
    global->Set(objectName, Object::New(m_isolate));
    m_context.Reset(m_isolate, context);

    m_inspectorHolder.reset(new InspectorHolder(m_isolate, m_context));
    m_internalDebugger.reset(new InternalDebugger(m_isolate, this));
    m_inspectorHolder->setInspectorHandler(m_internalDebugger.get());
    delete create_params.array_buffer_allocator;
}

Typescript::~Typescript()
{
    // must be destroyed before the isolate
    delete m_inspectorHolder->getInspectorHandler();
    m_inspectorHolder.reset();
    m_internalDebugger.release();
    qDeleteAll(m_scriptOrigins);
    m_checkForScriptTimeout->deleteLater();
    m_timeoutCheckerThread->quit();
    m_timeoutCheckerThread->wait();
    if (m_profiler != nullptr) {
        m_profiler->Dispose();
        m_profiler = nullptr;
    }
    for (auto element : m_requireCache.values()) {
        delete element;
    }
    m_function.Reset();
    m_requireTemplate.Reset();
    m_context.Reset();
    m_isolate->Exit();
    m_isolate->Dispose();
    if (m_luaState) {
        lua_close(m_luaState);
    }
}

bool Typescript::canHandle(const QString &filename)
{
    QFileInfo file(filename);
    return file.fileName() == "init.js";
}

void Typescript::setInspectorHandler(AbstractInspectorHandler *handler)
{
    if (m_inspectorHolder->hasInspectorHandler()) {
        m_inspectorHolder.reset(new InspectorHolder(m_isolate, m_context));
    }
    m_inspectorHolder->setInspectorHandler(handler);
}

void Typescript::removeInspectorHandler()
{
    m_inspectorHolder.reset(new InspectorHolder(m_isolate, m_context));
    m_internalDebugger.reset(new InternalDebugger(m_isolate, this));
    m_inspectorHolder->setInspectorHandler(m_internalDebugger.get());
}

bool Typescript::hasInspectorHandler() const
{
    // internal debugger doesn't count
    return m_inspectorHolder->hasInspectorHandler() && m_inspectorHolder->getInspectorHandler() != m_internalDebugger.get();
}

bool Typescript::canConnectInternalDebugger() const
{
    return m_inspectorHolder->hasInspectorHandler() && m_inspectorHolder->getInspectorHandler() == m_internalDebugger.get() &&
            !m_internalDebugger->isConnected();
}

bool Typescript::loadScript(const QString &filename, const QString &entryPoint)
{
    QFile file(filename);
    if (!file.open(QIODevice::ReadOnly | QIODevice::Text)) {
        m_errorMsg = "<font color=\"red\">Could not open file " + filename + "</font>";
        return false;
    }
    QTextStream in(&file);
    QString content = in.readAll();
    QByteArray contentBytes = content.toLatin1();

    HandleScope handleScope(m_isolate);
    Local<Context> context = Local<Context>::New(m_isolate, m_context);
    Context::Scope contextScope(context);

    Local<String> source = String::NewFromUtf8(m_isolate,
                                        contentBytes.data(), NewStringType::kNormal).ToLocalChecked();

    // Compile the source code.
    Local<Script> script;
    TryCatch tryCatch(m_isolate);
    if (!Script::Compile(context, source, scriptOriginFromFileName(filename)).ToLocal(&script)) {
        String::Utf8Value error(m_isolate, tryCatch.StackTrace(context).ToLocalChecked());
        m_errorMsg = "<font color=\"red\">" + QString(*error) + "</font>";
        return false;
    }

    // execute the script once to get entrypoints etc.
    m_currentExecutingModule = m_filename;
    USE(script->Run(context));
    if (tryCatch.HasTerminated() || tryCatch.HasCaught()) {
        String::Utf8Value error(m_isolate, tryCatch.Exception());
        m_errorMsg = "<font color=\"red\">" + QString(*error) + "</font>";
        return false;
    }
    Local<Object> initExport = Local<Value>::New(m_isolate, *m_requireCache[m_filename])->ToObject(context).ToLocalChecked();
    Local<String> scriptInfoString = String::NewFromUtf8(m_isolate, "scriptInfo", NewStringType::kNormal).ToLocalChecked();
    if (!initExport->Has(context, scriptInfoString).ToChecked()) {
        // the script returns nothing
        m_errorMsg = "<font color=\"red\">Script must export scriptInfo object!</font>";
        return false;
    }
    Local<Value> result = initExport->Get(context, scriptInfoString).ToLocalChecked();

    if (!result->IsObject()) {
        m_errorMsg = "<font color=\"red\">scriptInfo export must be an object!</font>";
        return false;
    }

    Local<Object> resultObject = result->ToObject(context).ToLocalChecked();
    Local<String> nameString = String::NewFromUtf8(m_isolate, "name", NewStringType::kNormal).ToLocalChecked();
    Local<String> entrypointsString = String::NewFromUtf8(m_isolate, "entrypoints", NewStringType::kNormal).ToLocalChecked();
    if (!resultObject->Has(nameString) || !resultObject->Has(entrypointsString)) {
        m_errorMsg = "<font color=\"red\">scriptInfo export must be an object containing 'name' and 'entrypoints'!</font>";
        return false;
    }

    Local<Value> maybeName = resultObject->Get(nameString);
    if (!maybeName->IsString()) {
        m_errorMsg = "<font color=\"red\">Script name must be a string!</font>";
        return false;
    }
    Local<String> name = maybeName->ToString(context).ToLocalChecked();
    m_name = QString(*String::Utf8Value(name));

    Local<Value> maybeEntryPoints = resultObject->Get(entrypointsString);
    if (!maybeEntryPoints->IsObject()) {
        m_errorMsg = "<font color=\"red\">Entrypoints must be an object!</font>";
        return false;
    }

    m_entryPoints.clear();
    QMap<QString, Local<Function>> entryPoints;
    Local<Object> entrypointsObject = maybeEntryPoints->ToObject(context).ToLocalChecked();
    Local<Array> properties = entrypointsObject->GetOwnPropertyNames();
    for (unsigned int i = 0;i<properties->Length();i++) {
        Local<Value> key = properties->Get(i);
        Local<Value> value = entrypointsObject->Get(key);
        if (!value->IsFunction()) {
            m_errorMsg = "<font color=\"red\">Entrypoints must contain functions!</font>";
            return false;
        }
        Local<Function> function = Local<Function>::Cast(value);

        QString keyString(*String::Utf8Value(key));
        m_entryPoints.append(keyString);
        entryPoints[keyString] = function;
    }

    if (!chooseEntryPoint(entryPoint)) {
        return false;
    }

    // handle strategy options
    Local<String> optionsString = String::NewFromUtf8(m_isolate, "options", NewStringType::kNormal).ToLocalChecked();
    QStringList optionsList;
    if (resultObject->Has(optionsString)) {
        if (!resultObject->Get(optionsString)->IsArray()) {
            m_errorMsg = "<font color=\"red\">options must be an array!</font>";
            return false;
        }
        Local<Array> options = Local<Array>::Cast(resultObject->Get(optionsString));
        for (unsigned int i = 0;i<options->Length();i++) {
            QString option(*String::Utf8Value(options->Get(i)));
            optionsList.append(option);
        }
    }
    m_options = optionsList;

    m_function.Reset(m_isolate, entryPoints[m_entryPoint]);
    return true;
}

void Typescript::defineModule(const FunctionCallbackInfo<Value> &args)
{
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    Isolate *isolate = args.GetIsolate();
    Local<Array> imports = Local<Array>::Cast(args[0]);
    Local<Function> module = Local<Function>::Cast(args[1]);

    std::vector<Local<Value>> parameters;

    Local<FunctionTemplate> requireTemplate = Local<FunctionTemplate>::New(isolate, t->m_requireTemplate);
    Local<Context> context = isolate->GetCurrentContext();
    parameters.push_back(requireTemplate->GetFunction(context).ToLocalChecked());

    Local<Object> exports = Object::New(isolate);
    parameters.push_back(exports);
    t->m_requireCache[t->m_currentExecutingModule] = new Global<Value>(isolate, exports);


    for (unsigned int i = 2;i<imports->Length();i++) {
        QString name = *String::Utf8Value(imports->Get(context, i).ToLocalChecked());
        if (!t->loadModule(name)) {
            return;
        }
        Local<Value> mod = Local<Value>::New(isolate, *t->m_requireCache[name]);
        parameters.push_back(mod);
    }

    TryCatch tryCatch(isolate);
    USE(module->Call(context, context->Global(), parameters.size(), parameters.data()));
    if (tryCatch.HasCaught() || tryCatch.HasTerminated()) {
        tryCatch.ReThrow();
        return;
    }
}

void Typescript::registerDefineFunction(Local<ObjectTemplate> global)
{
    Local<String> name = String::NewFromUtf8(m_isolate, "define", NewStringType::kNormal).ToLocalChecked();
    global->Set(name, FunctionTemplate::New(m_isolate, defineModule, External::New(m_isolate, this)));

    Local<FunctionTemplate> requireTemplate = FunctionTemplate::New(m_isolate, performRequire, External::New(m_isolate, this));
    m_requireTemplate.Reset(m_isolate, requireTemplate);
}

ScriptOrigin *Typescript::scriptOriginFromFileName(QString name)
{
    ScriptOrigin *origin = new ScriptOrigin(String::NewFromUtf8(m_isolate, name.toStdString().c_str(), NewStringType::kNormal).ToLocalChecked(),
                                            Local<Integer>(), Local<Integer>(), Local<Boolean>(), Integer::New(m_isolate, m_scriptIdCounter));
    m_scriptIdCounter++;
    m_scriptOrigins.push_back(origin);
    return origin;
}

bool Typescript::loadModule(QString name)
{
    if (!m_requireCache.contains(name)) {
        QFileInfo initInfo(m_filename);
        QFile file(initInfo.absolutePath() + "/" + name + ".js");
        file.open(QIODevice::ReadOnly);
        QTextStream in(&file);
        QString content = in.readAll();
        QByteArray contentBytes = content.toLatin1();

        Local<String> source = String::NewFromUtf8(m_isolate,
                                            contentBytes.data(), NewStringType::kNormal).ToLocalChecked();
        Local<Context> context = m_isolate->GetCurrentContext();

        // Compile the source code.
        Local<Script> script;
        TryCatch tryCatch(m_isolate);
        if (!Script::Compile(context, source, scriptOriginFromFileName(filename)).ToLocal(&script)) {
            tryCatch.ReThrow();
            return false;
        }

        // execute the script once to get entrypoints etc.
        QString moduleBefore = m_currentExecutingModule;
        m_currentExecutingModule = name;
        USE(script->Run(context));
        if (tryCatch.HasCaught() || tryCatch.HasTerminated()) {
            tryCatch.ReThrow();
            return false;
        }
        m_currentExecutingModule = moduleBefore;
    }
    return true;
}

void Typescript::performRequire(const FunctionCallbackInfo<Value> &args)
{
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    QString name(*String::Utf8Value(args[0]));
    t->loadModule(name);
    args.GetReturnValue().Set(*t->m_requireCache[name]);
}

void Typescript::addPathTime(double time)
{
    m_totalPathTime += time;
}

void Typescript::saveNode(QTextStream &file, const CpuProfileNode *node, QString functionStack)
{
    QString functionLine = QString(node->GetScriptId() == 0 ? "C" : node->GetScriptResourceNameStr()) + ":"
            + QString(node->GetFunctionNameStr()) + "\n";
    QString newStack = functionLine + functionStack;
    file <<newStack;
    file <<'\t'<<node->GetHitCount()<<'\n';
    for (int i = 0;i<node->GetChildrenCount();i++) {
        saveNode(file, node->GetChild(i), newStack);
    }
}

void Typescript::startProfiling()
{
    HandleScope handleScope(m_isolate);
    m_profiler = CpuProfiler::New(m_isolate);
    m_profiler->SetSamplingInterval(200);
    m_profiler->StartProfiling(String::NewFromUtf8(m_isolate, "profile", NewStringType::kNormal).ToLocalChecked());
}

void Typescript::endProfiling(const std::string &filename)
{
    HandleScope handleScope(m_isolate);
    if (m_profiler == nullptr) {
        qFatal("Stopped typescript profiling before being started");
    }
    CpuProfile *profile = m_profiler->StopProfiling(String::NewFromUtf8(m_isolate, "profile", NewStringType::kNormal).ToLocalChecked());
    QFile file(filename.c_str());
    if (file.open(QFile::WriteOnly)) {
        QTextStream stream(&file);
        saveNode(stream, profile->GetTopDownRoot(), "");
    }
    m_profiler->Dispose();
    m_profiler = nullptr;
}

bool Typescript::process(double &pathPlanning)
{
    m_executionCounter++;
    m_timeoutCounter.store(m_executionCounter);

    m_totalPathTime = 0;

    HandleScope handleScope(m_isolate);
    Local<Context> context = Local<Context>::New(m_isolate, m_context);
    Context::Scope contextScope(context);

    TryCatch tryCatch(m_isolate);
    Local<Function> function = Local<Function>::New(m_isolate, m_function);
    USE(function->Call(context, context->Global(), 0, nullptr));
    if (tryCatch.HasTerminated() || tryCatch.HasCaught()) {
        Local<Value> stackTrace;
        if (tryCatch.StackTrace(context).ToLocal(&stackTrace)) {
            String::Utf8Value error(m_isolate, stackTrace);
            QString errorString(*error);
            errorString.replace("\n", "<br>");
            m_errorMsg = "<font color=\"red\">" + errorString + "</font>";
        } else {
            Local<Message> message = tryCatch.Message();
            if (!message.IsEmpty()) {
                String::Utf8Value exception(m_isolate, tryCatch.Exception());
                QString exceptionString(*exception);
                exceptionString.replace("\n", "<br>");
                m_errorMsg = "<font color=\"red\">" + exceptionString + "</font>";
            } else {
                // this will only happen if the script was terminated by CheckForScriptTimeout
                m_errorMsg = "<font color=\"red\">Script timeout</font>";
            }
        }
        return false;
    }
    pathPlanning = m_totalPathTime;
    m_timeoutCounter.store(0);
    return true;
}

void Typescript::disableTimeoutOnce()
{
    m_timeoutCounter.store(0);
}
