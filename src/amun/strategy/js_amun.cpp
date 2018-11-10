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

#include "js_amun.h"

#include <lua.hpp>
#include <QList>
#include <QtEndian>
#include <functional>
#include <v8.h>
#include <cmath>

#include "js_protobuf.h"
#include "typescript.h"
#include "internaldebugger.h"

using namespace v8;

static void amunGetGeometry(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    Local<Value> result = protobufToJs(isolate, t->geometry());
    args.GetReturnValue().Set(result);
}

static void amunGetTeam(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    Local<Value> result = protobufToJs(isolate, t->team());
    args.GetReturnValue().Set(result);
}

static void amunGetStrategyPath(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    Local<String> result = String::NewFromUtf8(isolate, qPrintable(t->baseDir().absolutePath()),
                                               NewStringType::kNormal).ToLocalChecked();
    args.GetReturnValue().Set(result);
}

static void amunIsBlue(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    Local<Boolean> result = Boolean::New(isolate, t->isBlue());
    args.GetReturnValue().Set(result);
}

static void amunIsReplay(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    Local<Boolean> result = Boolean::New(isolate, t->isReplay());
    args.GetReturnValue().Set(result);
}

static void amunGetSelectedOptions(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    Local<Array> result = Array::New(isolate, t->selectedOptions().length());
    unsigned int ctr = 0;
    for (const QString &option: t->selectedOptions()) {
        Local<String> opt = String::NewFromUtf8(isolate, option.toUtf8().constData(), String::kNormalString);
        result->Set(Integer::NewFromUnsigned(isolate, ctr++), opt);
    }
    args.GetReturnValue().Set(result);
}

static void amunGetWorldState(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    Local<Value> result = protobufToJs(isolate, t->worldState());
    args.GetReturnValue().Set(result);
}

static void amunGetGameState(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    Local<Value> result = protobufToJs(isolate, t->refereeState());
    args.GetReturnValue().Set(result);
}

static void amunGetUserInput(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    Local<Value> result = protobufToJs(isolate, t->userInput());
    args.GetReturnValue().Set(result);
}

static void amunGetCurrentTime(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    args.GetReturnValue().Set(BigInt::New(isolate, t->time()));
}

static bool toUintChecked(Isolate *isolate, Local<Value> value, uint &result)
{
    Maybe<uint> maybeValue = value->Uint32Value(isolate->GetCurrentContext());
    if (!maybeValue.To(&result)) {
        Local<String> errorMessage = String::NewFromUtf8(isolate, "Argument has to be an integer", String::kNormalString);
        isolate->ThrowException(errorMessage);
        return false;
    }
    return true;
}

static bool toBoolChecked(Isolate *isolate, Local<Value> value, bool &result)
{
    Maybe<bool> maybeValue = value->BooleanValue(isolate->GetCurrentContext());
    if (!maybeValue.To(&result)) {
        Local<String> errorMessage = String::NewFromUtf8(isolate, "Argument has to be a boolean", String::kNormalString);
        isolate->ThrowException(errorMessage);
        return false;
    }
    return true;
}

static bool verifyNumber(Isolate *isolate, Local<Value> value, float &result)
{
    Maybe<double> maybeValue = value->NumberValue(isolate->GetCurrentContext());
    double v = 0.0;
    if (!maybeValue.To(&v) || std::isnan(v) || std::isinf(v)) {
        Local<String> errorMessage = String::NewFromUtf8(isolate, "Invalid argument", String::kNormalString);
        isolate->ThrowException(errorMessage);
        return false;
    }
    result = float(v);
    return true;
}

static bool checkNumberOfArguments(Isolate *isolate, int expected, int got)
{
    if (got < expected) {
        QString errorMessage = QString("Expected %1 arguments, but got %2").arg(expected).arg(got);
        Local<String> message = String::NewFromUtf8(isolate, errorMessage.toUtf8().constData(), String::kNormalString);
        isolate->ThrowException(message);
        return false;
    }
    return true;
}

static void amunSetCommand(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());

    // set robot movement command
    if (!checkNumberOfArguments(isolate, 3, args.Length())) {
        return;
    }
    RobotCommand command(new robot::Command);
    uint generation, robotId;
    if (!toUintChecked(isolate, args[0], generation) || !toUintChecked(isolate, args[1], robotId)) {
        return;
    }
    if (!jsToProtobuf(isolate, args[2], isolate->GetCurrentContext(), *command)) {
        return;
    }

    t->setCommand(generation, robotId, command);
}

static void amunLog(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());

    // returns the string undefined if no argument is given
    String::Utf8Value value(isolate, args[0]);
    t->log(*value);
}

static void amunAddVisualization(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());

    if (!checkNumberOfArguments(isolate, 1, args.Length())) {
        return;
    }
    amun::Visualization *vis = t->addVisualization();
    jsToProtobuf(isolate, args[0], isolate->GetCurrentContext(), *vis);
}

static void amunAddCircleSimple(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());

    float x, y, radius, r, g, b, alpha, lineWidth;
    bool filled, background;
    if (!checkNumberOfArguments(isolate, 9, args.Length()) || !verifyNumber(isolate, args[1], x) ||
            !verifyNumber(isolate, args[2], y) || !verifyNumber(isolate, args[3], radius) ||
            !verifyNumber(isolate, args[4], r) || !verifyNumber(isolate, args[5], g) ||
            !verifyNumber(isolate, args[6], b) || !verifyNumber(isolate, args[7], alpha) ||
            !toBoolChecked(isolate, args[8], filled) || !toBoolChecked(isolate, args[9], background) ||
            !verifyNumber(isolate, args[10], lineWidth)) {
        return;
    }
    std::string name(*String::Utf8Value(isolate, args[0]));
    auto vis = t->addVisualization();
    vis->set_width(lineWidth);
    vis->set_name(name);
    if (background) {
        vis->set_background(background);
    }
    auto circle = vis->mutable_circle();
    circle->set_p_x(x);
    circle->set_p_y(y);
    circle->set_radius(radius);
    auto color = vis->mutable_pen()->mutable_color();
    color->set_red(r);
    color->set_green(g);
    color->set_blue(b);
    color->set_alpha(alpha);
    if (filled) {
        auto brush = vis->mutable_brush();
        brush->set_red(r);
        brush->set_green(g);
        brush->set_blue(b);
        brush->set_alpha(alpha);
    }
}

static void amunAddPathSimple(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());

    float r, g, b, alpha, width;
    bool background;
    if (!checkNumberOfArguments(isolate, 7, args.Length()) || !verifyNumber(isolate, args[1], r) ||
            !verifyNumber(isolate, args[2], g) || !verifyNumber(isolate, args[3], b) ||
            !verifyNumber(isolate, args[4], alpha) || !verifyNumber(isolate, args[5], width) ||
            !toBoolChecked(isolate, args[6], background)) {
        return;
    }
    std::string name(*String::Utf8Value(isolate, args[0]));
    auto vis = t->addVisualization();
    auto color = vis->mutable_pen()->mutable_color();
    color->set_red(r);
    color->set_green(g);
    color->set_blue(b);
    color->set_alpha(alpha);
    vis->set_width(width);
    vis->set_background(background);
    vis->set_name(name);

    if (!args[7]->IsArray()) {
        Local<String> errorMessage = String::NewFromUtf8(isolate, "Argument is not an array", String::kNormalString);
        isolate->ThrowException(errorMessage);
        return;
    }
    Local<Array> points = Local<Array>::Cast(args[7]);
    auto path = vis->mutable_path();
    // TODO: pre-allocate the array size
    if (points->Length() % 2 == 1) {
        Local<String> errorMessage = String::NewFromUtf8(isolate, "Invalid array length", String::kNormalString);
        isolate->ThrowException(errorMessage);
        return;
    }
    for (unsigned int i = 0;i<points->Length();i+=2) {
        float x, y;
        if (!verifyNumber(isolate, points->Get(i), x) || !verifyNumber(isolate, points->Get(i+1), y)) {
            Local<String> errorMessage = String::NewFromUtf8(isolate, "Array has to contain numbers", String::kNormalString);
            isolate->ThrowException(errorMessage);
            return;
        }
        auto point = path->add_point();
        point->set_x(x);
        point->set_y(y);
    }
}

static void amunAddPolygonSimple(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());

    float r, g, b, alpha;
    bool filled, background;
    if (!checkNumberOfArguments(isolate, 7, args.Length()) || !verifyNumber(isolate, args[1], r) ||
            !verifyNumber(isolate, args[2], g) || !verifyNumber(isolate, args[3], b) ||
            !verifyNumber(isolate, args[4], alpha) || !toBoolChecked(isolate, args[5], filled) ||
            !toBoolChecked(isolate, args[6], background)) {
        return;
    }
    std::string name(*String::Utf8Value(isolate, args[0]));
    auto vis = t->addVisualization();
    auto color = vis->mutable_pen()->mutable_color();
    color->set_red(r);
    color->set_green(g);
    color->set_blue(b);
    color->set_alpha(alpha);
    if (filled) {
        auto brush = vis->mutable_brush();
        brush->set_red(r);
        brush->set_green(g);
        brush->set_blue(b);
        brush->set_alpha(alpha);
    }
    vis->set_name(name);
    vis->set_width(0.01f);

    if (!args[7]->IsArray()) {
        Local<String> errorMessage = String::NewFromUtf8(isolate, "Argument is not an array", String::kNormalString);
        isolate->ThrowException(errorMessage);
        return;
    }
    Local<Array> points = Local<Array>::Cast(args[7]);
    auto polygon = vis->mutable_polygon();
    if (points->Length() % 2 == 1) {
        Local<String> errorMessage = String::NewFromUtf8(isolate, "Invalid array length", String::kNormalString);
        isolate->ThrowException(errorMessage);
        return;
    }
    for (unsigned int i = 0;i<points->Length();i+=2) {
        float x, y;
        if (!verifyNumber(isolate, points->Get(i), x) || !verifyNumber(isolate, points->Get(i+1), y)) {
            Local<String> errorMessage = String::NewFromUtf8(isolate, "Array has to contain numbers", String::kNormalString);
            isolate->ThrowException(errorMessage);
            return;
        }
        auto point = polygon->add_point();
        point->set_x(x);
        point->set_y(y);
    }
}

static void amunAddDebug(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    amun::DebugValue *debugValue = t->addDebug();
    String::Utf8Value key(isolate, args[0]);
    debugValue->set_key(*key);

    Local<Context> context = isolate->GetCurrentContext();
    Local<Value> value = args[1];
    if (value->IsNumber()) {
        debugValue->set_float_value(float(value->NumberValue(context).ToChecked()));
    } else if (value->IsBoolean()) {
        debugValue->set_bool_value(value->BooleanValue(context).ToChecked());
    } else if (value->IsString()) {
        debugValue->set_string_value(*String::Utf8Value(value));
    } else if (value->IsUndefined()) {
        debugValue->set_string_value("<undefined>");
    } else {
        debugValue->set_string_value("<unknown data type>");
    }
}

static void amunAddPlot(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    amun::PlotValue *value = t->addPlot();
    value->set_name(*String::Utf8Value(isolate, args[0]));
    double number = 0.0;
    if (!args[1]->NumberValue(isolate->GetCurrentContext()).To(&number)) {
        isolate->ThrowException(String::NewFromUtf8(isolate, "invalid number to plot", String::kNormalString));
        return;
    }
    value->set_value(float(number));
}

static void amunSendCommand(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());

    Command command(new amun::Command);
    if (!jsToProtobuf(isolate, args[0], isolate->GetCurrentContext(), *command)) {
        return;
    }
    if (!t->sendCommand(command)) {
        isolate->ThrowException(String::NewFromUtf8(isolate, "This function is only allowed in debug mode!", String::kNormalString));
    }
}

static void amunSendRefereeCommand(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());

    SSL_Referee referee;
    if (!jsToProtobuf(isolate, args[0], isolate->GetCurrentContext(), referee)) {
        return;
    }

    std::string refereeStr;
    if (!referee.SerializeToString(&refereeStr)) {
        isolate->ThrowException(String::NewFromUtf8(isolate, "Invalid referee command packet!", String::kNormalString));
        return;
    }

    Command command(new amun::Command);
    command->mutable_referee()->set_command(refereeStr);

    if (!t->sendCommand(command)) {
        isolate->ThrowException(String::NewFromUtf8(isolate, "This function is only allowed in debug mode!", String::kNormalString));
    }
}

static void amunSendMixedTeamInfo(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());

    ssl::TeamPlan mixedTeamInfo;
    if (!jsToProtobuf(isolate, args[0], isolate->GetCurrentContext(), mixedTeamInfo)) {
        return;
    }

    QByteArray data;
    data.resize(mixedTeamInfo.ByteSize());
    if (!mixedTeamInfo.SerializeToArray(data.data(), data.size())) {
        isolate->ThrowException(String::NewFromUtf8(isolate, "Invalid mixed team information packet!", String::kNormalString));
        return;
    }

    t->sendMixedTeam(data);
}

static void amunSendNetworkRefereeCommand(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());

    if (t->isInternalAutoref()) {
        Command command(new amun::Command);
        SSL_RefereeRemoteControlRequest * request = command->mutable_referee()->mutable_autoref_command();
        if (!jsToProtobuf(isolate, args[0], isolate->GetCurrentContext(), *request)) {
            return;
        }

        // flip position if necessary
        if (t->isFlipped() && request->has_designated_position()) {
            auto *pos = request->mutable_designated_position();
            pos->set_x(-pos->x());
            pos->set_y(-pos->y());
        }

        if (!t->sendCommand(command)) {
            isolate->ThrowException(String::NewFromUtf8(isolate, "This function is only allowed in debug mode!", String::kNormalString));
        }
    } else {
        if (!t->refboxControlEnabled()) {
            return;
        }

        SSL_RefereeRemoteControlRequest request;
        if (!jsToProtobuf(isolate, args[0], isolate->GetCurrentContext(), request)) {
            return;
        }

        // flip position if necessary
        if (t->isFlipped() && request.has_designated_position()) {
            auto *pos = request.mutable_designated_position();
            pos->set_x(pos->x());
            pos->set_y(pos->y());
        }

        QByteArray data;
        // the first 4 bytes denote the packet's size in big endian
        data.resize(request.ByteSize()+4);
        qToBigEndian<quint32>(request.ByteSize(), (uchar*)data.data());
        if (!request.SerializeToArray(data.data()+4, request.ByteSize())) {
            isolate->ThrowException(String::NewFromUtf8(isolate, "Invalid referee packet!", String::kNormalString));
        }

        if (!t->sendNetworkReferee(data)) {
            isolate->ThrowException(String::NewFromUtf8(isolate, "This function is only allowed in debug mode!", String::kNormalString));
        }
    }
}

static void amunNextRefboxReply(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    if (t->hasRefereeReply()) {
        args.GetReturnValue().Set(protobufToJs(isolate, t->nextRefereeReply()));
    }
}

static void amunSetRobotExchangeSymbol(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());

    if (!checkNumberOfArguments(isolate, 3, args.Length())) {
        return;
    }
    amun::RobotValue *value = t->addRobotValue();
    uint generation, id;
    bool set;
    if (!toUintChecked(isolate, args[0], generation) || !toUintChecked(isolate, args[1], id)
            || !toBoolChecked(isolate, args[2], set)) {
        return;
    }
    value->set_generation(generation);
    value->set_id(id);
    value->set_exchange(set);
}

static void amunGetPerformanceMode(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    Local<Boolean> result = Boolean::New(isolate, t->isPerformanceMode());
    args.GetReturnValue().Set(result);
}

static void initLuaState(lua_State*& luaState)
{
    if (luaState == nullptr) {
        luaState = lua_open();
        luaL_openlibs(luaState);
    }
}

static void handleLuaError(const char* prefix, Isolate* isolate, lua_State* luaState)
{
    std::string message(prefix);
    message.append(lua_tostring(luaState, -1));
    Local<String> errorMessage = String::NewFromUtf8(isolate, message.c_str(), String::kNormalString);
    isolate->ThrowException(errorMessage);
}

static void amunLuaRandom(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    lua_State*& luaState = t->luaState();
    initLuaState(luaState);
    lua_getglobal(luaState, "math");
    lua_getfield(luaState, -1, "random");
    lua_remove(luaState, -2);
    if (lua_pcall(luaState, 0, 1, 0) != 0) {
        handleLuaError("error random", isolate, luaState);
        return;
    }
    if (!lua_isnumber(luaState, -1)) {
        Local<String> errorMessage = String::NewFromUtf8(isolate, "lua random did not return a number", String::kNormalString);
        isolate->ThrowException(errorMessage);
        return;
    }
    double res = lua_tonumber(luaState, -1);
    lua_pop(luaState, 1);
    Local<Number> result = Number::New(isolate, res);
    args.GetReturnValue().Set(result);
}

static void amunLuaRandomSeed(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    uint seed;
    if (!checkNumberOfArguments(isolate, 1, args.Length()) || !toUintChecked(isolate, args[0], seed)) {
        return;
    }
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    lua_State*& luaState = t->luaState();
    initLuaState(luaState);
    lua_getglobal(luaState, "math");
    lua_getfield(luaState, -1, "randomseed");
    lua_remove(luaState, -2);
    lua_pushnumber(luaState, seed);
    if(lua_pcall(luaState, 1, 0, 0) != 0) {
        handleLuaError("error randomseed", isolate, luaState);
        return;
    }
}

static void amunConnectDebugger(const FunctionCallbackInfo<Value>& args)
{
    // the internal debugger may not completely block the strategy, the simulator will not be paused
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());

    // test if a debugger can be connected
    bool canConnect = t->canConnectInternalDebugger();
    Local<Boolean> canRegister = Boolean::New(isolate, canConnect);
    args.GetReturnValue().Set(canRegister);
    if (!canConnect) {
        return;
    }

    if (args.Length() != 3 || !args[0]->IsFunction() || !args[1]->IsFunction() || !args[2]->IsFunction()) {
        isolate->ThrowException(String::NewFromUtf8(isolate, "connectDebugger takes three functions", String::kNormalString));
        return;
    }
    Local<Function> handleResponse = Local<Function>::Cast(args[0]);
    Local<Function> handleNotification = Local<Function>::Cast(args[1]);
    Local<Function> messageLoop = Local<Function>::Cast(args[2]);

    InternalDebugger *debugger = t->getInternalDebugger();
    debugger->setFunctions(handleResponse, handleNotification, messageLoop);
}

static void amunDebuggerSend(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    InternalDebugger *d = t->getInternalDebugger();
    if (args.Length() != 1 || !args[0]->IsString()) {
        isolate->ThrowException(String::NewFromUtf8(isolate, "debuggerSend takes one string", String::kNormalString));
        return;
    }
    Local<String> message = args[0]->ToString(isolate->GetCurrentContext()).ToLocalChecked();
    d->dispatchProtocolMessage((uint8_t*)*String::Utf8Value(isolate, message), message->Utf8Length());
}

static void amunDisconnectDebugger(const FunctionCallbackInfo<Value>& args)
{
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    t->getInternalDebugger()->clearFunctions();
}

struct FunctionInfo {
    const char *name;
    void(*function)(FunctionCallbackInfo<Value> const &);
};

void registerAmunJsCallbacks(Isolate *isolate, Local<Object> global, Typescript *t)
{
    QList<FunctionInfo> callbacks = {
        { "getGeometry",        amunGetGeometry},
        { "getTeam",            amunGetTeam},
        { "getStrategyPath",    amunGetStrategyPath},
        { "isBlue",             amunIsBlue},
        { "isReplay",           amunIsReplay},
        { "getSelectedOptions", amunGetSelectedOptions},
        { "getWorldState",      amunGetWorldState},
        { "getGameState",       amunGetGameState},
        { "getUserInput",       amunGetUserInput},
        { "log",                amunLog},
        { "addVisualization",   amunAddVisualization},
        { "addCircleSimple",    amunAddCircleSimple},
        { "addPathSimple",      amunAddPathSimple},
        { "addPolygonSimple",   amunAddPolygonSimple},
        { "addDebug",           amunAddDebug},
        { "addPlot",            amunAddPlot},
        { "getPerformanceMode", amunGetPerformanceMode},
        { "setCommand",         amunSetCommand},
        { "getCurrentTime",     amunGetCurrentTime},
        { "sendCommand",        amunSendCommand},
        { "sendRefereeCommand", amunSendRefereeCommand},
        { "sendMixedTeamInfo",  amunSendMixedTeamInfo},
        { "sendNetworkRefereeCommand", amunSendNetworkRefereeCommand},
        { "nextRefboxReply",    amunNextRefboxReply},
        { "setRobotExchangeSymbol", amunSetRobotExchangeSymbol},
        { "luaRandom",          amunLuaRandom},
        { "luaRandomSetSeed",   amunLuaRandomSeed},
        { "connectDebugger",    amunConnectDebugger},
        { "debuggerSend",       amunDebuggerSend},
        { "disconnectDebugger", amunDisconnectDebugger}};

    Local<Object> amunObject = Object::New(isolate);
    Local<String> amunStr = String::NewFromUtf8(isolate, "amun", NewStringType::kNormal).ToLocalChecked();
    for (auto callback : callbacks) {
        Local<String> name = String::NewFromUtf8(isolate, callback.name, NewStringType::kNormal).ToLocalChecked();
        auto functionTemplate = FunctionTemplate::New(isolate, callback.function, External::New(isolate, t), Local<Signature>(),
                                                      0, ConstructorBehavior::kThrow, SideEffectType::kHasSideEffect);
        Local<Function> function = functionTemplate->GetFunction(isolate->GetCurrentContext()).ToLocalChecked();
        function->SetName(name);
        amunObject->Set(name, function);
    }
    global->Set(amunStr, amunObject);
}
