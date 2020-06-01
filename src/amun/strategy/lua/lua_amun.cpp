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
#include "protobuf/ssl_game_controller_team.pb.h"
#include "protobuf/ssl_game_controller_auto_ref.pb.h"
#include <QtEndian>
#include "strategy/script/scriptstate.h"

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

static int amunIsReplay(lua_State *state)
{
    Lua *thread = getStrategyThread(state);
    lua_pushboolean(state, thread->scriptState().isReplay);
    return 1;
}
static int amunGetSelectedOptions(lua_State *state)
{
    Lua *thread = getStrategyThread(state);
    lua_newtable(state);
    int ctr = 1;
    for (const QString &option: thread->scriptState().selectedOptions) {
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

    std::string errorMsg;
    {
        // set robot movement command
        RobotCommandInfo commandInfo;
        commandInfo.command = RobotCommand(new robot::Command);
        commandInfo.generation = lua_tointeger(state, 1);
        commandInfo.robotId = lua_tointeger(state, 2);
        protobufToMessage(state, 3, *commandInfo.command, &errorMsg);

        if (errorMsg.size() == 0) {
            thread->setCommands({commandInfo});
            return 0;
        }
    }

    // give robot command the chance to cleanup its memory
    luaL_error(state, errorMsg.c_str());
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

static int amunAddVisualizationCircle(lua_State *state)
{
    const int numArgs = lua_gettop(state);
    if (numArgs < 8) {
        luaL_error(state, "Too few arguments expected at least 8, got %d", numArgs);
    }

    Lua *thread = getStrategyThread(state);
    amun::Visualization *vis = thread->addVisualization();

    const char *name = lua_tostring(state, 1);
    const float center_x = lua_tonumber(state, 2);
    const float center_y = lua_tonumber(state, 3);
    const float radius = lua_tonumber(state, 4);
    const float color_red = lua_tonumber(state, 5);
    const float color_green = lua_tonumber(state, 6);
    const float color_blue = lua_tonumber(state, 7);
    const float color_alpha = lua_tonumber(state, 8);
    const bool isFilled = lua_toboolean(state, 9);
    const bool background = lua_toboolean(state, 10);
    const float width = lua_tonumber(state, 11);

    vis->set_name(name);
    vis->mutable_circle()->set_p_x(center_x);
    vis->mutable_circle()->set_p_y(center_y);
    vis->mutable_circle()->set_radius(radius);
    vis->mutable_pen()->mutable_color()->set_red(color_red);
    vis->mutable_pen()->mutable_color()->set_green(color_green);
    vis->mutable_pen()->mutable_color()->set_blue(color_blue);
    vis->mutable_pen()->mutable_color()->set_alpha(color_alpha);

    if (isFilled) {
        vis->mutable_brush()->CopyFrom(vis->mutable_pen()->color());
    }
    vis->set_background(background);
    vis->set_width(width);
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

static int amunConnectGameController(lua_State *state)
{
    Lua *thread = getStrategyThread(state);
    bool connected = thread->getGameControllerConnection()->connectGameController();
    lua_pushboolean(state, connected);
    return 1;
}

static int amunSendGameControllerMessage(lua_State *state)
{
    Lua *thread = getStrategyThread(state);
    QString type(luaL_checkstring(state, 1));
    std::unique_ptr<google::protobuf::Message> message;
    if (type == "TeamRegistration") {
        message.reset(new gameController::TeamRegistration);
    } else if (type == "AutoRefRegistration") {
        message.reset(new gameController::AutoRefRegistration);
    } else if (type == "TeamToController") {
        message.reset(new gameController::TeamToController);
    } else if (type == "AutoRefToController") {
        message.reset(new gameController::AutoRefToController);
    } else {
        luaL_error(state, "Unknown game controller message type");
        return 0;
    }

    if (!thread->getGameControllerConnection()->connectGameController()) {
        luaL_error(state, "Not connected to game controller");
        return 0;
    }

    protobufToMessage(state, 2, *message, nullptr);

    thread->getGameControllerConnection()->sendGameControllerMessage(message.get(), type);
    return 0;
}

static int amunGetGameControllerMessage(lua_State *state)
{
    Lua *thread = getStrategyThread(state);
    std::unique_ptr<google::protobuf::Message> message;
    if (thread->getStrategyType() == StrategyType::AUTOREF) {
        message.reset(new gameController::ControllerToAutoRef);
    } else {
        message.reset(new gameController::ControllerToTeam);
    }

    bool hasResult = thread->getGameControllerConnection()->receiveGameControllerMessage(message.get());
    if (hasResult) {
        protobufPushMessage(state, *message);
        return 1;
    }
    return 0;
}

static int amunIsInternalAutoref(lua_State *state)
{
    Lua *thread = getStrategyThread(state);
    lua_pushboolean(state, thread->scriptState().isInternalAutoref);
    return 1;
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

static int amunIsFlipped(lua_State *state)
{
    Lua *thread = getStrategyThread(state);
    lua_pushboolean(state, thread->scriptState().isFlipped);
    return 1;
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

static int amunGetPerformanceMode(lua_State *state)
{
    Lua *thread = getStrategyThread(state);
    lua_pushboolean(state, thread->scriptState().isPerformanceMode);
    return 1;
}

static int amunGetTestStatus(lua_State *state)
{
    // NOTE: the world state in this status packet is not the same as the one returned by amunGetWorldState
    Lua *thread = getStrategyThread(state);
    protobufPushMessage(state, *thread->scriptState().currentStatus);
    return 1;
}

static const luaL_Reg amunMethods[] = {
    // fixed during strategy runtime
    {"getGeometry",         amunGetGeometry},
    {"getTeam",             amunGetTeam},
    {"getStrategyPath",     amunGetStrategyPath},
    {"isBlue",              amunIsBlue},
    {"isReplay",            amunIsReplay},
    {"getSelectedOptions",  amunGetSelectedOptions},
    {"isInternalAutoref",   amunIsInternalAutoref},
    // dynamic
    {"getWorldState",       amunGetWorldState},
    {"getGameState",        amunGetGameState},
    {"getUserInput",        amunGetUserInput},
    {"getCurrentTime",      amunGetCurrentTime},
    {"getPerformanceMode",  amunGetPerformanceMode},
    {"isFlipped",           amunIsFlipped},
    // control + visualization
    {"setCommand",          amunSetCommand},
    {"log",                 amunLog},
    {"addVisualization",    amunAddVisualization},
    {"addVisualizationCircle", amunAddVisualizationCircle},
    {"addDebug",            amunAddDebug},
    {"addPlot",             amunAddPlot},
    {"sendGameControllerMessage",   amunSendGameControllerMessage},
    {"getGameControllerMessage",    amunGetGameControllerMessage},
    {"connectGameController",       amunConnectGameController},
    {"setRobotExchangeSymbol", amunSetRobotExchangeSymbol},
    // debug only
    {"sendCommand",         amunSendCommand},
    {"sendRefereeCommand",  amunSendRefereeCommand},
    {"sendMixedTeamInfo",   amunSendMixedTeamInfo},
    // debugger io
    {"debuggerRead",        amunDebuggerRead},
    {"debuggerWrite",       amunDebuggerWrite},
    // used for replay tests only
    {"getTestStatus",       amunGetTestStatus},
    {0, 0}
};

int amunRegister(lua_State *state)
{
    luaL_register(state, "amun", amunMethods);
    return 0;
}
