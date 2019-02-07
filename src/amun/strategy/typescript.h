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

#ifndef TYPESCRIPT_H
#define TYPESCRIPT_H

#include "abstractstrategyscript.h"

#include <QString>
#include <QMap>
#include <QTextStream>
#include <QAtomicInt>
#include <v8.h>
#include <v8-profiler.h>

class CheckForScriptTimeout;
class QThread;
class InspectorHolder;
class AbstractInspectorHandler;
class InternalDebugger;
struct lua_State;

class Typescript : public AbstractStrategyScript
{
    Q_OBJECT
public:
    Typescript(const Timer *timer, StrategyType type, bool debugEnabled, bool refboxControlEnabled);
    static bool canHandle(const QString &filename);
    ~Typescript() override;
    void addPathTime(double time);

    void startProfiling() override;
    void endProfiling(const std::string &filename) override;

    // functions used for debugging v8
    void disableTimeoutOnce(); // disables script timeout for the currently running strategy frame
    v8::Isolate *getIsolate() const { return m_isolate; }
    const v8::Persistent<v8::Context> &getContext() const { return m_context; }
    // gives ownership of the handler to this class
    void setInspectorHandler(AbstractInspectorHandler *handler);
    void removeInspectorHandler();
    bool hasInspectorHandler() const;
    bool canConnectInternalDebugger() const;
    InternalDebugger *getInternalDebugger() const { return m_internalDebugger.get(); }
    lua_State*& luaState() { return m_luaState; }
    void throwException(QString text);

protected:
    bool loadScript(const QString &filename, const QString &entryPoint) override;
    bool process(double &pathPlanning) override;

private:
    static void performRequire(const v8::FunctionCallbackInfo<v8::Value>& args);
    static void defineModule(const v8::FunctionCallbackInfo<v8::Value> &args);
    void registerDefineFunction(v8::Local<v8::ObjectTemplate> global);
    bool loadModule(QString name);

private:
    v8::Isolate* m_isolate;
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
};

#endif // TYPESCRIPT_H
