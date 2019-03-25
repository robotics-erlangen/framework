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
#include <QDebug>
#include <QThread>
#include <vector>
#include <v8.h>
#include <libplatform/libplatform.h>
#include <lua.hpp>
#include <SourceMap/RevisionThree.h>
#include <SourceMap/Extension/Interpolation.h>

#include "js_amun.h"
#include "js_path.h"
#include "checkforscripttimeout.h"
#include "inspectorholder.h"
#include "internaldebugger.h"
#include "typescriptcompiler.h"

using namespace v8;

// use this to silence a warn_unused_result warning
template <typename T> inline void USE(T&&) {}

Typescript::Typescript(const Timer *timer, StrategyType type, bool debugEnabled, bool refboxControlEnabled) :
    AbstractStrategyScript (timer, type, debugEnabled, refboxControlEnabled),
    m_requireCache({{}}),
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
    for (auto &cache : m_requireCache) {
        for (auto element : cache.values()) {
            // TODO: When applying tsc's memory Modell, where JS-Objects may delete C++ Objects when GC collectes them,
            // Reset element first and delete it afterwards (Or does JS / v8 handle that itself?)
            delete element;
        }
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
    QString fname = file.fileName();
    return fname == "init.js" || fname == "init.ts";
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

static MaybeLocal<Value> callFunction(const Local<Context>& c, QString& errorMsg, Local<Object>& object, const char* funName, Isolate* isolate, std::vector<Local<Value>>&& parameters = {})
{
    Local<String> funNameString = String::NewFromUtf8(isolate, funName, NewStringType::kNormal).ToLocalChecked();
    Local<Function> fun(Local<Function>::Cast(object->Get(funNameString)));
    MaybeLocal<Value> maybeResult = fun->Call(c, object, parameters.size(), parameters.data());
    if (maybeResult.IsEmpty()) {
        errorMsg = errorMsg + "Calling " + funName + " did not result in a castable result! <br>";
    }
    return maybeResult;
}

static void evaluateStackFrame(const Local<Context>& c, QString& errorMsg, Local<Object> callSite, Isolate* isolate)
{
    errorMsg += "at ";
    MaybeLocal<Value> funName = callFunction(c, errorMsg, callSite, "getFunctionName", isolate);
    String::Utf8Value funString(isolate, funName.ToLocalChecked());
    QString funQString(*funString);
    if (!callFunction(c, errorMsg, callSite, "isConstructor", isolate).ToLocalChecked()->ToBoolean()->Value()) {
        MaybeLocal<Value> toplevelOpt = callFunction(c, errorMsg, callSite, "isToplevel", isolate);
        if (!toplevelOpt.ToLocalChecked()->ToBoolean()->Value()) {
            //Find Typename
            MaybeLocal<Value> typeName = callFunction(c, errorMsg, callSite, "getTypeName", isolate);
            String::Utf8Value nameString(isolate, typeName.ToLocalChecked());
            errorMsg += QString(*nameString) + ".";
        }
        errorMsg += funQString;
        MaybeLocal<Value> methodName = callFunction(c, errorMsg, callSite, "getMethodName", isolate);

        Local<Value> methName = methodName.ToLocalChecked();
        if (!methName->IsNull()) {
            String::Utf8Value methString(isolate, methName);
            QString methQString(*methString);
            if (methQString != funQString) {
                errorMsg = errorMsg + " [as " + methQString + "]";
            }
        }
    } else {
        errorMsg += "new "+funQString;
    }

    MaybeLocal<Value> isEval = callFunction(c, errorMsg, callSite, "isEval", isolate);
    if (isEval.ToLocalChecked()->ToBoolean()->Value()) {
        MaybeLocal<Value> evalOrig = callFunction(c, errorMsg, callSite, "getEvalOrigin", isolate);
        String::Utf8Value evalOrigString(isolate, evalOrig.ToLocalChecked());
        errorMsg = errorMsg + " (" + QString(*evalOrigString) + ")<br>";
        return;
    }
    // No eval
    MaybeLocal<Value> fileName = callFunction(c, errorMsg, callSite, "getFileName", isolate);
    String::Utf8Value fileString(isolate, fileName.ToLocalChecked());
    QString fileQString(*fileString);
    QFile jsfile(fileQString);
    QString tsSourcemapQString;
    QFileInfo jsInfo(jsfile);
    QDir absJSDir = jsInfo.absoluteDir();
    MaybeLocal<Value> lineNumber = callFunction(c, errorMsg, callSite, "getLineNumber", isolate);
    uint32_t lineUint = lineNumber.ToLocalChecked()->Uint32Value();
    MaybeLocal<Value> columnNumber = callFunction(c, errorMsg, callSite, "getColumnNumber", isolate);
    uint32_t columnUint = columnNumber.ToLocalChecked()->Uint32Value();
    if (jsfile.open(QIODevice::ReadOnly | QIODevice::Text)) {
        QList<QByteArray> jsLineList = QByteArray(jsfile.readAll()).split('\n');
#if QT_VERSION >= QT_VERSION_CHECK(5,6,0)
        for (auto revIt = jsLineList.rbegin(); revIt != jsLineList.rend(); ++revIt) {
#else
        for (auto revIt = jsLineList.begin(); revIt != jsLineList.end(); ++revIt) {
#endif
            QString line = QString::fromUtf8(*revIt);
            if (line.startsWith("//# ")) {
                QStringList entries = line.right(line.size()-4).split("=");
                if (entries[0] == "sourceMappingURL") {
                    tsSourcemapQString = absJSDir.canonicalPath() + "/" + entries[1];
                    break;
                }
            }
        }
    }
    if (!tsSourcemapQString.isEmpty()) {
        QFile tsSourcemap(tsSourcemapQString);
        if (tsSourcemap.open(QIODevice::ReadOnly | QIODevice::Text)) {
            QByteArray arr(tsSourcemap.readAll());
            SourceMap::RevisionThree sourceMap = SourceMap::RevisionThree::fromJson(arr);
            QString tsFileName = absJSDir.canonicalPath() + "/" + *(sourceMap.sources().begin()); // assume that there is only one sourceFile for any js file
            SourceMap::Position jsPos(lineUint, columnUint);
            auto decodedMapping = sourceMap.decodedMappings<SourceMap::Data<SourceMap::Extension::Interpolation>>();
            SourceMap::Mapping<SourceMap::Extension::Interpolation> mapping(decodedMapping);
            const SourceMap::Entry<SourceMap::Extension::Interpolation>* entry(mapping.findEntryByGenerated(jsPos));
            if (entry) {
                fileQString = QFileInfo(tsFileName).absoluteFilePath();
                lineUint = entry->original.line;
                columnUint = entry->original.column;
            }
        }
    }
    errorMsg = errorMsg + " (" + fileQString + ":";
    errorMsg += QString::number(lineUint) + ":";
    errorMsg += QString::number(columnUint) + ")<br>";
}

static void buildStackTrace(const Local<Context>& context, QString& errorMsg, const TryCatch& tryCatch, Isolate* isolate)
{
    if (tryCatch.HasTerminated() || tryCatch.HasCaught()) {
        errorMsg = "<font color=\"red\">";
        Local<Message> checkMessage = tryCatch.Message();
        Local<Value> message = tryCatch.Exception();
        // When the strategy is beeing terminated by Script timeout,
        // there is no JS representation for this exception.
        // However, there is an exception so message.IsEmpty returns false.
        // To check that this is happening, we use checkMessage.
        // As .Message() returns the associated message to the exception,
        // which is not present if the exception does not have a JS representation,
        // this handle will be empty.
        if (!checkMessage.IsEmpty()) {
            String::Utf8Value exception(isolate, message);
            QString exceptionString(*exception);
            exceptionString.replace("\n", "<br>");
            errorMsg += exceptionString + "<br>";
        } else {
            errorMsg += "has no message <br>";
        }
        Local<Value> stackTrace;
        if (tryCatch.StackTrace(context).ToLocal(&stackTrace)) {
            if (stackTrace->IsArray()) {
                Local<Array> stackArray = Local<Array>::Cast(stackTrace);
                for (uint32_t i = 0; i < stackArray->Length(); ++i) {
                    Local<Object> callSite = stackArray->Get(i)->ToObject();
                    evaluateStackFrame(context, errorMsg, callSite, isolate);
                }
                errorMsg += "</font>";
            } else {
                // this will hapen when a strategy does not set Error.prepareStackTrace
                // this disables the option to use sourcemaps
                // we support it to avoid crashes when used with legacy strategy
                String::Utf8Value stringStack(isolate, stackTrace);
                QString exceptionString(*stringStack);
                exceptionString.replace("\n", "<br>");
                errorMsg = "<font color=\"red\">" + exceptionString + "</font>";
            }
        } else {
            // this will happen when an exception is created without an error object, i.e. throw "some error"
            if (!checkMessage.IsEmpty()) {
                String::Utf8Value exception(isolate, message);
                QString exceptionString(*exception);
                exceptionString.replace("\n", "<br>");
                errorMsg = "<font color=\"red\">" + exceptionString + "</font>";
            } else {
                // this will only happen if the script was terminated by CheckForScriptTimeout
                errorMsg = "<font color=\"red\">Script timeout</font>";
            }
        }
    }
}

bool Typescript::loadScript(const QString &fname, const QString &entryPoint)
{
    QString filename;
    if (fname.endsWith(".ts")) {
        bool compile_success = true;
        TypescriptCompiler tsc;
        tsc.startCompiler(fname, [this, &compile_success](int exit){
                if (exit == 0) {
                    return;
                }
                m_errorMsg = "<font color=\"red\">Compilation failed with exitcode " + QString::number(exit) + "</font>";
                compile_success = false;
                });
        filename = TypescriptCompiler::outputPath(fname);
        m_filename = QString();
        return compile_success && AbstractStrategyScript::loadScript(filename, entryPoint, geometry(), team());
    } else {
        filename = fname;
    }
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
        buildStackTrace(context,m_errorMsg, tryCatch, m_isolate);
        return false;
    }
    Local<Object> initExport = Local<Value>::New(m_isolate, *m_requireCache.back()[m_filename])->ToObject(context).ToLocalChecked();
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
    if (t->m_requireCache.back().contains(t->m_currentExecutingModule)) {
        // TODO: See destructor
        delete t->m_requireCache.back()[t->m_currentExecutingModule];
    }
    t->m_requireCache.back()[t->m_currentExecutingModule] = new Global<Value>(isolate, exports);


    for (unsigned int i = 2;i<imports->Length();i++) {
        QString name = *String::Utf8Value(imports->Get(context, i).ToLocalChecked());
        if (!t->loadModule(name)) {
            return;
        }
        Local<Value> mod = Local<Value>::New(isolate, *t->m_requireCache.back()[name]);
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

void Typescript::throwException(QString text)
{
    Local<String> exception = String::NewFromUtf8(m_isolate, text.toStdString().c_str(), NewStringType::kNormal).ToLocalChecked();
    m_isolate->ThrowException(Exception::Error(exception));
}

bool Typescript::loadModule(QString name)
{
    if (!m_requireCache.back().contains(name)) {
        QFileInfo initInfo(m_filename);
        QDir typescriptDir = initInfo.absoluteDir();
        typescriptDir.cdUp();
        QString filename = typescriptDir.absolutePath() + "/" + name + ".js";
        QFile file(filename);
        if (!file.open(QIODevice::ReadOnly)) {
            throwException("Could not import module: " + name);
            return false;
        }
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

        // insert a default module content in case no define function is called in the module
        Local<Object> defaultEmptyModule = Object::New(m_isolate);
        m_requireCache.back()[name] = new Global<Value>(m_isolate, defaultEmptyModule);

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
    Local<Context> context = args.GetIsolate()->GetCurrentContext();

    bool cleanRequire = false;
    if (args.Length() > 1) {
        USE(args[1]->BooleanValue(context).To(&cleanRequire));
        if (cleanRequire) {
            t->m_requireCache.push_back({});
        }
    }
    if (args.Length() > 2) {
        if (!cleanRequire || !args[2]->IsObject()) {
            t->throwException("Overlays can only be used with a clean require and must be an object!");
            return;
        }
        Local<Object> overlays = args[2]->ToObject(context).ToLocalChecked();
        Local<Array> properties = overlays->GetOwnPropertyNames();
        for (unsigned int i = 0;i<properties->Length();i++) {
            Local<Value> key = properties->Get(i);
            Local<Value> value = overlays->Get(key);

            QString keyString(*String::Utf8Value(key));
            t->m_requireCache.back()[keyString] = new Global<Value>(args.GetIsolate(), value);
        }
    }

    QString name(*String::Utf8Value(args[0]));
    if (t->loadModule(name)) {
        args.GetReturnValue().Set(*t->m_requireCache.back()[name]);
    }

    // remove new require module stack layer
    if (cleanRequire) {
        for (auto element : t->m_requireCache.back().values()) {
            delete element;
        }
        t->m_requireCache.pop_back();
    }
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
    buildStackTrace(context, m_errorMsg, tryCatch, m_isolate);
    if (tryCatch.HasTerminated() || tryCatch.HasCaught()) {
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

void Typescript::tryCatch(v8::Local<v8::Function> tryBlock, v8::Local<v8::Function> thenBlock, v8::Local<v8::Function> catchBlock, v8::Local<v8::Object> element, bool printStackTrace)
{
    Local<Context> c = m_isolate->GetCurrentContext();
    std::vector<Local<Value>> parameters({element});
    Local<Object> global = c->Global();
    {
        TryCatch tc(m_isolate);
        if (!printStackTrace) {
            m_inspectorHolder->setIsIgnoringMessages(true);
        }
        USE(tryBlock->Call(c, global, parameters.size(), parameters.data()));
        if (!printStackTrace) {
            m_inspectorHolder->setIsIgnoringMessages(false);
        }
        if (tc.HasCaught() || tc.HasTerminated()) {
            Local<Value> exception = tc.Exception();

            parameters.insert(parameters.begin(), exception);
            TryCatch catchTryCatch(m_isolate);
            USE(catchBlock->Call(c, global, parameters.size(), parameters.data()));
            if (catchTryCatch.HasCaught() || catchTryCatch.HasTerminated()) {
                catchTryCatch.ReThrow();
                tc.ReThrow();
                return;
            }
            if (printStackTrace) {
                QString output;
                buildStackTrace(c, output, tc, m_isolate);
                log(output);
                return;
            }
            return;
        }
    } // close tryCatch
    USE(thenBlock->Call(c, global, parameters.size(), parameters.data()));
}
