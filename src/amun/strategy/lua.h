/***************************************************************************
 *   Copyright 2015 Alexander Danzer. Michael Eischer, Philipp Nordhus     *
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

#ifndef LUA_H
#define LUA_H

#include <lua.hpp>
#include <QString>
#include <QStringList>
#include "abstractstrategyscript.h"
#include "strategytype.h"

class DebugHelper;
class FileWatcher;
class Lua;

Lua *getStrategyThread(lua_State *state);

class Lua : public AbstractStrategyScript
{
    Q_OBJECT
private:
    Lua(const Timer *timer, StrategyType type, bool debugEnabled, bool refboxControlEnabled);
public:
    static bool canHandle(const QString &filename);
    static AbstractStrategyScript* createStrategy(const Timer *timer, StrategyType type, bool debugEnabled, bool refboxControlEnabled);
    ~Lua() override;

public:
    bool loadScript(const QString &filename, const QString &entryPoint, const world::Geometry &geometry, const robot::Team &team) override;
    bool process(double &pathPlanning, const world::State &worldState, const amun::GameState &refereeState, const amun::UserInput &userInput) override;
    bool triggerDebugger() override;

    qint64 startTime() const { return m_startTime; }
    void watch(const QString &filename);
    QString debuggerRead();
    bool debuggerWrite(const QString& line);
private:
    void loadLibs();
    void loadRestrictedDebugLibs();
    void loadDebugLibs();
    void loadLib(const char* name, lua_CFunction function);
    void setupPackageLoader();
    void replaceLuaFunction(const char *module, const char *key, lua_CFunction replacement);
    void removeLuaFunction(const char *module, const char *key);

private:
    lua_State *m_state;
    FileWatcher *m_watcher;

    qint64 m_startTime;
};

#endif // LUA_H
