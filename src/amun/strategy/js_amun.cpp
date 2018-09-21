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

#include <QList>
#include <functional>
#include <v8.h>

#include "js_protobuf.h"
#include "typescript.h"

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

// TODO: amunGetSelectedOptions

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

static void amunSetCommand(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());

    // set robot movement command
    // TODO: error handling
    Local<Context> context = isolate->GetCurrentContext();
    RobotCommand command(new robot::Command);
    const uint generation = args[0]->Uint32Value(context).ToChecked();
    const uint robotId = args[1]->Uint32Value(context).ToChecked();
    jsToProtobuf(isolate, args[2], context, *command);

    t->setCommand(generation, robotId, command);
}

static void amunLog(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());

    // TODO: string format functionality needed?
    // returns the string undefined if no argument is given
    String::Utf8Value value(isolate, args[0]);
    t->log(*value);
}

static void amunAddVisualization(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());

    amun::Visualization *vis = t->addVisualization();
    jsToProtobuf(isolate, args[0], isolate->GetCurrentContext(), *vis);
}

static void amunAddDebug(const FunctionCallbackInfo<Value>& args)
{
    // TODO: error messages
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    amun::DebugValue *debugValue = t->addDebug();
    String::Utf8Value key(isolate, args[0]);
    debugValue->set_key(*key);

    Local<Context> context = isolate->GetCurrentContext();
    Local<Value> value = args[1];
    if (value->IsNumber()) {
        debugValue->set_float_value(value->NumberValue(context).ToChecked());
    } else if (value->IsBoolean()) {
        debugValue->set_bool_value(value->BooleanValue(context).ToChecked());
    } else if (value->IsString()) {
        debugValue->set_string_value(*String::Utf8Value(value));
    } else if (value->IsUndefined()) {
        debugValue->set_string_value("<undefined>");
    }
}

static void amunAddPlot(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    amun::PlotValue *value = t->addPlot();
    value->set_name(*String::Utf8Value(isolate, args[0]));
    double number = 0.0;
    args[1]->NumberValue(isolate->GetCurrentContext()).To(&number);
    value->set_value(float(number));
}

// TODO: amunSendCommand, amunSendRefereeCommand, amunSendMixedTeamInfo, amunSendNetworkRefereeCommand
//      amunNextRefboxReply, amunSetRobotExchangeSymbol, amunDebuggerRead, amunDebuggerWrite

static void amunGetPerformanceMode(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    Local<Boolean> result = Boolean::New(isolate, t->isPerformanceMode());
    args.GetReturnValue().Set(result);
}

struct FunctionInfo {
    const char *name;
    void(*function)(FunctionCallbackInfo<Value> const &);
};

void registerAmunJsCallbacks(Isolate *isolate, Local<Object> global, Typescript *t)
{
    // TODO: set side effect property
    QList<FunctionInfo> callbacks = {
        { "getGeometry",        amunGetGeometry},
        { "getTeam",            amunGetTeam},
        { "getStrategyPath",    amunGetStrategyPath},
        { "isBlue",             amunIsBlue},
        { "isReplay",           amunIsReplay},
        { "getWorldState",      amunGetWorldState},
        { "getGameState",       amunGetGameState},
        { "getUserInput",       amunGetUserInput},
        { "log",                amunLog},
        { "addVisualization",   amunAddVisualization},
        { "addDebug",           amunAddDebug},
        { "addPlot",            amunAddPlot},
        { "getPerformanceMode", amunGetPerformanceMode},
        { "setCommand",         amunSetCommand},
        { "getCurrentTime",     amunGetCurrentTime}};

    Local<Object> amunObject = Object::New(isolate);
    Local<String> amunStr = String::NewFromUtf8(isolate, "amun", NewStringType::kNormal).ToLocalChecked();
    for (auto callback : callbacks) {
        Local<String> name = String::NewFromUtf8(isolate, callback.name, NewStringType::kNormal).ToLocalChecked();
        auto functionTemplate = FunctionTemplate::New(isolate, callback.function, External::New(isolate, t));
        amunObject->Set(name, functionTemplate->GetFunction(isolate->GetCurrentContext()).ToLocalChecked());
    }
    global->Set(amunStr, amunObject);
}
