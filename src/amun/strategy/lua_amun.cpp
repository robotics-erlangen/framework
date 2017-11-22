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

#include "lua.h"
#include "lua_amun.h"
#include "lua_protobuf.h"
#include "protobuf/ssl_refbox_remotecontrol.pb.h"
#include "protobuf/ssl_autoref.pb.h"
#include <QtEndian>

static int amunGetGeometry(lua_State *state)
{
    Lua *thread = getStrategyThread(state);
    protobufPushMessage(state, thread->geometry());
    return 1;
}

static int amunGetTeam(lua_State *state)
{
    Lua *thread = getStrategyThread(state);
    protobufPushMessage(state, thread->team());
    return 1;
}

static int amunGetStrategyPath(lua_State *state)
{
    Lua *thread = getStrategyThread(state);
    lua_pushstring(state, qPrintable(thread->baseDir().absolutePath()));
    return 1;
}

static int amunIsBlue(lua_State *state)
{
    Lua *thread = getStrategyThread(state);
    lua_pushboolean(state, thread->isBlue());
    return 1;
}

static int amunGetSelectedOptions(lua_State *state)
{
    Lua *thread = getStrategyThread(state);
    lua_newtable(state);
    int ctr = 1;
    for (const QString &option: thread->selectedOptions()) {
        lua_pushinteger(state, ctr++);
        lua_pushstring(state, option.toUtf8().constData());
        lua_settable(state, -3);
    }
    return 1;
}

static int amunGetWorldState(lua_State *state)
{
    Lua *thread = getStrategyThread(state);
    protobufPushMessage(state, thread->worldState());
    return 1;
}

static int amunGetGameState(lua_State *state)
{
    Lua *thread = getStrategyThread(state);
    protobufPushMessage(state, thread->refereeState());
    return 1;
}

static int amunGetUserInput(lua_State *state)
{
    Lua *thread = getStrategyThread(state);
    protobufPushMessage(state, thread->userInput());
    return 1;
}

static int amunGetCurrentTime(lua_State *state)
{
    Lua *thread = getStrategyThread(state);
    lua_pushnumber(state, thread->time());
    return 1;
}

static int amunSetCommand(lua_State *state)
{
    Lua *thread = getStrategyThread(state);

    // set robot movement command
    robot::Command command;
    const uint generation = lua_tointeger(state, 1);
    const uint robotId = lua_tointeger(state, 2);
    protobufToMessage(state, 3, command, NULL);

    thread->setCommand(generation, robotId, command);
    return 0;
}

static int amunLog(lua_State *state)
{
    const int numArgs = lua_gettop(state);

    if (numArgs == 0) {
        // log nil
        lua_pushstring(state, "nil");
    } else if (lua_isstring(state, 1)) {
        // use first string as format string
        lua_getglobal(state, "string");
        lua_getfield(state, -1, "format");
        lua_remove(state, -2);

        for (int i = 1; i <= numArgs; i++) {
            lua_pushvalue(state, i);
        }

        lua_call(state, numArgs, 1);
    } else {
        // convert first param to string
        lua_getglobal(state, "tostring");
        lua_pushvalue(state, 1);

        lua_call(state, 1, 1);
    }

    Lua *thread = getStrategyThread(state);

    thread->log(lua_tostring(state, -1));
    lua_pop(state, 1);

    return 0;
}

static int amunAddVisualization(lua_State *state)
{
    Lua *thread = getStrategyThread(state);
    amun::Visualization *vis = thread->addVisualization();
    std::string errorMsg;
    protobufToMessage(state, 1, *vis, &errorMsg);
    if (errorMsg.size() > 0) {
        thread->removeVisualizations();
        luaL_error(state, errorMsg.c_str());
    }
    return 0;
}

static int amunAddDebug(lua_State *state)
{
    Lua *thread = getStrategyThread(state);
    amun::DebugValue *value = thread->addDebug();
    value->set_key(luaL_checkstring(state, 1));

    switch (lua_type(state, 2)) {
    case LUA_TNUMBER:
        value->set_float_value(lua_tonumber(state, 2));
        break;

    case LUA_TBOOLEAN:
        value->set_bool_value(lua_toboolean(state, 2));
        break;

    case LUA_TSTRING:
        value->set_string_value(lua_tostring(state, 2));
        break;

    case LUA_TNIL:
        value->set_string_value("<nil>");
        break;
    }

    return 0;
}

static int amunAddPlot(lua_State *state)
{
    Lua *thread = getStrategyThread(state);
    amun::PlotValue *value = thread->addPlot();
    value->set_name(luaL_checkstring(state, 1));
    value->set_value(lua_tonumber(state, 2));
    return 0;
}

static int amunSendCommand(lua_State *state)
{
    Lua *thread = getStrategyThread(state);

    Command command(new amun::Command);
    protobufToMessage(state, 1, *command, NULL);

    if (!thread->sendCommand(command)) {
        luaL_error(state, "This function is only allowed in debug mode!");
    }

    return 0;
}

static int amunSendRefereeCommand(lua_State *state)
{
    Lua *thread = getStrategyThread(state);

    SSL_Referee referee;
    protobufToMessage(state, 1, referee, NULL);

    std::string refereeStr;
    if (!referee.SerializeToString(&refereeStr)) {
        luaL_error(state, "Invalid referee command packet!");
    }

    Command command(new amun::Command);
    command->mutable_referee()->set_command(refereeStr);

    if (!thread->sendCommand(command)) {
        luaL_error(state, "This function is only allowed in debug mode!");
    }

    return 0;
}

static int amunSendMixedTeamInfo(lua_State *state)
{
    Lua *thread = getStrategyThread(state);

    ssl::TeamPlan mixedTeamInfo;
    protobufToMessage(state, 1, mixedTeamInfo, NULL);

    QByteArray data;
    data.resize(mixedTeamInfo.ByteSize());
    if (!mixedTeamInfo.SerializeToArray(data.data(), data.size())) {
        luaL_error(state, "Invalid mixed team information packet!");
    }

    thread->sendMixedTeam(data);
    return 0;
}

static int amunSendAutorefEvent(lua_State *state)
{
    Lua *thread = getStrategyThread(state);

    ssl::SSL_Autoref autorefEvent;
    protobufToMessage(state, 1, autorefEvent, NULL);

    QByteArray data;
    data.resize(autorefEvent.ByteSize());
    if (!autorefEvent.SerializeToArray(data.data(), data.size())) {
        luaL_error(state, "Invalid autoref event packet!");
    }

    thread->sendAutoref(data);
    return 0;
}

static int amunSendNetworkRefereeCommand(lua_State *state)
{
    Lua *thread = getStrategyThread(state);

    if (!thread->refboxControlEnabled()) {
        thread->log("Warning: Command not sent to refbox! (Enable the config option if you wish to send)");
        return 0;
    }

    SSL_RefereeRemoteControlRequest request;
    protobufToMessage(state, 1, request, NULL);

    QByteArray data;
    // the first 4 bytes denote the packet's size in big endian
    data.resize(request.ByteSize()+4);
    qToBigEndian<quint32>(request.ByteSize(), (uchar*)data.data());
    if (!request.SerializeToArray(data.data()+4, request.ByteSize())) {
        luaL_error(state, "Invalid referee packet!");
    }

    if (!thread->sendNetworkReferee(data)) {
        luaL_error(state, "This function is only allowed in debug mode!");
    }
    return 0;
}

static int amunSetRobotExchangeSymbol(lua_State *state)
{
    Lua *thread = getStrategyThread(state);
    amun::RobotValue *value = thread->addRobotValue();
    value->set_generation((uint32_t)lua_tonumber(state, 1));
    value->set_id((uint32_t)lua_tonumber(state, 2));
    value->set_exchange(lua_toboolean(state, 3));
    return 0;
}

static int amunDebuggerRead(lua_State *state)
{
    Lua *thread = getStrategyThread(state);
    QString line = thread->debuggerRead();
    if (line.isNull()) {
        luaL_error(state, "This function is only allowed in debug mode!");
    }
    lua_pushstring(state, line.toLatin1());
    return 1;
}

static int amunDebuggerWrite(lua_State *state)
{
    Lua *thread = getStrategyThread(state);
    QString line = QString::fromLatin1(luaL_checkstring(state, 1));
    if (!thread->debuggerWrite(line)) {
        luaL_error(state, "This function is only allowed in debug mode!");
    }
    return 0;
}

static const luaL_Reg amunMethods[] = {
    // fixed during strategy runtime
    {"getGeometry",         amunGetGeometry},
    {"getTeam",             amunGetTeam},
    {"getStrategyPath",     amunGetStrategyPath},
    {"isBlue",              amunIsBlue},
    {"getSelectedOptions",  amunGetSelectedOptions},
    // dynamic
    {"getWorldState",       amunGetWorldState},
    {"getGameState",        amunGetGameState},
    {"getUserInput",        amunGetUserInput},
    {"getCurrentTime",      amunGetCurrentTime},
    // control + visualization
    {"setCommand",          amunSetCommand},
    {"log",                 amunLog},
    {"addVisualization",    amunAddVisualization},
    {"addDebug",            amunAddDebug},
    {"addPlot",             amunAddPlot},
    {"setRobotExchangeSymbol", amunSetRobotExchangeSymbol},
    // debug only
    {"sendCommand",         amunSendCommand},
    {"sendRefereeCommand",  amunSendRefereeCommand},
    {"sendMixedTeamInfo",   amunSendMixedTeamInfo},
    {"sendNetworkRefereeCommand",  amunSendNetworkRefereeCommand},
    {"sendAutorefEvent",    amunSendAutorefEvent},
    // debugger io
    {"debuggerRead",        amunDebuggerRead},
    {"debuggerWrite",       amunDebuggerWrite},
    {0, 0}
};

int amunRegister(lua_State *state)
{
    luaL_register(state, "amun", amunMethods);
    return 0;
}
