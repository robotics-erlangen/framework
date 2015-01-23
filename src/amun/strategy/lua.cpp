/***************************************************************************
 *   Copyright 2015 Alexander Danzer, Michael Eischer, Philipp Nordhus     *
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

#include "lua.h"
#include "lua_amun.h"
#include "lua_path.h"
#include "lua_protobuf.h"
#include "core/timer.h"
#include "filewatcher.h"

Lua *getStrategyThread(lua_State *state)
{
    lua_getfield(state, LUA_REGISTRYINDEX, "Strategy");
    Lua *thread = reinterpret_cast<Lua*>(lua_touserdata(state, -1));
    lua_pop(state, 1);

    return thread;
}

static QDir *getBaseDir(lua_State *state)
{
    lua_getfield(state, LUA_REGISTRYINDEX, "StrategyBaseDir");
    QDir* baseDir = reinterpret_cast<QDir*>(lua_touserdata(state, -1));
    lua_pop(state, 1);

    return baseDir;
}

static int luaLoadInitScript(lua_State *state)
{
    // load init script
    lua_getfield(state, LUA_GLOBALSINDEX, "require");
    lua_pushvalue(state, 1);
    lua_call(state, 1, 1);

    // pointers to return strategy name and entrypoints
    QString *name = reinterpret_cast<QString*>(lua_touserdata(state, 2));
    QStringList *entryPoints = reinterpret_cast<QStringList*>(lua_touserdata(state, 3));

    // init script must return a table
    if (lua_type(state, -1) != LUA_TTABLE) {
        luaL_error(state, "Return value has to be a table!");
    }

    // get strategy name
    lua_getfield(state, -1, "name");
    *name = QString::fromUtf8(lua_tostring(state, -1));
    lua_pop(state, 1);

    // get entrypoints and add them to the entry point name list and entry point table
    lua_getfield(state, -1, "entrypoints");
    if (!lua_istable(state, -1)) {
        luaL_error(state, "No entry points defined!");
    }
    lua_getfield(state, LUA_REGISTRYINDEX, "EntryPoints");
    // push key
    lua_pushnil(state);
    while (lua_next(state, -3) != 0) {
        if (lua_type(state, -2) != LUA_TSTRING) {
            luaL_error(state, "Entry point name is not a string!");
        }

        if (lua_type(state, -1) != LUA_TFUNCTION) {
            luaL_error(state, "Entry point '%s' is not a function!", name);
        }

        lua_pushvalue(state, -2);
        const char *name = lua_tostring(state, -1);
        lua_pushvalue(state, -2);
        lua_settable(state, -5);

        entryPoints->append(QString::fromUtf8(name));

        lua_pop(state, 1);
    }
    // pop entrypoints table
    lua_pop(state, 1);
    // pop table returned by strategy
    lua_pop(state, 1);
    return 0;
}

static int luaLoadFile(lua_State* state)
{
    // destroy C++ objects before calling lua_error (uses longjmp)
    bool error = false;
    {
        // add .lua extension
        QString fileName = QString::fromUtf8(lua_tostring(state, 1));
        if (!fileName.endsWith(".lua"))
            fileName += ".lua";

        // get filename and add to filewatcher
        QString fullFileName = getBaseDir(state)->absoluteFilePath(fileName);
        getStrategyThread(state)->watch(fullFileName);

        // try to read and load file
        QFile file(fullFileName);
        if (!file.open(QFile::ReadOnly)) {
            // return string describing why the loader failed
            lua_pushfstring(state, "\n\tno file " LUA_QS, qPrintable(fileName));
        } else {
            const QByteArray buffer = file.readAll();
            if (luaL_loadbuffer(state, buffer.constData(), buffer.size(), qPrintable("@" + fullFileName)) != 0) {
                error = true;
            }
        }
    }

    if (error) {
        lua_error(state);
    }

    return 1;
}

static QString extractFilename(QString source, QDir* baseDir) {
    if (source.startsWith("@")) {
        source = source.mid(1);
    }
    return baseDir->relativeFilePath(source);
}

static int luaErrorHandler(lua_State* state)
{
    // error string
    QString s = lua_tostring(state, 1);

    s.replace("<", "&lt;");
    s.replace(">", "&gt;");

    // highlight string enclosed in ':' or everything
    QRegExp regexp("^.*:.*: ");
    regexp.setMinimal(true);
    int i = regexp.indexIn(s);
    if (i >= 0) {
        s.insert(i + regexp.cap().length(), "<font color=\"red\">");
    } else {
        s.prepend("<font color=\"red\">");
    }
    s.append("</font>");

    const QString prefix = "<br>&nbsp;&nbsp;&nbsp;&gt;";
    QDir* baseDir = getBaseDir(state);
    lua_Debug ar;
    // walk stack
    for (uint level = 1; lua_getstack(state, level, &ar) != 0; ++level) {
        lua_getinfo(state, "nSl", &ar);

        // try to get function name
        QString name;
        if (ar.name) {
            name = QString("<font color=\"blue\">%1</font>").arg(QString::fromUtf8(ar.name));
        } else {
            // check if function is the entrypoint
            // push functions
            lua_getinfo(state, "f", &ar);
            lua_getfield(state, LUA_REGISTRYINDEX, "EntryPoint");
            if (lua_topointer(state, -1) == lua_topointer(state, -2)) {
                lua_getfield(state, LUA_REGISTRYINDEX, "EntryPointName");
                name = QString("entry point <font color=\"blue\">%1</font>").arg(QString::fromUtf8(lua_tostring(state, -1)));
                lua_pop(state, 1);
            }
            lua_pop(state, 2);
        }

        // get further call details
        const QString what = ar.what;
        if (what == "Lua") {
            s += QString("%1 %2 (in %3:%4)").arg(prefix).arg(name).arg(extractFilename(ar.source, baseDir)).arg(ar.currentline);
        } else if (what == "C") {
            if (!name.isNull()) {
                s += QString("%1 %2 (in Amun)").arg(prefix).arg(name);
            }
        } else if (what == "main") {
            s += QString("%1 %2:%3").arg(prefix).arg(extractFilename(ar.source, baseDir)).arg(ar.currentline);
        } else if (what == "tail") {
            s += QString("%1 %2").arg(prefix).arg(extractFilename(ar.source, baseDir));
        }
    }

    lua_pushstring(state, s.toUtf8().constData());
    return 1;
}

static void luaDebugHook(lua_State *state, lua_Debug *ar)
{
    const qint64 currentTime = Timer::systemTime();
    switch (ar->event) {
    case LUA_HOOKCALL:
    case LUA_HOOKRET:
    case LUA_HOOKTAILRET:
        break;
    case LUA_HOOKCOUNT:
        if (currentTime - getStrategyThread(state)->startTime() > 0.5 * 1E9) {
            luaL_error(state, "Script timeout!");
        }
        break;
    }
}

static void luaKillHook(lua_State *state, lua_Debug */*ar*/)
{
    luaL_error(state, "os.exit()");
}

static int luaInstallKillHook(lua_State* state)
{
    lua_sethook(state, luaKillHook, LUA_MASKCALL | LUA_MASKRET | LUA_MASKLINE | LUA_MASKCOUNT, 1);
    return 0;
}

Lua::Lua(const Timer *timer, bool isBlue, bool debugEnabled) :
    m_timer(timer),
    m_blue(isBlue),
    m_debugEnabled(debugEnabled)
{
    // create lua instance and load libraries
    m_state = luaL_newstate();
    loadLibs();
    if (debugEnabled) {
        loadDebugLibs();
    }
    setupPackageLoader();

    // create file system watcher
    m_watcher = new FileWatcher(this);
    connect(m_watcher, SIGNAL(fileChanged(QString)), SIGNAL(requestReload()));

    // timeout hook
    lua_sethook(m_state, luaDebugHook, LUA_MASKCOUNT, 1000000);

    // setup c registry fields
    lua_newtable(m_state);
    lua_setfield(m_state, LUA_REGISTRYINDEX, "EntryPoints");

    lua_pushlightuserdata(m_state, this);
    lua_setfield(m_state, LUA_REGISTRYINDEX, "Strategy");

    lua_pushlightuserdata(m_state, &m_baseDir);
    lua_setfield(m_state, LUA_REGISTRYINDEX, "StrategyBaseDir");

    // push error handler, stays on stack
    lua_pushcfunction(m_state, luaErrorHandler);
}

bool Lua::canHandle(const QString filename)
{
    return filename.endsWith(".lua");
}

AbstractStrategyScript* Lua::createStrategy(const Timer *timer, bool isBlue, bool debugEnabled) {
    return new Lua(timer, isBlue, debugEnabled);
}

Lua::~Lua()
{
    lua_close(m_state);
}

bool Lua::loadScript(const QString filename, const QString entryPoint, const world::Geometry &geometry, const robot::Team &team)
{
    Q_ASSERT(m_filename.isNull());

    // startup strategy information
    m_filename = filename;
    m_name = "<no script>";
    // strategy modules are loaded relative to the init script
    m_baseDir = QFileInfo(m_filename).absoluteDir();

    m_geometry.CopyFrom(geometry);
    m_team.CopyFrom(team);
    clearDebug();

    // start init script loader, sets strategy name and entrypoints
    lua_pushcfunction(m_state, luaLoadInitScript);
    lua_pushstring(m_state, m_baseDir.relativeFilePath(m_filename).toUtf8().constData());
    lua_pushlightuserdata(m_state, &m_name);
    lua_pushlightuserdata(m_state, &m_entryPoints);
    if (lua_pcall(m_state, 3, 0, 1) != 0) {
        m_errorMsg = lua_tostring(m_state, -1);
        return false;
    }

    // cleanup entrypoints list
    m_entryPoints.sort();
    m_entryPoints.removeDuplicates();
    if (m_entryPoints.isEmpty()) {
        m_errorMsg = "<font color=\"red\">No entry points defined!</font>";
        return false;
    }

    m_entryPoint = entryPoint;
    // use first entry point as fallback
    if (!m_entryPoints.contains(m_entryPoint)) {
        m_entryPoint = m_entryPoints.first();
    }

    // publish entry point for strategy
    lua_getfield(m_state, LUA_REGISTRYINDEX, "EntryPoints");
    lua_pushstring(m_state, m_entryPoint.toUtf8().constData());
    lua_gettable(m_state, -2);

    lua_setfield(m_state, LUA_REGISTRYINDEX, "EntryPoint");
    lua_pop(m_state, 1);

    lua_pushstring(m_state, m_entryPoint.toUtf8().constData());
    lua_setfield(m_state, LUA_REGISTRYINDEX, "EntryPointName");

    return true;
}

bool Lua::process(double &pathPlanning, const world::State &worldState, const amun::GameState &refereeState, const amun::UserInput &userInput)
{
    Q_ASSERT(!m_entryPoint.isNull());

    m_worldState.CopyFrom(worldState);
    m_refereeState.CopyFrom(refereeState);
    m_userInput.CopyFrom(userInput);
    clearDebug();

    // used to check for script timeout
    m_startTime = Timer::systemTime();

    // reset path planning time
    lua_pushnumber(m_state, 0);
    lua_setfield(m_state, LUA_REGISTRYINDEX, "PathPlanning");

    // execute entry point
    lua_getfield(m_state, LUA_REGISTRYINDEX, "EntryPoint");
    if (lua_pcall(m_state, 0, 0, 1)) {
        m_errorMsg = lua_tostring(m_state, -1);
        return false;
    }

    // collect timing information
    lua_getfield(m_state, LUA_REGISTRYINDEX, "PathPlanning");
    pathPlanning = lua_tonumber(m_state, -1);
    lua_pop(m_state, 1);

    return true;
}

qint64 Lua::time() const
{
    return m_timer->currentTime();
}

void Lua::setCommand(uint generation, uint robotId, robot::Command &command)
{
    // movement commands are immediatelly forwarded to the processor
    // that is while the strategy is still running
    QByteArray data;
    data.resize(command.ByteSize());
    if (command.SerializeToArray(data.data(), data.size()))
        emit sendStrategyCommand(m_blue, generation, robotId, data, m_worldState.time());
}

void Lua::log(const QString text)
{
    amun::StatusLog *log = m_debug.add_log();
    log->set_timestamp(time());
    log->set_text(text.toStdString());
}

amun::Visualization *Lua::addVisualization()
{
    return m_debug.add_visualization();
}

amun::DebugValue *Lua::addDebug()
{
    return m_debug.add_value();
}

amun::PlotValue *Lua::addPlot()
{
    return m_debug.add_plot();
}

bool Lua::sendCommand(Command command)
{
    if (!m_debugEnabled) {
        return false;
    }
    emit gotCommand(command);
    return true;
}

void Lua::watch(const QString filename)
{
    m_watcher->addFile(filename);
}

void Lua::loadLibs()
{
    loadLib("", luaopen_base);
    loadLib(LUA_LOADLIBNAME,    luaopen_package);
    loadLib(LUA_TABLIBNAME,     luaopen_table);
    loadLib(LUA_IOLIBNAME,      luaopen_io);
    loadLib(LUA_STRLIBNAME,     luaopen_string);
    loadLib(LUA_MATHLIBNAME,    luaopen_math);
    loadLib(LUA_FFILIBNAME,     luaopen_ffi);
}

void Lua::loadDebugLibs()
{
    loadLib(LUA_OSLIBNAME,      luaopen_os);

    // replace os.exit function
    lua_getglobal(m_state, "os");
    Q_ASSERT(lua_istable(m_state, -1));

    lua_pushcfunction(m_state, luaInstallKillHook);
    lua_setfield(m_state, -2, "exit");

    lua_pop(m_state, 1);

    loadLib(LUA_DBLIBNAME,      luaopen_debug);

    // load jit libraries, required by the lua debugger
    loadLib(LUA_BITLIBNAME,     luaopen_bit);
    loadLib(LUA_JITLIBNAME,     luaopen_jit);
}

void Lua::loadLib(const char* name, lua_CFunction function)
{
    lua_pushcfunction(m_state, function);
    lua_pushstring(m_state, name);
    lua_call(m_state, 1, 0);
}

void Lua::setupPackageLoader()
{
    // customize package table
    lua_getglobal(m_state, "package");
    Q_ASSERT(lua_istable(m_state, -1));

    // insert the custom lua script loader before the default one
    // get table.insert
    lua_getglobal(m_state, "table");
    Q_ASSERT(lua_istable(m_state, -1));
    lua_getfield(m_state, -1, "insert");
    Q_ASSERT(lua_isfunction(m_state, -1));
    // call table.insert(package.loaders, 2, luaLoadFile)
    lua_getfield(m_state, -3, "loaders");
    Q_ASSERT(lua_istable(m_state, -1));
    lua_pushinteger(m_state, 2);
    lua_pushcfunction(m_state, luaLoadFile);
    lua_call(m_state, 3, 0);
    lua_pop(m_state, 1);

    // preload c libraries
    lua_getfield(m_state, -1, "preload");
    Q_ASSERT(lua_istable(m_state, -1));
    lua_pushcfunction(m_state, amunRegister);
    lua_setfield(m_state, -2, "amun");
    lua_pushcfunction(m_state, pathRegister);
    lua_setfield(m_state, -2, "path");
    lua_pop(m_state, 1);

    lua_pop(m_state, 1);
    // end customize package table
}
