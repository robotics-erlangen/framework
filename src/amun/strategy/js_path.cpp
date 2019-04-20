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
#include "path/trajectorypath.h"
#include "path/vector.h"
#include "core/timer.h"
#include "protobuf/debug.pb.h"
#include "protobuf/robot.pb.h"
#include "js_protobuf.h"
#include "typescript.h"

using namespace v8;

// takes a function of the form functionName: (QTPath *wrapper, const FunctionCallbackInfo<Value>& args, int offset) -> void
// and generates two function, functionName_new and functionName_legacy.
// In the legacy path interface, the path instance was given as the first parameter of all function calls,
// while in the new path interface, it is stored in the functions additional data (not modifiable by javascript code).
#define GENERATE_FUNCTIONS(X) \
    static void X##_new(const FunctionCallbackInfo<Value>& args) { X(static_cast<QTPath*>(Local<External>::Cast(args.Data())->Value()), args, 0); } \
    static void X##_legacy(const FunctionCallbackInfo<Value>& args) { X(static_cast<QTPath*>(Local<External>::Cast(args[0])->Value()), args, 1); }


class QTPath: public QObject {
    Q_OBJECT
public:
    QTPath(Path *p, TrajectoryPath *tp, Typescript *t):
        QObject(t),
        p(p),
        tp(tp),
        t(t) {}
    Path *path() const { return p.get(); }
    AbstractPath *abstractPath() const { return p ? static_cast<AbstractPath*>(p.get()) : tp.get(); }
    TrajectoryPath *trajectoryPath() const { return tp.get(); }
    Typescript *typescript() const { return t; }

private:
    std::unique_ptr<Path> p;
    std::unique_ptr<TrajectoryPath> tp;
    Typescript *t;
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

static Local<String> createV8String(Isolate *isolate, const char *text)
{
    return String::NewFromUtf8(isolate, text, String::kNormalString);
}

static void pathDestroy(QTPath *wrapper, const FunctionCallbackInfo<Value>&, int)
{
    delete wrapper->abstractPath();
}
GENERATE_FUNCTIONS(pathDestroy);

static void pathReset(QTPath *wrapper, const FunctionCallbackInfo<Value>&, int)
{
    wrapper->abstractPath()->reset();
}
GENERATE_FUNCTIONS(pathReset);

static void pathClearObstacles(QTPath *wrapper, const FunctionCallbackInfo<Value>&, int)
{
    wrapper->abstractPath()->clearObstacles();
}
GENERATE_FUNCTIONS(pathClearObstacles);

static void pathSetBoundary(QTPath *wrapper, const FunctionCallbackInfo<Value>& args, int offset)
{
    Isolate * isolate = args.GetIsolate();

    float x1, y1, x2, y2;
    if (!verifyNumber(isolate, args[offset], x1) || !verifyNumber(isolate, args[1 + offset], y1) ||
            !verifyNumber(isolate, args[2 + offset], x2) || !verifyNumber(isolate, args[3 + offset], y2)) {
        return;
    }
    wrapper->abstractPath()->setBoundary(x1, y1, x2, y2);
}
GENERATE_FUNCTIONS(pathSetBoundary);

static void pathSetRadius(QTPath *wrapper, const FunctionCallbackInfo<Value>& args, int offset)
{
    Isolate * isolate = args.GetIsolate();
    float r;
    if (!verifyNumber(isolate, args[offset], r)) {
        return;
    }
    wrapper->abstractPath()->setRadius(r);
}
GENERATE_FUNCTIONS(pathSetRadius);

static void pathAddCircle(QTPath *wrapper, const FunctionCallbackInfo<Value>& args, int offset)
{
    Isolate * isolate = args.GetIsolate();
    float x, y, r, prio;

    if (!verifyNumber(isolate, args[offset], x) || !verifyNumber(isolate, args[1 + offset], y) ||
            !verifyNumber(isolate, args[2 + offset], r) || !verifyNumber(isolate, args[4 + offset], prio)) {
        return;
    }
    wrapper->abstractPath()->addCircle(x, y, r, nullptr, int(prio));
}
GENERATE_FUNCTIONS(pathAddCircle);

static void pathAddLine(QTPath *wrapper, const FunctionCallbackInfo<Value>& args, int offset)
{
    Isolate *isolate = args.GetIsolate();
    float x1, y1, x2, y2, width, prio;
    if (!verifyNumber(isolate, args[offset], x1) || !verifyNumber(isolate, args[1 + offset], y1) ||
            !verifyNumber(isolate, args[2 + offset], x2) || !verifyNumber(isolate, args[3 + offset], y2) ||
            !verifyNumber(isolate, args[4 + offset], width) || !verifyNumber(isolate, args[6 + offset], prio)) {
        return;
    }

    // a line musn't have length zero
    if (x1 == x2 && y1 == y2) {
        isolate->ThrowException(Exception::Error(String::NewFromUtf8(isolate, "line must have non zero length", String::kNormalString)));
        return;
    }
    wrapper->abstractPath()->addLine(x1, y1, x2, y2, width, nullptr, int(prio));
}
GENERATE_FUNCTIONS(pathAddLine);

static void pathSetProbabilities(QTPath *wrapper, const FunctionCallbackInfo<Value>& args, int offset)
{
    Isolate *isolate = args.GetIsolate();
    float pDest, pWp;
    if (!verifyNumber(isolate, args[offset], pDest) || !verifyNumber(isolate, args[1 + offset], pWp)) {
        return;
    }
    wrapper->path()->setProbabilities(pDest, pWp);
}
GENERATE_FUNCTIONS(pathSetProbabilities);

static void pathAddSeedTarget(QTPath *wrapper, const FunctionCallbackInfo<Value>& args, int offset)
{
    Isolate *isolate = args.GetIsolate();
    float px, py;
    if (!verifyNumber(isolate, args[offset], px) || !verifyNumber(isolate, args[1 + offset], py)) {
        return;
    }
    wrapper->path()->addSeedTarget(px, py);
}
GENERATE_FUNCTIONS(pathAddSeedTarget);

static void pathAddRect(QTPath *wrapper, const FunctionCallbackInfo<Value>& args, int offset)
{
    Isolate *isolate = args.GetIsolate();
    float x1, y1, x2, y2, prio;
    if (!verifyNumber(isolate, args[offset], x1) || !verifyNumber(isolate, args[1 + offset], y1) ||
            !verifyNumber(isolate, args[2 + offset], x2) || !verifyNumber(isolate, args[3 + offset], y2) ||
            !verifyNumber(isolate, args[5 + offset], prio)) {
        return;
    }

    wrapper->abstractPath()->addRect(x1, y1, x2, y2, nullptr, int(prio));
}
GENERATE_FUNCTIONS(pathAddRect);

static void pathAddTriangle(QTPath *wrapper, const FunctionCallbackInfo<Value>& args, int offset)
{
    Isolate *isolate = args.GetIsolate();
    float x1, y1, x2, y2, x3, y3, lineWidth, prio;
    if (!verifyNumber(isolate, args[offset], x1) || !verifyNumber(isolate, args[1 + offset], y1) ||
            !verifyNumber(isolate, args[2 + offset], x2) || !verifyNumber(isolate, args[3 + offset], y2) ||
            !verifyNumber(isolate, args[4 + offset], x3) || !verifyNumber(isolate, args[5 + offset], y3) ||
            !verifyNumber(isolate, args[6 + offset], lineWidth) || !verifyNumber(isolate, args[8 + offset], prio)) {
        return;
    }

    wrapper->abstractPath()->addTriangle(x1, y1, x2, y2, x3, y3, lineWidth, nullptr, int(prio));
}
GENERATE_FUNCTIONS(pathAddTriangle);

static void pathTest(QTPath *wrapper, const FunctionCallbackInfo<Value>& args, int offset)
{
    Local<Context> c = args.GetIsolate()->GetCurrentContext();
    const qint64 t = Timer::systemTime();

    // get spline
    robot::Spline spline;
    if (!jsToProtobuf(args.GetIsolate(), args[offset], c, spline)) {
        return;
    }

    if (spline.t_start() >= spline.t_end()) {
        args.GetIsolate()->ThrowException(Exception::Error(String::NewFromUtf8(args.GetIsolate(), "spline.t_start must be smaller than spline.t_end", String::kNormalString)));
        return;
    }

    float radius;
    if (!verifyNumber(args.GetIsolate(), args[1 + offset], radius)) {
        return;
    }
    const bool ret = wrapper->path()->testSpline(spline, radius);
    args.GetReturnValue().Set(Boolean::New(args.GetIsolate(), ret));

    wrapper->typescript()->addPathTime((Timer::systemTime() - t) / 1E9);
}
GENERATE_FUNCTIONS(pathTest);

static void pathGet(QTPath *wrapper, const FunctionCallbackInfo<Value>& args, int offset)
{
    Isolate *isolate = args.GetIsolate();
    const qint64 t = Timer::systemTime();

    // robot radius must have been set before
    if (!wrapper->path()->isRadiusValid()) {
        isolate->ThrowException(Exception::Error(String::NewFromUtf8(isolate, "Invalid radius", String::kNormalString)));
        return;
    }

    float startX, startY, endX, endY;
    if (!verifyNumber(isolate, args[offset], startX) || !verifyNumber(isolate, args[1 + offset], startY) ||
            !verifyNumber(isolate, args[2 + offset], endX) || !verifyNumber(isolate, args[3 + offset], endY)) {
        return;
    }

    Path::List list = wrapper->path()->get(startX, startY, endX, endY);

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

    wrapper->typescript()->addPathTime((Timer::systemTime() - t) / 1E9);
    args.GetReturnValue().Set(result);
}
GENERATE_FUNCTIONS(pathGet);

static void trajectoryPathGet(const FunctionCallbackInfo<Value>& args)
{
    QTPath *wrapper = static_cast<QTPath*>(Local<External>::Cast(args.Data())->Value());
    Isolate *isolate = args.GetIsolate();
    const qint64 t = Timer::systemTime();

    // robot radius must have been set before
    if (!wrapper->trajectoryPath()->isRadiusValid()) {
        isolate->ThrowException(Exception::Error(String::NewFromUtf8(isolate, "Invalid radius", String::kNormalString)));
        return;
    }

    float startX, startY, startSpeedX, startSpeedY, endX, endY, endSpeedX, endSpeedY, maxSpeed, acceleration;
    if (!verifyNumber(isolate, args[0], startX) || !verifyNumber(isolate, args[1], startY) ||
            !verifyNumber(isolate, args[2], startSpeedX) || !verifyNumber(isolate, args[3], startSpeedY) ||
            !verifyNumber(isolate, args[4], endX) || !verifyNumber(isolate, args[5], endY) ||
            !verifyNumber(isolate, args[6], endSpeedX) || !verifyNumber(isolate, args[7], endSpeedY) ||
            !verifyNumber(isolate, args[8], maxSpeed) || !verifyNumber(isolate, args[9], acceleration)) {
        isolate->ThrowException(Exception::Error(String::NewFromUtf8(isolate, "Invalid arguments", String::kNormalString)));
        return;
    }

    std::vector<TrajectoryPath::Point> trajectory = wrapper->trajectoryPath()->calculateTrajectory(Vector(startX, startY), Vector(startSpeedX, startSpeedY),
                                                     Vector(endX, endY), Vector(endSpeedX, endSpeedY), maxSpeed, acceleration);

    // convert path to js object
    unsigned int i = 0;
    Local<Array> result = Array::New(isolate, trajectory.size());
    Local<String> pxString = String::NewFromUtf8(isolate, "px", NewStringType::kNormal).ToLocalChecked();
    Local<String> pyString = String::NewFromUtf8(isolate, "py", NewStringType::kNormal).ToLocalChecked();
    Local<String> vxString = String::NewFromUtf8(isolate, "vx", NewStringType::kNormal).ToLocalChecked();
    Local<String> vyString = String::NewFromUtf8(isolate, "vy", NewStringType::kNormal).ToLocalChecked();
    Local<String> timeString = String::NewFromUtf8(isolate, "time", NewStringType::kNormal).ToLocalChecked();
    for (const auto &p : trajectory) {
        Local<Object> pathPart = Object::New(isolate);
        pathPart->Set(pxString, Number::New(isolate, double(p.pos.x)));
        pathPart->Set(pyString, Number::New(isolate, double(p.pos.y)));
        pathPart->Set(vxString, Number::New(isolate, double(p.speed.x)));
        pathPart->Set(vyString, Number::New(isolate, double(p.speed.y)));
        pathPart->Set(timeString, Number::New(isolate, double(p.time)));
        result->Set(i++, pathPart);
    }

    wrapper->typescript()->addPathTime((Timer::systemTime() - t) / 1E9);
    args.GetReturnValue().Set(result);
}

static void trajectoryAddMovingCircle(const FunctionCallbackInfo<Value>& args)
{
    Isolate * isolate = args.GetIsolate();
    float startTime, endTime, x, y, speedX, speedY, radius, priority;

    if (!verifyNumber(isolate, args[0], startTime) || !verifyNumber(isolate, args[1], endTime) ||
            !verifyNumber(isolate, args[2], x) || !verifyNumber(isolate, args[4], y) ||
            !verifyNumber(isolate, args[4], speedX) || !verifyNumber(isolate, args[5], speedY) ||
            !verifyNumber(isolate, args[6], radius) || !verifyNumber(isolate, args[7], priority)) {
        return;
    }
    static_cast<QTPath*>(Local<External>::Cast(args.Data())->Value())->trajectoryPath()->addMovingCircle(Vector(x, y), Vector(speedX, speedY),
                                                                                                       startTime, endTime, radius);
}

static void drawTree(Typescript *thread, const KdTree *tree)
{
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

static void pathAddTreeVisualization(QTPath *wrapper, const FunctionCallbackInfo<Value>&, int)
{
    drawTree(wrapper->typescript(), wrapper->path()->treeStart());
    drawTree(wrapper->typescript(), wrapper->path()->treeEnd());
}
GENERATE_FUNCTIONS(pathAddTreeVisualization);

struct FunctionInfo {
    const char *name;
    void(*function)(FunctionCallbackInfo<Value> const &);
};

static QList<FunctionInfo> commonCallbacks = {
    { "destroy",            pathDestroy_new},
    { "reset",              pathReset_new},
    { "clearObstacles",     pathClearObstacles_new},
    { "setBoundary",        pathSetBoundary_new},
    { "setRadius",          pathSetRadius_new},
    { "addCircle",          pathAddCircle_new},
    { "addLine",            pathAddLine_new},
    { "addRect",            pathAddRect_new},
    { "addTriangle",        pathAddTriangle_new}};

static QList<FunctionInfo> rrtPathCallbacks = {
    { "setProbabilities",   pathSetProbabilities_new},
    { "addSeedTarget",      pathAddSeedTarget_new},
    { "test",               pathTest_new},
    { "getPath",            pathGet_new},
    { "addTreeVisualization", pathAddTreeVisualization_new}};

static QList<FunctionInfo> trajectoryPathCallbacks = {
    { "calculateTrajectory", trajectoryPathGet },
    { "addMovingCircle",    trajectoryAddMovingCircle}};

static void pathObjectAddFunctions(Isolate *isolate, const QList<FunctionInfo> &callbacks, Local<Object> &pathWrapper,
                                   Local<External> &pathObject)
{
    for (auto callback : callbacks) {
        Local<Function> function = Function::New(isolate->GetCurrentContext(), callback.function,
                                                 pathObject).ToLocalChecked();
        pathWrapper->Set(createV8String(isolate, callback.name), function);
    }
}

static void pathCreateNew(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *ts = static_cast<QTPath*>(Local<External>::Cast(args.Data())->Value())->typescript();
    QTPath *p = new QTPath(new Path(ts->time()), nullptr, ts);

    Local<Object> pathWrapper = Object::New(isolate);
    Local<External> pathObject = External::New(isolate, p);
    pathObjectAddFunctions(isolate, commonCallbacks, pathWrapper, pathObject);
    pathObjectAddFunctions(isolate, rrtPathCallbacks, pathWrapper, pathObject);
    args.GetReturnValue().Set(pathWrapper);
}

static void trajectoryPathCreateNew(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *ts = static_cast<QTPath*>(Local<External>::Cast(args.Data())->Value())->typescript();
    QTPath *p = new QTPath(nullptr, new TrajectoryPath(ts->time()), ts);

    Local<Object> pathWrapper = Object::New(isolate);
    Local<External> pathObject = External::New(isolate, p);
    pathObjectAddFunctions(isolate, commonCallbacks, pathWrapper, pathObject);
    pathObjectAddFunctions(isolate, trajectoryPathCallbacks, pathWrapper, pathObject);
    args.GetReturnValue().Set(pathWrapper);
}

static void pathCreateOld(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *ts = static_cast<QTPath*>(Local<External>::Cast(args.Data())->Value())->typescript();
    QTPath *p = new QTPath(new Path(ts->time()), nullptr, ts);
    args.GetReturnValue().Set(External::New(isolate, p));
}

void registerPathJsCallbacks(Isolate *isolate, Local<Object> global, Typescript *t)
{
    QList<FunctionInfo> callbacks = {
        { "createPath",         pathCreateNew},
        { "createTrajectoryPath", trajectoryPathCreateNew},
        // legacy functions, kept for backwards compatibility
        { "create",             pathCreateOld},
        { "destroy",            pathDestroy_legacy},
        { "reset",              pathReset_legacy},
        { "clearObstacles",     pathClearObstacles_legacy},
        { "setBoundary",        pathSetBoundary_legacy},
        { "setRadius",          pathSetRadius_legacy},
        { "addCircle",          pathAddCircle_legacy},
        { "addLine",            pathAddLine_legacy},
        { "setProbabilities",   pathSetProbabilities_legacy},
        { "addSeedTarget",      pathAddSeedTarget_legacy},
        { "addRect",            pathAddRect_legacy},
        { "addTriangle",        pathAddTriangle_legacy},
        { "test",               pathTest_legacy},
        { "getPath",            pathGet_legacy},
        { "addTreeVisualization", pathAddTreeVisualization_legacy}};

    Local<Object> pathObject = Object::New(isolate);
    Local<String> pathStr = String::NewFromUtf8(isolate, "path", NewStringType::kNormal).ToLocalChecked();
    for (auto callback : callbacks) {
        QTPath *path = new QTPath(nullptr, nullptr, t);
        Local<String> name = String::NewFromUtf8(isolate, callback.name, NewStringType::kNormal).ToLocalChecked();
        auto functionTemplate = FunctionTemplate::New(isolate, callback.function, External::New(isolate, path),
                                                      Local<Signature>(), 0, ConstructorBehavior::kThrow, SideEffectType::kHasSideEffect);
        Local<Function> function = functionTemplate->GetFunction(isolate->GetCurrentContext()).ToLocalChecked();
        function->SetName(name);
        pathObject->Set(name, function);
    }
    global->Set(pathStr, pathObject);
}
#include "js_path.moc"
