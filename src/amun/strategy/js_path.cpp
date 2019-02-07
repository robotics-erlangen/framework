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

class QTPath: public QObject {
    Q_OBJECT
public:
    QTPath(uint32_t rng_seed, QObject* parent = nullptr):
        QObject(parent),
        p(rng_seed) {}
    Path& path() { return p; }
private:
    Path p;
};

// ensure that we got a valid number
static bool verifyNumber(Isolate *isolate, Local<Value> value, float &result)
{
    Maybe<double> maybeValue = value->NumberValue(isolate->GetCurrentContext());
    double v = 0.0;
    if (!maybeValue.To(&v) || std::isnan(v) || std::isinf(v)) {
        Local<String> errorMessage = String::NewFromUtf8(isolate, "Invalid argument", String::kNormalString);
        isolate->ThrowException(Exception::Error(errorMessage));
        return false;
    }
    result = float(v);
    return true;
}

static void pathCreate(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    QTPath *p = new QTPath(t->time(), t);
    args.GetReturnValue().Set(External::New(isolate, p));
}

static void pathDestroy(const FunctionCallbackInfo<Value>& args)
{
    QTPath *p = static_cast<QTPath*>(Local<External>::Cast(args[0])->Value());
    delete p;
}

static void pathReset(const FunctionCallbackInfo<Value>& args)
{
    Path& p = static_cast<QTPath*>(Local<External>::Cast(args[0])->Value())->path();
    p.reset();
}

static void pathClearObstacles(const FunctionCallbackInfo<Value>& args)
{
    Path& p = static_cast<QTPath*>(Local<External>::Cast(args[0])->Value())->path();
    p.clearObstacles();
}

static void pathSetBoundary(const FunctionCallbackInfo<Value>& args)
{
    Isolate * isolate = args.GetIsolate();
    Path& p = static_cast<QTPath*>(Local<External>::Cast(args[0])->Value())->path();
    float x1, y1, x2, y2;
    if (!verifyNumber(isolate, args[1], x1) || !verifyNumber(isolate, args[2], y1) ||
            !verifyNumber(isolate, args[3], x2) || !verifyNumber(isolate, args[4], y2)) {
        return;
    }
    p.setBoundary(x1, y1, x2, y2);
}

static void pathSetRadius(const FunctionCallbackInfo<Value>& args)
{
    Isolate * isolate = args.GetIsolate();
    Path& p = static_cast<QTPath*>(Local<External>::Cast(args[0])->Value())->path();
    float r;
    if (!verifyNumber(isolate, args[1], r)) {
        return;
    }
    p.setRadius(r);
}

static void pathAddCircle(const FunctionCallbackInfo<Value>& args)
{
    Isolate * isolate = args.GetIsolate();
    Path& p = static_cast<QTPath*>(Local<External>::Cast(args[0])->Value())->path();
    float x, y, r, prio;

    if (!verifyNumber(isolate, args[1], x) || !verifyNumber(isolate, args[2], y) ||
            !verifyNumber(isolate, args[3], r) || !verifyNumber(isolate, args[5], prio)) {
        return;
    }
    p.addCircle(x, y, r, nullptr, int(prio));
}

static void pathAddLine(const FunctionCallbackInfo<Value>& args)
{
    Isolate *isolate = args.GetIsolate();
    Path& p = static_cast<QTPath*>(Local<External>::Cast(args[0])->Value())->path();
    float x1, y1, x2, y2, width, prio;
    if (!verifyNumber(isolate, args[1], x1) || !verifyNumber(isolate, args[2], y1) ||
            !verifyNumber(isolate, args[3], x2) || !verifyNumber(isolate, args[4], y2) ||
            !verifyNumber(isolate, args[5], width) || !verifyNumber(isolate, args[7], prio)) {
        return;
    }

    // a line musn't have length zero
    if (x1 == x2 && y1 == y2) {
        isolate->ThrowException(Exception::Error(String::NewFromUtf8(isolate, "line must have non zero length", String::kNormalString)));
        return;
    }
    p.addLine(x1, y1, x2, y2, width, nullptr, int(prio));
}

static void pathSetProbabilities(const FunctionCallbackInfo<Value>& args)
{
    Isolate *isolate = args.GetIsolate();
    Path& p = static_cast<QTPath*>(Local<External>::Cast(args[0])->Value())->path();
    float pDest, pWp;
    if (!verifyNumber(isolate, args[1], pDest) || !verifyNumber(isolate, args[2], pWp)) {
        return;
    }
    p.setProbabilities(pDest, pWp);
}

static void pathAddSeedTarget(const FunctionCallbackInfo<Value>& args)
{
    Isolate *isolate = args.GetIsolate();
    Path& p = static_cast<QTPath*>(Local<External>::Cast(args[0])->Value())->path();
    float px, py;
    if (!verifyNumber(isolate, args[1], px) || !verifyNumber(isolate, args[2], py)) {
        return;
    }
    p.addSeedTarget(px, py);
}

static void pathAddRect(const FunctionCallbackInfo<Value>& args)
{
    Isolate *isolate = args.GetIsolate();
    Path& p = static_cast<QTPath*>(Local<External>::Cast(args[0])->Value())->path();
    float x1, y1, x2, y2, prio;
    if (!verifyNumber(isolate, args[1], x1) || !verifyNumber(isolate, args[2], y1) ||
            !verifyNumber(isolate, args[3], x2) || !verifyNumber(isolate, args[4], y2) ||
            !verifyNumber(isolate, args[6], prio)) {
        return;
    }

    p.addRect(x1, y1, x2, y2, nullptr, int(prio));
}

static void pathAddTriangle(const FunctionCallbackInfo<Value>& args)
{
    Isolate *isolate = args.GetIsolate();
    Path& p = static_cast<QTPath*>(Local<External>::Cast(args[0])->Value())->path();
    float x1, y1, x2, y2, x3, y3, lineWidth, prio;
    if (!verifyNumber(isolate, args[1], x1) || !verifyNumber(isolate, args[2], y1) ||
            !verifyNumber(isolate, args[3], x2) || !verifyNumber(isolate, args[4], y2) ||
            !verifyNumber(isolate, args[5], x3) || !verifyNumber(isolate, args[6], y3) ||
            !verifyNumber(isolate, args[7], lineWidth) || !verifyNumber(isolate, args[9], prio)) {
        return;
    }

    p.addTriangle(x1, y1, x2, y2, x3, y3, lineWidth, nullptr, int(prio));
}

static void pathTest(const FunctionCallbackInfo<Value>& args)
{
    Local<Context> c = args.GetIsolate()->GetCurrentContext();
    const qint64 t = Timer::systemTime();

    Path& p = static_cast<QTPath*>(Local<External>::Cast(args[0])->Value())->path();

    // get spline
    robot::Spline spline;
    if (!jsToProtobuf(args.GetIsolate(), args[1], c, spline)) {
        return;
    }

    if (spline.t_start() >= spline.t_end()) {
        args.GetIsolate()->ThrowException(Exception::Error(String::NewFromUtf8(args.GetIsolate(), "spline.t_start must be smaller than spline.t_end", String::kNormalString)));
        return;
    }

    float radius;
    if (!verifyNumber(args.GetIsolate(), args[2], radius)) {
        return;
    }
    const bool ret = p.testSpline(spline, radius);
    args.GetReturnValue().Set(Boolean::New(args.GetIsolate(), ret));

    Typescript *ts = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    ts->addPathTime((Timer::systemTime() - t) / 1E9);
}

static void pathGet(const FunctionCallbackInfo<Value>& args)
{
    Isolate *isolate = args.GetIsolate();
    const qint64 t = Timer::systemTime();

    // robot radius must have been set before
    Path& p = static_cast<QTPath*>(Local<External>::Cast(args[0])->Value())->path();
    if (!p.isRadiusValid()) {
        isolate->ThrowException(Exception::Error(String::NewFromUtf8(isolate, "Invalid radius", String::kNormalString)));
        return;
    }

    float startX, startY, endX, endY;
    if (!verifyNumber(isolate, args[1], startX) || !verifyNumber(isolate, args[2], startY) ||
            !verifyNumber(isolate, args[3], endX) || !verifyNumber(isolate, args[4], endY)) {
        return;
    }

    Path::List list = p.get(startX, startY, endX, endY);

    // convert path to js object
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

static void drawTree(Typescript *thread, const KdTree *tree) {
    if (tree == nullptr) {
        return;
    }
    const QList<const KdTree::Node *> nodes = tree->getChildren();

    amun::Point *point;
    // draw tree by creating lines from every node to its predecessor
    foreach (const KdTree::Node *node, nodes) {
        amun::Visualization *vis = thread->addVisualization();
        vis->set_name("RRT");
        amun::Pen *pen = vis->mutable_pen();
        pen->mutable_color()->set_red(255);
        amun::Path *path = vis->mutable_path();

        const Vector &p1 = tree->position(node);
        point = path->add_point();
        point->set_x(p1.x);
        point->set_y(p1.y);

        const KdTree::Node *endNode = tree->previous(node);
        if (tree->inObstacle(endNode)) { // mark line segments starting in an obstacle node
            pen->mutable_color()->set_blue(255);
        }
        const Vector &p2 = tree->position(endNode);
        point = path->add_point();
        point->set_x(p2.x);
        point->set_y(p2.y);
    }
}

static void pathAddTreeVisualization(const FunctionCallbackInfo<Value>& args)
{
    Path& p = static_cast<QTPath*>(Local<External>::Cast(args[0])->Value())->path();
    Typescript *t = static_cast<Typescript*>(Local<External>::Cast(args.Data())->Value());
    drawTree(t, p.treeStart());
    drawTree(t, p.treeEnd());
}

struct FunctionInfo {
    const char *name;
    void(*function)(FunctionCallbackInfo<Value> const &);
};

void registerPathJsCallbacks(Isolate *isolate, Local<Object> global, Typescript *t)
{
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
        { "getPath",            pathGet},
        { "addTreeVisualization", pathAddTreeVisualization}};

    Local<Object> pathObject = Object::New(isolate);
    Local<String> pathStr = String::NewFromUtf8(isolate, "path", NewStringType::kNormal).ToLocalChecked();
    for (auto callback : callbacks) {
        Local<String> name = String::NewFromUtf8(isolate, callback.name, NewStringType::kNormal).ToLocalChecked();
        auto functionTemplate = FunctionTemplate::New(isolate, callback.function, External::New(isolate, t),
                                                      Local<Signature>(), 0, ConstructorBehavior::kThrow, SideEffectType::kHasSideEffect);
        Local<Function> function = functionTemplate->GetFunction(isolate->GetCurrentContext()).ToLocalChecked();
        function->SetName(name);
        pathObject->Set(name, function);
    }
    global->Set(pathStr, pathObject);
}
#include "js_path.moc"
