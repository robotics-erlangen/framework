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

#ifndef TYPESCRIPT_H
#define TYPESCRIPT_H

#include "strategy/script/abstractstrategyscript.h"

#include <QString>
#include <QMap>
#include <QTextStream>
#include <QAtomicInt>
#include <v8.h>
#include <v8-profiler.h>
#include <memory>

#include "strategy/script/compiler.h"

class CheckForScriptTimeout;
class QThread;
class InspectorHolder;
class AbstractInspectorHandler;
class InternalDebugger;
class CompilerRegistry;
struct lua_State;
class ScriptState;
class InspectorServer;

class Typescript : public AbstractStrategyScript
{
    Q_OBJECT
public:
    Typescript(const Timer *timer, StrategyType type, ScriptState& scriptState, CompilerRegistry* registry);

    static bool canHandle(const QString &filename);
    ~Typescript() override;
    void addPathTime(double time);

    void startProfiling() override;
    void endProfiling(const std::string &filename) override;
    bool canReloadInPlace() const override { return  true; }
    bool canHandleDynamic(const QString &filename) const override { return Typescript::canHandle(filename); }
    void compileIfNecessary() override;

    // functions used for debugging v8
    void disableTimeoutOnce(); // disables script timeout for the currently running strategy frame
    const v8::Persistent<v8::Context> &getContext() const { return m_context; }
    // gives ownership of the handler to this class
    void setInspectorHandler(AbstractInspectorHandler *handler);
    void removeInspectorHandler();
    bool hasInspectorHandler() const;
    bool canConnectInternalDebugger() const;
    InternalDebugger *getInternalDebugger() const { return m_internalDebugger.get(); }
    lua_State*& luaState() { return m_luaState; }
    void tryCatch(v8::Local<v8::Function> tryBlock, v8::Local<v8::Function> thenBlock, v8::Local<v8::Function> catchBlock, v8::Local<v8::Object> element, bool printStackTrace);

    QString resolveJsToTs(QString fileQString, uint32_t lineUint, uint32_t columnUint);

protected:
    void loadScript(const QString &filename, const QString &entryPoint) override;
    bool process(double &pathPlanning) override;

private:
    static void performRequire(const v8::FunctionCallbackInfo<v8::Value>& args);
    static void defineModule(const v8::FunctionCallbackInfo<v8::Value> &args);
    void registerDefineFunction(v8::Local<v8::ObjectTemplate> global);
    bool loadModule(QString name);
    v8::ScriptOrigin *scriptOriginFromFileName(QString name);
    static void saveNode(QTextStream &file, const v8::CpuProfileNode *node, QString functionStack);
    void clearRequireCache();
    void createGlobalScope();

    // returns true if a script timeout occured
    bool buildStackTrace(const v8::Local<v8::Context>& context, QString& errorMsg, const v8::TryCatch& tryCatch);
    void evaluateStackFrame(const v8::Local<v8::Context>& c, QString& errorMsg, v8::Local<v8::Object> callSite);

    bool setupCompiler(const QString &filename, bool compileBlocking);
    bool loadTypescript(const QString &filename, const QString &entryPoint);
    bool loadJavascript(const QString &filename, const QString &entryPoint);

private slots:
    void onCompileStarted();
    void onCompileWarning(const QString &message);
    void onCompileError(const QString &message);
    void onCompileSuccess();

    void handleDebug(const amun::DebugValue &debug);
    void handleLog(const QString &text);
    void handleVisualization(const amun::Visualization &vis);

private:
    v8::Isolate* m_isolate;
    // The isolate does not take ownership of the allocator.
    // Hence it needs to be stored and deleted manually.
    // Especially this class needs the allocator while the isolate is in use to
    // allow external debuggers to connect. If it were deleted earlier, this
    // would rise a use-after-free.
    // It is uncertain, apart from the above, if the isolate actually needs the
    // allocator after initialization.
    std::unique_ptr<v8::ArrayBuffer::Allocator> m_arrayAllocator;
    v8::Persistent<v8::Context> m_context;
    v8::Persistent<v8::Function> m_function;
    double m_totalPathTime;

    QList<QMap<QString, v8::Global<v8::Value>*>> m_requireCache;
    v8::Persistent<v8::FunctionTemplate> m_requireTemplate;
    QString m_currentExecutingModule;
    QAtomicInt m_timeoutCounter; // used for script timeout
    int m_executionCounter;

    v8::CpuProfiler *m_profiler;
    CheckForScriptTimeout *m_checkForScriptTimeout;
    QThread *m_timeoutCheckerThread;
    QList<v8::ScriptOrigin*> m_scriptOrigins;
    std::unique_ptr<InspectorHolder> m_inspectorHolder;
    std::unique_ptr<InternalDebugger> m_internalDebugger;

    int m_scriptIdCounter;

    lua_State* m_luaState;
    std::shared_ptr<CompilerThreadWrapper> m_compiler;

    QString m_requestedEntrypoint;

    std::unique_ptr<InspectorServer> m_inspectorServer;
};

#endif // TYPESCRIPT_H
