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
#include "typescript.h"
#include "js_protobuf.h"

#include "v8.h"
#include <QList>
#include <functional>

using namespace v8;

static void amunLog(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());

    // TODO: string format functionality needed?
    // returns the string undefined if no argument is given
    String::Utf8Value value(isolate, args[0]);
    t->log(*value);
}

struct FunctionInfo {
    const char *name;
    void(*function)(FunctionCallbackInfo<Value> const &);
};

void registerAmunJsCallbacks(Isolate *isolate, Local<ObjectTemplate> global, Typescript *t)
{
    // TODO: set side effect property
    QList<FunctionInfo> callbacks = {
        { "amunLog",        amunLog} };

    for (auto callback : callbacks) {
        Local<String> name = String::NewFromUtf8(isolate, callback.name, NewStringType::kNormal).ToLocalChecked();
        global->Set(name, FunctionTemplate::New(isolate, callback.function, External::New(isolate, t)));
    }
}
