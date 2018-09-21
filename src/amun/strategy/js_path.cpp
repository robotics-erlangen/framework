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

#include "js_path.h"

#include <QList>
#include <v8.h>

#include "path/path.h"
#include "core/timer.h"
#include "protobuf/debug.pb.h"
#include "protobuf/robot.pb.h"
#include "js_protobuf.h"
#include "typescript.h"

using namespace v8;

// TODO: obstacle names

// ensure that we got a valid number
static float verifyNumber(Local<Context> &context, Local<Value> value)
{
    // TODO: error handling
    const float number = float(value->NumberValue(context).ToChecked());
    if (std::isnan(number) || std::isinf(number)) {
        return 0; // TODO
    }
    return number;
}

// Path is a C++ class and thus can't be created with newuserdata
static void pathCreate(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    Path *p = new Path(t->time());
    args.GetReturnValue().Set(External::New(isolate, p));
}

static void pathDestroy(const FunctionCallbackInfo<Value>& args)
{
    Path *p = static_cast<Path*>(Local<External>::Cast(args[0])->Value());
    delete p;
}

static void pathReset(const FunctionCallbackInfo<Value>& args)
{
    Path *p = static_cast<Path*>(Local<External>::Cast(args[0])->Value());
    p->reset();
}

static void pathClearObstacles(const FunctionCallbackInfo<Value>& args)
{
    Path *p = static_cast<Path*>(Local<External>::Cast(args[0])->Value());
    p->clearObstacles();
}

static void pathSetBoundary(const FunctionCallbackInfo<Value>& args)
{
    Local<Context> c = args.GetIsolate()->GetCurrentContext();
    Path *p = static_cast<Path*>(Local<External>::Cast(args[0])->Value());
    const float x1 = verifyNumber(c, args[1]);
    const float y1 = verifyNumber(c, args[2]);
    const float x2 = verifyNumber(c, args[3]);
    const float y2 = verifyNumber(c, args[4]);
    p->setBoundary(x1, y1, x2, y2);
}

static void pathSetRadius(const FunctionCallbackInfo<Value>& args)
{
    Local<Context> c = args.GetIsolate()->GetCurrentContext();
    Path *p = static_cast<Path*>(Local<External>::Cast(args[0])->Value());
    const float r = verifyNumber(c, args[1]);
    p->setRadius(r);
}

static void pathAddCircle(const FunctionCallbackInfo<Value>& args)
{
    Local<Context> c = args.GetIsolate()->GetCurrentContext();
    Path *p = static_cast<Path*>(Local<External>::Cast(args[0])->Value());
    const float x = verifyNumber(c, args[1]);
    const float y = verifyNumber(c, args[2]);
    const float r = verifyNumber(c, args[3]);
    const char* name = nullptr;
    const int prio = int(verifyNumber(c, args[4]));
    p->addCircle(x, y, r, name, prio);
}

static void pathAddLine(const FunctionCallbackInfo<Value>& args)
{
    Local<Context> c = args.GetIsolate()->GetCurrentContext();
    Path *p = static_cast<Path*>(Local<External>::Cast(args[0])->Value());
    const float x1 = verifyNumber(c, args[1]);
    const float y1 = verifyNumber(c, args[2]);
    const float x2 = verifyNumber(c, args[3]);
    const float y2 = verifyNumber(c, args[4]);
    const float width = verifyNumber(c, args[5]);

    const char* name = nullptr;
    const int prio = int(verifyNumber(c, args[6]));

    // a line musn't have length zero
    if (x1 == x2 && y1 == y2) {
        // TODO: error handling
        return;
    }
    p->addLine(x1, y1, x2, y2, width, name, prio);
}

static void pathSetProbabilities(const FunctionCallbackInfo<Value>& args)
{
    Local<Context> c = args.GetIsolate()->GetCurrentContext();
    Path *p = static_cast<Path*>(Local<External>::Cast(args[0])->Value());
    const float p_dest = verifyNumber(c, args[1]);
    const float p_wp = verifyNumber(c, args[2]);
    p->setProbabilities(p_dest, p_wp);
}

static void pathAddSeedTarget(const FunctionCallbackInfo<Value>& args)
{
    Local<Context> c = args.GetIsolate()->GetCurrentContext();
    Path *p = static_cast<Path*>(Local<External>::Cast(args[0])->Value());
    const float p_x = verifyNumber(c, args[1]);
    const float p_y = verifyNumber(c, args[2]);
    p->addSeedTarget(p_x, p_y);
}

static void pathAddRect(const FunctionCallbackInfo<Value>& args)
{
    Local<Context> c = args.GetIsolate()->GetCurrentContext();
    Path *p = static_cast<Path*>(Local<External>::Cast(args[0])->Value());
    const float x1 = verifyNumber(c, args[1]);
    const float y1 = verifyNumber(c, args[2]);
    const float x2 = verifyNumber(c, args[3]);
    const float y2 = verifyNumber(c, args[4]);

    const char* name = nullptr;
    const int prio = int(verifyNumber(c, args[5]));

    p->addRect(x1, y1, x2, y2, name, prio);
}

static void pathAddTriangle(const FunctionCallbackInfo<Value>& args)
{
    Local<Context> c = args.GetIsolate()->GetCurrentContext();
    Path *p = static_cast<Path*>(Local<External>::Cast(args[0])->Value());
    const float x1 = verifyNumber(c, args[1]);
    const float y1 = verifyNumber(c, args[2]);
    const float x2 = verifyNumber(c, args[3]);
    const float y2 = verifyNumber(c, args[4]);
    const float x3 = verifyNumber(c, args[5]);
    const float y3 = verifyNumber(c, args[6]);
    const float lineWidth = verifyNumber(c, args[7]);

    const char* name = nullptr;
    const int prio = int(verifyNumber(c, args[8]));

    p->addTriangle(x1, y1, x2, y2, x3, y3, lineWidth, name, prio);
}

static void pathTest(const FunctionCallbackInfo<Value>& args)
{
    Local<Context> c = args.GetIsolate()->GetCurrentContext();
    const qint64 t = Timer::systemTime();

    Path *p = static_cast<Path*>(Local<External>::Cast(args[0])->Value());

    // get spline
    robot::Spline spline;
    jsToProtobuf(args.GetIsolate(), args[1], c, spline);

    if (spline.t_start() >= spline.t_end()) {
        // TODO: error handling
        return;
    }

    const float radius = verifyNumber(c, args[2]);
    const bool ret = p->testSpline(spline, radius);
    args.GetReturnValue().Set(Boolean::New(args.GetIsolate(), ret));

    Typescript *ts = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    ts->addPathTime((Timer::systemTime() - t) / 1E9);
}

static void pathGet(const FunctionCallbackInfo<Value>& args)
{
    Isolate *isolate = args.GetIsolate();
    Local<Context> c = args.GetIsolate()->GetCurrentContext();
    const qint64 t = Timer::systemTime();

    // robot radius must have been set before
    Path *p = static_cast<Path*>(Local<External>::Cast(args[0])->Value());
    if (!p->isRadiusValid()) {
        // TODO: error handling
        return;
    }

    const float start_x = verifyNumber(c, args[1]);
    const float start_y = verifyNumber(c, args[2]);
    const float end_x = verifyNumber(c, args[3]);
    const float end_y = verifyNumber(c, args[4]);

    Path::List list = p->get(start_x, start_y, end_x, end_y);

    // convert path to lua table
    unsigned int i = 0;
    Local<Array> result = Array::New(isolate, list.size());
    Local<String> pxString = String::NewFromUtf8(isolate, "p_x", NewStringType::kNormal).ToLocalChecked();
    Local<String> pyString = String::NewFromUtf8(isolate, "p_y", NewStringType::kNormal).ToLocalChecked();
    Local<String> leftString = String::NewFromUtf8(isolate, "left", NewStringType::kNormal).ToLocalChecked();
    Local<String> rightString = String::NewFromUtf8(isolate, "right", NewStringType::kNormal).ToLocalChecked();
    for (const Path::Waypoint &wp : list) {
        Local<Object> wayPoint = Object::New(isolate);
        wayPoint->Set(pxString, Number::New(isolate, double(wp.x)));
        wayPoint->Set(pyString, Number::New(isolate, double(wp.y)));
        wayPoint->Set(leftString, Number::New(isolate, double(wp.l)));
        wayPoint->Set(rightString, Number::New(isolate, double(wp.r)));
        result->Set(i++, wayPoint);
    }

    Typescript *ts = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    ts->addPathTime((Timer::systemTime() - t) / 1E9);
    args.GetReturnValue().Set(result);
}

// TODO: drawTreeVisualization

struct FunctionInfo {
    const char *name;
    void(*function)(FunctionCallbackInfo<Value> const &);
};

void registerPathJsCallbacks(Isolate *isolate, Local<Object> global, Typescript *t)
{
    // TODO: set side effect property
    QList<FunctionInfo> callbacks = {
        { "create",             pathCreate},
        { "destroy",            pathDestroy},
        { "reset",              pathReset},
        { "clearObstacles",     pathClearObstacles},
        { "setBoundary",        pathSetBoundary},
        { "setRadius",          pathSetRadius},
        { "addCircle",          pathAddCircle},
        { "addLine",            pathAddLine},
        { "setProbabilities",   pathSetProbabilities},
        { "addSeedTarget",      pathAddSeedTarget},
        { "addRect",            pathAddRect},
        { "addTriangle",        pathAddTriangle},
        { "test",               pathTest},
        { "getPath",            pathGet}};

    Local<Object> pathObject = Object::New(isolate);
    Local<String> pathStr = String::NewFromUtf8(isolate, "path", NewStringType::kNormal).ToLocalChecked();
    for (auto callback : callbacks) {
        Local<String> name = String::NewFromUtf8(isolate, callback.name, NewStringType::kNormal).ToLocalChecked();
        auto functionTemplate = FunctionTemplate::New(isolate, callback.function, External::New(isolate, t));
        pathObject->Set(name, functionTemplate->GetFunction(isolate->GetCurrentContext()).ToLocalChecked());
    }
    global->Set(pathStr, pathObject);
}
