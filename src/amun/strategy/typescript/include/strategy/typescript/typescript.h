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
#include <QTextStream>
#include <QAtomicInt>
#include <v8.h>
#include <v8-profiler.h>
#include <map>
#include <memory>
#include <vector>

#include "isolateholder.h"
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
class QTPath;

class Typescript : public AbstractStrategyScript
{
    Q_OBJECT
public:
    Typescript(const Timer *timer, StrategyType type, ScriptState& scriptState, CompilerRegistry* registry);

    static bool canHandle(const QString &filename);
    ~Typescript() override;
    void addPathTime(double time);

    /*! \brief Adds a path object to be used during the current reload cycle
     *
     * The return value is a non-owning pointer to the passed path object,
     * valid until the next reload, or until Typescript deconstructs.
     */
    QTPath* addPathObjectForCurrentReloadCycle(std::unique_ptr<QTPath> path);

    void startProfiling() override;
    void endProfiling(const std::string &filename) override;
    bool canReloadInPlace() const override { return  true; }
    bool canHandleDynamic(const QString &filename) const override { return Typescript::canHandle(filename); }
    void compileIfNecessary() override;

    // functions used for debugging v8
    void disableTimeoutOnce(); // disables script timeout for the currently running strategy frame
    // gives ownership of the handler to this class
    void setInspectorHandler(std::unique_ptr<AbstractInspectorHandler> handler);
    void removeInspectorHandler();
    bool hasInspectorHandler() const;
    bool canConnectInternalDebugger() const;
    InternalDebugger *getInternalDebugger() const { return m_internalDebugger; }
    lua_State*& luaState() { return m_luaState; }
    void tryCatch(v8::Local<v8::Function> tryBlock, v8::Local<v8::Function> thenBlock, v8::Local<v8::Function> catchBlock, v8::Local<v8::Object> element, bool printStackTrace);

protected:
    void loadScript(const QString &filename, const QString &entryPoint) override;
    bool process(double &pathPlanning) override;

private:
    static void performRequire(const v8::FunctionCallbackInfo<v8::Value>& args);
    static void defineModule(const v8::FunctionCallbackInfo<v8::Value> &args);
    void registerDefineFunction(v8::Local<v8::ObjectTemplate> global);
    bool loadModule(QString name);
    v8::ScriptOrigin scriptOriginFromFileName(QString name);
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
    // Should be first, since many other members depend on it
    IsolateHolder m_isolateHolder;
    v8::Isolate* m_isolate = nullptr;

    v8::Global<v8::Context> m_context;
    v8::Global<v8::Function> m_function;
    double m_totalPathTime;

    /*! \brief The Javascript Path objects used for the current strategy run
     *
     * Should be cleared if the strategy is reloaded
     */
    std::vector<std::unique_ptr<QTPath>> m_currentReloadCyclePaths;

    std::vector<std::map<QString, std::unique_ptr<v8::Global<v8::Value>>>> m_requireCache;
    v8::Global<v8::FunctionTemplate> m_requireTemplate;
    QString m_currentExecutingModule;
    QAtomicInt m_timeoutCounter; // used for script timeout
    int m_executionCounter;

    v8::CpuProfiler *m_profiler;
    CheckForScriptTimeout *m_checkForScriptTimeout;
    QThread *m_timeoutCheckerThread;
    std::unique_ptr<InspectorHolder> m_inspectorHolder;
    InternalDebugger* m_internalDebugger = nullptr;

    int m_scriptIdCounter;

    lua_State* m_luaState;
    std::shared_ptr<CompilerThreadWrapper> m_compiler;

    QString m_requestedEntrypoint;

    std::unique_ptr<InspectorServer> m_inspectorServer;
};

#endif // TYPESCRIPT_H
