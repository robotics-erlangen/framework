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
#include "inspectorserver.h"
#include "tsc_internal.h"
#include "strategy/script/compilerregistry.h"
#include "strategy/script/scriptstate.h"
#include "v8utility.h"

using namespace v8;
using namespace v8helper;

// use this to silence a warn_unused_result warning
template <typename T> inline void USE(T&&) {}

Typescript::Typescript(const Timer *timer, StrategyType type, ScriptState& scriptState, CompilerRegistry* registry) :
    AbstractStrategyScript (timer, type, scriptState, registry),
    m_requireCache({{}}),
    m_executionCounter(0),
    m_profiler (nullptr),
    m_scriptIdCounter(0),
    m_luaState(nullptr)
{
    Isolate::CreateParams create_params;
    m_arrayAllocator.reset(ArrayBuffer::Allocator::NewDefaultAllocator());
    create_params.array_buffer_allocator = m_arrayAllocator.get();
    m_isolate = Isolate::New(create_params);
    m_isolate->SetRAILMode(PERFORMANCE_LOAD);
    m_isolate->Enter();

    // creates its own QThread and moves to it
    m_checkForScriptTimeout = new CheckForScriptTimeout(m_isolate, m_timeoutCounter);
    m_timeoutCheckerThread = new QThread(this);
    m_timeoutCheckerThread->start();
    m_checkForScriptTimeout->moveToThread(m_timeoutCheckerThread);

    // construct inspector server
    int inspectorPort = 0;
    switch (m_type) {
    case StrategyType::BLUE:
        inspectorPort = 3415;
        break;
    case StrategyType::YELLOW:
        inspectorPort = 3416;
        break;
    case StrategyType::AUTOREF:
        inspectorPort = 3417;
        break;
    }
    m_inspectorServer = std::unique_ptr<InspectorServer>(new InspectorServer(inspectorPort, this));
}

Typescript::~Typescript()
{
    if (m_inspectorHolder) {
        // must be destroyed before the isolate
        delete m_inspectorHolder->getInspectorHandler();
        m_inspectorHolder.reset();
    }
    m_internalDebugger.release();
    qDeleteAll(m_scriptOrigins);
    m_checkForScriptTimeout->deleteLater();
    m_timeoutCheckerThread->quit();
    m_timeoutCheckerThread->wait();
    if (m_profiler != nullptr) {
        m_profiler->Dispose();
        m_profiler = nullptr;
    }
    clearRequireCache();
    m_function.Reset();
    m_requireTemplate.Reset();
    m_context.Reset();
    m_isolate->Exit();
    m_isolate->Dispose();
    if (m_luaState) {
        lua_close(m_luaState);
    }
}

void Typescript::clearRequireCache()
{
    for (auto &cache : m_requireCache) {
        for (auto element : cache.values()) {
            // TODO: When applying tsc's memory Modell, where JS-Objects may delete C++ Objects when GC collectes them,
            // Reset element first and delete it afterwards (Or does JS / v8 handle that itself?)
            delete element;
        }
    }
    m_requireCache = {{}};
}

static void scriptTimeoutCallback(v8::Isolate*, void* data) {
    static_cast<InspectorHolder*>(data)->breakProgram("Script timeout");
}

void Typescript::createGlobalScope()
{
    HandleScope handleScope(m_isolate);
    Local<ObjectTemplate> globalTemplate = ObjectTemplate::New(m_isolate);
    registerDefineFunction(globalTemplate);
    Local<Context> context = Context::New(m_isolate, nullptr, globalTemplate);
    Context::Scope contextScope(context);
    Local<Object> global = context->Global();
    registerAmunJsCallbacks(m_isolate, global, this);
    registerPathJsCallbacks(m_isolate, global, this);
    // create an empty global variable used for debugging
    Local<String> objectName = v8string(m_isolate, "___globalpleasedontuseinregularcode");
    global->Set(context, objectName, Object::New(m_isolate)).Check();
    m_context.Reset(m_isolate, context);

    m_inspectorHolder.reset();
    m_inspectorHolder.reset(new InspectorHolder(m_isolate, m_context));
    m_checkForScriptTimeout->setTimeoutCallback(scriptTimeoutCallback, m_inspectorHolder.get());
    m_internalDebugger.reset(new InternalDebugger(m_isolate, this));
    m_inspectorHolder->setInspectorHandler(m_internalDebugger.get());
}

bool Typescript::canHandle(const QString &filename)
{
    QFileInfo file(filename);
    QString fname = file.fileName();
    return fname == "init.ts";
}

void Typescript::setInspectorHandler(AbstractInspectorHandler *handler)
{
    if (m_inspectorHolder->hasInspectorHandler()) {
        m_inspectorHolder.reset();
        m_inspectorHolder.reset(new InspectorHolder(m_isolate, m_context));
        m_checkForScriptTimeout->setTimeoutCallback(scriptTimeoutCallback, m_inspectorHolder.get());
    }
    m_inspectorHolder->setInspectorHandler(handler);
}

void Typescript::removeInspectorHandler()
{
    m_inspectorHolder.reset();
    m_inspectorHolder.reset(new InspectorHolder(m_isolate, m_context));
    m_checkForScriptTimeout->setTimeoutCallback(scriptTimeoutCallback, m_inspectorHolder.get());
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
    Local<String> funNameString = v8string(isolate, funName);
    Local<Value> functionValue = object->Get(c, funNameString).ToLocalChecked();
    Local<Function> fun = Local<Function>::Cast(functionValue);
    MaybeLocal<Value> maybeResult = fun->Call(c, object, parameters.size(), parameters.data());
    if (maybeResult.IsEmpty()) {
        errorMsg = errorMsg + "Calling " + funName + " did not result in a castable result! <br>";
    }
    return maybeResult;
}

static std::unique_ptr<QDir> getTsconfigDir(const QString &filename)
{
    QDir baseDir = QFileInfo(filename).absoluteDir();
    while (true) {
        if (QFileInfo(baseDir, "tsconfig.json").exists())
            break;
        if (!baseDir.cdUp())
            return nullptr;
    }
    return std::unique_ptr<QDir>(new QDir(baseDir));
}

QString Typescript::resolveJsToTs(QString fileQString, uint32_t lineUint, uint32_t columnUint)
{
    QFile jsfile(fileQString);
    QString tsSourcemapQString;
    QFileInfo jsInfo(jsfile);
    QDir absJSDir = jsInfo.absoluteDir();
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
            const QStringList sources = sourceMap.sources();
            QString tsFileName = absJSDir.canonicalPath() + "/" + sources.first(); // assume that there is only one sourceFile for any js file
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
    auto basePath = getTsconfigDir(fileQString);
    if (basePath) {
        fileQString = fileQString.replace(basePath->absolutePath() + "/", "");
    }

    return fileQString + ":" + QString::number(lineUint) + ":" + QString::number(columnUint);
}

void Typescript::evaluateStackFrame(const Local<Context>& c, QString& errorMsg, Local<Object> callSite)
{
    errorMsg += "at ";
    MaybeLocal<Value> funName = callFunction(c, errorMsg, callSite, "getFunctionName", m_isolate);
    String::Utf8Value funString(m_isolate, funName.ToLocalChecked());
    QString funQString(*funString);
    if (!callFunction(c, errorMsg, callSite, "isConstructor", m_isolate)
            .ToLocalChecked()
            ->BooleanValue(m_isolate)) {
        MaybeLocal<Value> toplevelOpt = callFunction(c, errorMsg, callSite, "isToplevel", m_isolate);
        if (!toplevelOpt.ToLocalChecked()->BooleanValue(m_isolate)) {
            //Find Typename
            MaybeLocal<Value> typeName = callFunction(c, errorMsg, callSite, "getTypeName", m_isolate);
            String::Utf8Value nameString(m_isolate, typeName.ToLocalChecked());
            errorMsg += QString(*nameString) + ".";
        }
        errorMsg += funQString;
        MaybeLocal<Value> methodName = callFunction(c, errorMsg, callSite, "getMethodName", m_isolate);

        Local<Value> methName = methodName.ToLocalChecked();
        if (!methName->IsNull()) {
            String::Utf8Value methString(m_isolate, methName);
            QString methQString(*methString);
            if (methQString != funQString) {
                errorMsg = errorMsg + " [as " + methQString + "]";
            }
        }
    } else {
        errorMsg += "new "+funQString;
    }

    MaybeLocal<Value> isEval = callFunction(c, errorMsg, callSite, "isEval", m_isolate);
    if (isEval.ToLocalChecked()->BooleanValue(m_isolate)) {
        MaybeLocal<Value> evalOrig = callFunction(c, errorMsg, callSite, "getEvalOrigin", m_isolate);
        String::Utf8Value evalOrigString(m_isolate, evalOrig.ToLocalChecked());
        errorMsg = errorMsg + " (" + QString(*evalOrigString) + ")<br>";
        return;
    }
    // No eval
    MaybeLocal<Value> fileName = callFunction(c, errorMsg, callSite, "getFileName", m_isolate);
    MaybeLocal<Value> lineNumber = callFunction(c, errorMsg, callSite, "getLineNumber", m_isolate);
    uint32_t lineUint = lineNumber.ToLocalChecked()->Uint32Value(c).ToChecked();
    MaybeLocal<Value> columnNumber = callFunction(c, errorMsg, callSite, "getColumnNumber", m_isolate);
    uint32_t columnUint = columnNumber.ToLocalChecked()->Uint32Value(c).ToChecked();
    String::Utf8Value fileString(m_isolate, fileName.ToLocalChecked());
    QString fileQString(*fileString);

    errorMsg += " (" + resolveJsToTs(fileQString, lineUint, columnUint) + ")<br>";
}

void Typescript::handleDebug(const amun::DebugValue &debug)
{
    addDebug()->CopyFrom(debug);
}

void Typescript::handleLog(const QString &text)
{
    log(text);
}

void Typescript::handleVisualization(const amun::Visualization &vis)
{
    addVisualization()->CopyFrom(vis);
}

bool Typescript::buildStackTrace(const Local<Context>& context, QString& errorMsg, const TryCatch& tryCatch)
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
        if (!checkMessage.IsEmpty() || !message.IsEmpty()) {
            String::Utf8Value exception(m_isolate, message);
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
                    Local<Object> callSite = stackArray->Get(context, i).ToLocalChecked().As<Object>();
                    evaluateStackFrame(context, errorMsg, callSite);
                }
                errorMsg += "</font>";
            } else {
                // this will hapen when a strategy does not set Error.prepareStackTrace
                // this disables the option to use sourcemaps
                // we support it to avoid crashes when used with legacy strategy
                String::Utf8Value stringStack(m_isolate, stackTrace);
                QString exceptionString(*stringStack);
                exceptionString.replace("\n", "<br>");
                errorMsg = "<font color=\"red\">" + exceptionString + "</font>";
            }
        } else {
            // this will happen when an exception is created without an error object, i.e. throw "some error"
            if (!checkMessage.IsEmpty()) {
                String::Utf8Value exception(m_isolate, message);
                QString exceptionString(*exception);
                exceptionString.replace("\n", "<br>");
                errorMsg = "<font color=\"red\">" + exceptionString + "</font>";
            } else {
                // this will only happen if the script was terminated by CheckForScriptTimeout
                errorMsg = "<font color=\"red\">Script timeout</font>";
                return true;
            }
        }
    }
    return false;
}

void Typescript::loadScript(const QString &fname, const QString &entryPoint)
{
    m_requestedEntrypoint = entryPoint;
    if (!setupCompiler(fname, false)) {
        m_errorMsg = "<font color=\"red\">Failed to setup compiler (Missing tsconfig.json)</font>";
        emit changeLoadState(amun::StatusStrategy::FAILED);
        return;
    }

    m_inspectorServer->clearHandlers();
    if (m_scriptState.isDebugEnabled) {
        m_inspectorServer->newDebuggagleStrategy(this);
    }

    loadTypescript(fname, entryPoint);
}

void Typescript::compileIfNecessary()
{
    setupCompiler(m_filename, true);
}

bool Typescript::setupCompiler(const QString &filename, bool compileBlocking)
{
    if (m_compiler) {
        disconnect(m_compiler->comp(), nullptr, this, nullptr);
    }

    std::unique_ptr<QDir> baseDir = getTsconfigDir(filename);
    if (!baseDir) {
        return false;
    }

    auto createCompiler = [](const QDir &baseDir) -> std::unique_ptr<Compiler> {
        auto ptr = new InternalTypescriptCompiler(baseDir.filePath("tsconfig.json"));
        return std::unique_ptr<Compiler>(ptr);
    };
    m_compiler = m_compilerRegistry->getCompiler(*baseDir, createCompiler);

    connect(m_compiler->comp(), &Compiler::started, this, &Typescript::onCompileStarted);
    connect(m_compiler->comp(), &Compiler::warning, this, &Typescript::onCompileWarning);
    connect(m_compiler->comp(), &Compiler::error, this, &Typescript::onCompileError);
    connect(m_compiler->comp(), &Compiler::success, this, &Typescript::onCompileSuccess);

    QMetaObject::invokeMethod(m_compiler->comp(), "compile", compileBlocking ? Qt::BlockingQueuedConnection : Qt::AutoConnection);

    return true;
}

bool Typescript::loadTypescript(const QString &filename, const QString &entryPoint)
{
    if (!m_compiler->comp()->requestPause()) {
        m_errorMsg = "<font color=\"red\">Could not pause compiler</font>";
        return false;
    }

    bool success = false;
    if (m_compiler->comp()->isResultAvailable()) {
        QFileInfo jsFile = m_compiler->comp()->mapToResult(QFileInfo(filename));

        success = loadJavascript(jsFile.absoluteFilePath(), entryPoint);
        emit changeLoadState(success ? amun::StatusStrategy::RUNNING : amun::StatusStrategy::FAILED);
    } else {
        m_errorMsg = "<font color=\"red\">No compile result available</font>";
    }
    m_compiler->comp()->resume();
    return success;
}

static QByteArray readFileContent(const QString &filename)
{
    QFile file(filename);
    if (!file.open(QIODevice::ReadOnly | QIODevice::Text)) {
        return QByteArray();
    }
    QTextStream in(&file);
    return in.readAll().toUtf8();
}

bool Typescript::loadJavascript(const QString &filename, const QString &entryPoint)
{
    QByteArray contentBytes = readFileContent(filename);
    if (contentBytes.isNull()) {
        m_errorMsg = "<font color=\"red\">Could not open file " + filename + "</font>";
        return false;
    }

    // clean up old variables and prepare new execution environment
    // this is for the case that the strategy is reloaded in place
    clearRequireCache();
    qDeleteAll(m_scriptOrigins);
    m_scriptOrigins.clear();
    m_scriptIdCounter = 0;
    m_entryPoints.clear();
    createGlobalScope();

    HandleScope handleScope(m_isolate);
    Local<Context> context = Local<Context>::New(m_isolate, m_context);
    Context::Scope contextScope(context);

    Local<String> source = v8string(m_isolate, contentBytes);

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
        if (buildStackTrace(context, m_errorMsg, tryCatch)) {
            m_isolate->CancelTerminateExecution();
        }
        return false;
    }
    Local<Object> initExport = Local<Value>::New(m_isolate, *m_requireCache.back()[m_filename])->ToObject(context).ToLocalChecked();
    Local<String> scriptInfoString = v8string(m_isolate, "scriptInfo");
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
    Local<String> nameString = v8string(m_isolate, "name");
    Local<String> entrypointsString = v8string(m_isolate, "entrypoints");
    if (!resultObject->Has(context, nameString).ToChecked() || !resultObject->Has(context, entrypointsString).ToChecked()) {
        m_errorMsg = "<font color=\"red\">scriptInfo export must be an object containing 'name' and 'entrypoints'!</font>";
        return false;
    }

    Local<Value> maybeName = resultObject->Get(context, nameString).ToLocalChecked();
    if (!maybeName->IsString()) {
        m_errorMsg = "<font color=\"red\">Script name must be a string!</font>";
        return false;
    }
    Local<String> name = maybeName->ToString(context).ToLocalChecked();
    m_name = QString(*String::Utf8Value(m_isolate, name));

    Local<Value> maybeEntryPoints = resultObject->Get(context, entrypointsString).ToLocalChecked();
    if (!maybeEntryPoints->IsObject()) {
        m_errorMsg = "<font color=\"red\">Entrypoints must be an object!</font>";
        return false;
    }

    m_entryPoints.clear();
    QMap<QString, Local<Function>> entryPoints;
    Local<Object> entrypointsObject = maybeEntryPoints->ToObject(context).ToLocalChecked();
    Local<Array> properties = entrypointsObject->GetOwnPropertyNames(context).ToLocalChecked();
    for (unsigned int i = 0;i<properties->Length();i++) {
        Local<Value> key = properties->Get(context, i).ToLocalChecked();
        Local<Value> value = entrypointsObject->Get(context, key).ToLocalChecked();
        if (!value->IsFunction()) {
            m_errorMsg = "<font color=\"red\">Entrypoints must contain functions!</font>";
            return false;
        }
        Local<Function> function = Local<Function>::Cast(value);

        QString keyString(*String::Utf8Value(m_isolate, key));
        m_entryPoints.append(keyString);
        entryPoints[keyString] = function;
    }

    if (!chooseEntryPoint(entryPoint)) {
        return false;
    }

    // handle strategy options
    Local<String> optionsString = v8string(m_isolate, "options");
    Local<String> optionsWithDefaultString = v8string(m_isolate, "optionsWithDefault");

    m_options.clear();
    if (resultObject->Has(context, optionsWithDefaultString).ToChecked()) {
        Local<Value> optionsValue = resultObject->Get(context, optionsWithDefaultString).ToLocalChecked();
        if (!optionsValue->IsArray()) {
            m_errorMsg = "<font color=\"red\">options must be an array!</font>";
            return false;
        }
        Local<Array> options = Local<Array>::Cast(optionsValue);
        for (unsigned int i = 0;i<options->Length();i++) {
            Local<Value> optionValue = options->Get(context, i).ToLocalChecked();
            if (!optionValue->IsArray()) {
                m_errorMsg = "<font color=\"red\">options must contain arrays!</font>";
                return false;
            }
            Local<Array> option = Local<Array>::Cast(optionValue);
            QString optionName(*String::Utf8Value(m_isolate, option->Get(context, 0).ToLocalChecked()));
            bool optionDefault = option->Get(context, 1).ToLocalChecked()->BooleanValue(m_isolate);
            m_options[optionName] = optionDefault;
        }

    } else if (resultObject->Has(context, optionsString).ToChecked()) {
        Local<Value> optionsValue = resultObject->Get(context, optionsString).ToLocalChecked();
        if (!optionsValue->IsArray()) {
            m_errorMsg = "<font color=\"red\">options must be an array!</font>";
            return false;
        }
        Local<Array> options = Local<Array>::Cast(optionsValue);
        for (unsigned int i = 0;i<options->Length();i++) {
            QString option(*String::Utf8Value(m_isolate, options->Get(context, i).ToLocalChecked()));
            m_options[option] = true;
        }
    }

    m_function.Reset(m_isolate, entryPoints[m_entryPoint]);
    return true;
}

void Typescript::onCompileStarted()
{
    emit changeLoadState(amun::StatusStrategy::COMPILING);
    auto dir = QFileInfo(m_filename).dir();
    dir.cdUp();
    emit recordGitDiff(dir.canonicalPath(), true);
}

void Typescript::onCompileWarning(const QString &message)
{
    log(message);
    QString warnString = "<font color=\"khaki\">Warnings occured during compilation</font>";
    log(warnString);
    emit requestReload();
}

void Typescript::onCompileError(const QString &message)
{
    log(message);
    QString errorString = "<font color=\"red\">Errors occured during compilation</font>";
    if (m_scriptState.isTournamentMode) {
        log(errorString);
    } else {
        m_errorMsg = errorString;
        emit changeLoadState(amun::StatusStrategy::FAILED);
    }
}

void Typescript::onCompileSuccess()
{
    loadTypescript(m_filename, m_requestedEntrypoint);
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
        QString name = *String::Utf8Value(isolate, imports->Get(context, i).ToLocalChecked());
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
    Local<String> name = v8string(m_isolate, "define");
    global->Set(name, FunctionTemplate::New(m_isolate, defineModule, External::New(m_isolate, this)));

    Local<FunctionTemplate> requireTemplate = FunctionTemplate::New(m_isolate, performRequire, External::New(m_isolate, this));
    m_requireTemplate.Reset(m_isolate, requireTemplate);
}

ScriptOrigin *Typescript::scriptOriginFromFileName(QString name)
{
    ScriptOrigin *origin = new ScriptOrigin {
        m_isolate,
        v8string(m_isolate, name),
        0,
        0,
        false,
        m_scriptIdCounter
    };
    m_scriptIdCounter++;
    m_scriptOrigins.push_back(origin);
    return origin;
}

bool Typescript::loadModule(QString name)
{
    if (!m_requireCache.back().contains(name)) {

        if (name.contains("..") || name.contains("./")) {
            throwError(m_isolate, "No relative import paths are allowed: " + name);
            return false;
        }

        std::unique_ptr<QDir> baseDir = getTsconfigDir(m_filename);
        QFileInfo jsFile = m_compiler->comp()->mapToResult(baseDir->absolutePath() + "/" + name + ".ts");
        QString filename = jsFile.absoluteFilePath();

        QByteArray contentBytes = readFileContent(filename);
        if (contentBytes.isNull()) {
            throwError(m_isolate, "Could not import module: " + name);
            return false;
        }

        Local<String> source = v8string(m_isolate, contentBytes);
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
    Isolate* isolate = args.GetIsolate();
    Local<Context> context = isolate->GetCurrentContext();

    bool cleanRequire = args.Length() > 1 && args[1]->BooleanValue(isolate);
    if (cleanRequire) {
        t->m_requireCache.push_back({});
    }

    if (args.Length() > 2) {
        if (!cleanRequire || !args[2]->IsObject()) {
            throwError(t->m_isolate, "Overlays can only be used with a clean require and must be an object!");
            return;
        }
        Local<Object> overlays = args[2]->ToObject(context).ToLocalChecked();
        Local<Array> properties = overlays->GetOwnPropertyNames(context).ToLocalChecked();
        for (unsigned int i = 0;i<properties->Length();i++) {
            Local<Value> key = properties->Get(context, i).ToLocalChecked();
            Local<Value> value = overlays->Get(context, key).ToLocalChecked();

            QString keyString(*String::Utf8Value(isolate, key));
            t->m_requireCache.back()[keyString] = new Global<Value>(args.GetIsolate(), value);
        }
    }

    // either load a single file and return the value or load an array of files and return an array
    if (args[0]->IsArray()) {
        Local<Array> requiredFiles = Local<Array>::Cast(args[0]);
        Local<Array> result = Array::New(t->m_isolate);
        bool failed = false;
        for (unsigned int i = 0;i<requiredFiles->Length();i++) {
            QString name(*String::Utf8Value(isolate, requiredFiles->Get(context, i).ToLocalChecked()));
            if (t->loadModule(name)) {
                Local<Value> value = Local<Value>::New(t->m_isolate, *t->m_requireCache.back()[name]);
                result->Set(context, i, value).Check();
            } else {
                failed = true;
            }
        }
        if (!failed) {
            args.GetReturnValue().Set(result);
        }
    } else {
        QString name(*String::Utf8Value(isolate, args[0]));
        if (t->loadModule(name)) {
            args.GetReturnValue().Set(*t->m_requireCache.back()[name]);
        }
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
    m_profiler->StartProfiling(v8string(m_isolate, "profile"));
}

void Typescript::endProfiling(const std::string &filename)
{
    HandleScope handleScope(m_isolate);
    if (m_profiler == nullptr) {
        qFatal("Stopped typescript profiling before being started");
    }
    CpuProfile *profile = m_profiler->StopProfiling(v8string(m_isolate, "profile"));
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
    m_timeoutCounter.store(0);
    if (buildStackTrace(context, m_errorMsg, tryCatch)) {
        m_isolate->CancelTerminateExecution();
    }
    if (tryCatch.HasTerminated() || tryCatch.HasCaught()) {
        return false;
    }
    pathPlanning = m_totalPathTime;
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
                buildStackTrace(c, output, tc);
                log(output);
                return;
            }
            return;
        }
    } // close tryCatch
    USE(thenBlock->Call(c, global, parameters.size(), parameters.data()));
}
