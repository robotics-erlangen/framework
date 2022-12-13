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
#include "strategy/script/scriptstate.h"
#include "path/path.h"
#include "path/trajectorypath.h"
#include "core/vector.h"
#include "core/timer.h"
#include "config/config.h"
#include "protobuf/debug.pb.h"
#include "protobuf/robot.pb.h"
#include "js_protobuf.h"
#include "typescript.h"
#include "v8utility.h"

using namespace v8;
using namespace v8helper;

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
        t(t)
    {
        if (tp != nullptr) {
            connect(tp, SIGNAL(gotDebug(amun::DebugValue)), t, SLOT(handleDebug(amun::DebugValue)));
            connect(tp, SIGNAL(gotLog(QString)), t, SLOT(handleLog(QString)));
            connect(tp, SIGNAL(gotVisualization(amun::Visualization)), t, SLOT(handleVisualization(amun::Visualization)));
        }
    }
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
        Local<String> errorMessage = v8string(isolate, "Invalid argument");
        isolate->ThrowException(Exception::Error(errorMessage));
        return false;
    }
    result = float(v);
    return true;
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

static void pathSeedRandom(const FunctionCallbackInfo<Value>& args)
{
    Isolate * isolate = args.GetIsolate();
    QTPath *wrapper = static_cast<QTPath*>(Local<External>::Cast(args.Data())->Value());

    Maybe<double> maybeSeed = args[0]->NumberValue(isolate->GetCurrentContext());
    double seed = 0;
    if (!maybeSeed.To(&seed)) {
        return;
    }
    wrapper->abstractPath()->seedRandom(static_cast<uint32_t>(static_cast<int64_t>(
        std::fmod(seed, std::numeric_limits<int64_t>::max())
    )));
}

static void pathSetBoundary(QTPath *wrapper, const FunctionCallbackInfo<Value>& args, int offset)
{
    Isolate * isolate = args.GetIsolate();

    float x1, y1, x2, y2;
    if (!verifyNumber(isolate, args[offset], x1) || !verifyNumber(isolate, args[1 + offset], y1) ||
            !verifyNumber(isolate, args[2 + offset], x2) || !verifyNumber(isolate, args[3 + offset], y2)) {
        return;
    }
    wrapper->abstractPath()->world().setBoundary(x1, y1, x2, y2);
}
GENERATE_FUNCTIONS(pathSetBoundary);

static void pathSetRadius(QTPath *wrapper, const FunctionCallbackInfo<Value>& args, int offset)
{
    Isolate * isolate = args.GetIsolate();
    float r;
    if (!verifyNumber(isolate, args[offset], r)) {
        return;
    }
    wrapper->abstractPath()->world().setRadius(r);
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
    wrapper->abstractPath()->world().addCircle(x, y, r, nullptr, int(prio));
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
        isolate->ThrowException(Exception::Error(v8string(isolate, "line must have non zero length")));
        return;
    }
    wrapper->abstractPath()->world().addLine(x1, y1, x2, y2, width, nullptr, int(prio));
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
    float radius = 0;
    if (args[6 + offset]->IsNumber()) {
        radius = args[6 + offset]->ToNumber(isolate->GetCurrentContext()).ToLocalChecked()->Value();
    }

    wrapper->abstractPath()->world().addRect(x1, y1, x2, y2, nullptr, int(prio), radius);
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

    wrapper->abstractPath()->world().addTriangle(x1, y1, x2, y2, x3, y3, lineWidth, nullptr, int(prio));
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
        args.GetIsolate()->ThrowException(Exception::Error(v8string(args.GetIsolate(), "spline.t_start must be smaller than spline.t_end")));
        return;
    }

    const bool ret = wrapper->path()->testSpline(spline);
    args.GetReturnValue().Set(Boolean::New(args.GetIsolate(), ret));

    wrapper->typescript()->addPathTime((Timer::systemTime() - t) / 1E9);
}
GENERATE_FUNCTIONS(pathTest);

static void pathGet(QTPath *wrapper, const FunctionCallbackInfo<Value>& args, int offset)
{
    Isolate *isolate = args.GetIsolate();
    Local<Context> context = isolate->GetCurrentContext();
    const qint64 t = Timer::systemTime();

    // robot radius must have been set before
    if (!wrapper->path()->world().isRadiusValid()) {
        isolate->ThrowException(Exception::Error(v8string(isolate, "Invalid radius")));
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
    Local<String> pxString = v8string(isolate, "p_x");
    Local<String> pyString = v8string(isolate, "p_y");
    Local<String> leftString = v8string(isolate, "left");
    Local<String> rightString = v8string(isolate, "right");
    for (const Path::Waypoint &wp : list) {
        Local<Object> wayPoint = Object::New(isolate);
        wayPoint->Set(context, pxString, Number::New(isolate, double(wp.x))).Check();
        wayPoint->Set(context, pyString, Number::New(isolate, double(wp.y))).Check();
        wayPoint->Set(context, leftString, Number::New(isolate, double(wp.l))).Check();
        wayPoint->Set(context, rightString, Number::New(isolate, double(wp.r))).Check();
        result->Set(context, i++, wayPoint).Check();
    }

    wrapper->typescript()->addPathTime((Timer::systemTime() - t) / 1E9);
    args.GetReturnValue().Set(result);
}
GENERATE_FUNCTIONS(pathGet);

static void trajectoryPathGet(const FunctionCallbackInfo<Value>& args)
{
    QTPath *wrapper = static_cast<QTPath*>(Local<External>::Cast(args.Data())->Value());
    Isolate *isolate = args.GetIsolate();
    Local<Context> context = isolate->GetCurrentContext();
    const qint64 t = Timer::systemTime();

    // robot radius must have been set before
    if (!wrapper->trajectoryPath()->world().isRadiusValid()) {
        isolate->ThrowException(Exception::Error(v8string(isolate, "Invalid radius")));
        return;
    }

    float startX, startY, startSpeedX, startSpeedY, endX, endY, endSpeedX, endSpeedY, maxSpeed, acceleration;
    if (!verifyNumber(isolate, args[0], startX) || !verifyNumber(isolate, args[1], startY) ||
            !verifyNumber(isolate, args[2], startSpeedX) || !verifyNumber(isolate, args[3], startSpeedY) ||
            !verifyNumber(isolate, args[4], endX) || !verifyNumber(isolate, args[5], endY) ||
            !verifyNumber(isolate, args[6], endSpeedX) || !verifyNumber(isolate, args[7], endSpeedY) ||
            !verifyNumber(isolate, args[8], maxSpeed) || !verifyNumber(isolate, args[9], acceleration)) {
        isolate->ThrowException(Exception::Error(v8string(isolate, "Invalid arguments")));
        return;
    }

    std::vector<TrajectoryPoint> trajectory = wrapper->trajectoryPath()->calculateTrajectory(Vector(startX, startY), Vector(startSpeedX, startSpeedY),
                                                     Vector(endX, endY), Vector(endSpeedX, endSpeedY), maxSpeed, acceleration);

    // convert path to js object
    unsigned int i = 0;
    Local<Array> result = Array::New(isolate, trajectory.size());
    Local<String> pxString = v8string(isolate, "px");
    Local<String> pyString = v8string(isolate, "py");
    Local<String> vxString = v8string(isolate, "vx");
    Local<String> vyString = v8string(isolate, "vy");
    Local<String> timeString = v8string(isolate, "time");
    for (const auto &p : trajectory) {
        Local<Object> pathPart = Object::New(isolate);
        pathPart->Set(context, pxString, Number::New(isolate, double(p.state.pos.x))).Check();
        pathPart->Set(context, pyString, Number::New(isolate, double(p.state.pos.y))).Check();
        pathPart->Set(context, vxString, Number::New(isolate, double(p.state.speed.x))).Check();
        pathPart->Set(context, vyString, Number::New(isolate, double(p.state.speed.y))).Check();
        pathPart->Set(context, timeString, Number::New(isolate, double(p.time))).Check();
        result->Set(context, i++, pathPart).Check();
    }

    wrapper->typescript()->addPathTime((Timer::systemTime() - t) / 1E9);
    args.GetReturnValue().Set(result);
}

static void trajectoryAddMovingCircle(const FunctionCallbackInfo<Value>& args)
{
    Isolate * isolate = args.GetIsolate();
    float startTime, endTime, x, y, speedX, speedY, accX, accY, radius, priority;

    if (!verifyNumber(isolate, args[0], startTime) || !verifyNumber(isolate, args[1], endTime) ||
            !verifyNumber(isolate, args[2], x) || !verifyNumber(isolate, args[3], y) ||
            !verifyNumber(isolate, args[4], speedX) || !verifyNumber(isolate, args[5], speedY) ||
            !verifyNumber(isolate, args[6], accX) || !verifyNumber(isolate, args[7], accY) ||
            !verifyNumber(isolate, args[8], radius) || !verifyNumber(isolate, args[9], priority)) {
        return;
    }
    static_cast<QTPath*>(Local<External>::Cast(args.Data())->Value())->trajectoryPath()->world().addMovingCircle(Vector(x, y), Vector(speedX, speedY),
                                                                                                       Vector(accX, accY), startTime, endTime, radius, priority);
}

static void trajectoryAddMovingLine(const FunctionCallbackInfo<Value>& args)
{
    Isolate * isolate = args.GetIsolate();
    float startTime, endTime, x1, y1, speedX1, speedY1, accX1, accY1, x2, y2, speedX2, speedY2,
            accX2, accY2, width, priority;

    if (!verifyNumber(isolate, args[0], startTime) || !verifyNumber(isolate, args[1], endTime) ||
            !verifyNumber(isolate, args[2], x1) || !verifyNumber(isolate, args[3], y1) ||
            !verifyNumber(isolate, args[4], speedX1) || !verifyNumber(isolate, args[5], speedY1) ||
            !verifyNumber(isolate, args[6], accX1) || !verifyNumber(isolate, args[7], accY1) ||
            !verifyNumber(isolate, args[8], x2) || !verifyNumber(isolate, args[9], y2) ||
            !verifyNumber(isolate, args[10], speedX2) || !verifyNumber(isolate, args[11], speedY2) ||
            !verifyNumber(isolate, args[12], accX2) || !verifyNumber(isolate, args[13], accY2) ||
            !verifyNumber(isolate, args[14], width) || !verifyNumber(isolate, args[15], priority)) {
        return;
    }
    static_cast<QTPath*>(Local<External>::Cast(args.Data())->Value())->trajectoryPath()->world().addMovingLine(Vector(x1, y1), Vector(speedX1, speedY1),
                                                                    Vector(accX1, accY1), Vector(x2, y2), Vector(speedX2, speedY2), Vector(accX2, accY2),
                                                                    startTime, endTime, width, priority);
}

static void trajectorySetOutOfFieldObstaclePriority(const FunctionCallbackInfo<Value> &args)
{
    Isolate * isolate = args.GetIsolate();
    float prio;
    if (!verifyNumber(isolate, args[0], prio)) {
        return;
    }
    static_cast<QTPath*>(Local<External>::Cast(args.Data())->Value())->trajectoryPath()->world().setOutOfFieldObstaclePriority(static_cast<int>(prio));
}

static void trajectoryGetLastTrajectoryAsRobotObstacle(const FunctionCallbackInfo<Value> &args)
{
    Isolate * isolate = args.GetIsolate();
    auto trajectory = static_cast<QTPath*>(Local<External>::Cast(args.Data())->Value())->trajectoryPath()->getCurrentTrajectory();
    args.GetReturnValue().Set(External::New(isolate, trajectory));
}

static void trajectoryAddRobotTrajectoryObstacle(const FunctionCallbackInfo<Value> &args)
{
    Isolate * isolate = args.GetIsolate();
    if (args.Length() != 3 || !args[0]->IsExternal()) {
        isolate->ThrowException(Exception::Error(v8string(isolate, "Invalid arguments")));
        return;
    }
    std::vector<TrajectoryPoint> *obstacle = static_cast<std::vector<TrajectoryPoint>*>(Local<External>::Cast(args[0])->Value());
    float prio, radius;
    if (!verifyNumber(isolate, args[1], prio) || !verifyNumber(isolate, args[2], radius)) {
        return;
    }
    static_cast<QTPath*>(Local<External>::Cast(args.Data())->Value())->trajectoryPath()->world().addFriendlyRobotTrajectoryObstacle(obstacle, prio, radius);
}

static void trajectoryAddOpponentRobotObstacle(const FunctionCallbackInfo<Value> &args)
{
    Isolate * isolate = args.GetIsolate();
    float x, y, speedX, speedY, priority;

    if (!verifyNumber(isolate, args[0], x) || !verifyNumber(isolate, args[1], y) ||
            !verifyNumber(isolate, args[2], speedX) || !verifyNumber(isolate, args[3], speedY) ||
            !verifyNumber(isolate, args[4], priority)) {
        return;
    }
    static_cast<QTPath*>(Local<External>::Cast(args.Data())->Value())->trajectoryPath()->world().addOpponentRobotObstacle(Vector(x, y), Vector(speedX, speedY), priority);
}

static void trajectoryMaxIntersectingObstaclePrio(const FunctionCallbackInfo<Value> &args)
{
    Isolate * isolate = args.GetIsolate();
    auto p = static_cast<QTPath*>(Local<External>::Cast(args.Data())->Value())->trajectoryPath();
    args.GetReturnValue().Set(Number::New(isolate, p->maxIntersectingObstaclePrio()));
}

static void trajectorySetRobotId(const FunctionCallbackInfo<Value> &args)
{
    Isolate * isolate = args.GetIsolate();

    float id;
    if (!verifyNumber(isolate, args[0], id)) {
        return;
    }
    auto p = static_cast<QTPath*>(Local<External>::Cast(args.Data())->Value())->trajectoryPath();
    p->world().setRobotId(static_cast<int>(id));
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

static QList<CallbackInfo> commonCallbacks = {
    { "destroy",            pathDestroy_new},
    { "reset",              pathReset_new},
    { "clearObstacles",     pathClearObstacles_new},
    { "setBoundary",        pathSetBoundary_new},
    { "setRadius",          pathSetRadius_new},
    { "addCircle",          pathAddCircle_new},
    { "addLine",            pathAddLine_new},
    { "addRect",            pathAddRect_new},
    { "addTriangle",        pathAddTriangle_new},
    { "seedRandom",         pathSeedRandom}};

static QList<CallbackInfo> rrtPathCallbacks = {
    { "setProbabilities",   pathSetProbabilities_new},
    { "addSeedTarget",      pathAddSeedTarget_new},
    { "test",               pathTest_new},
    { "getPath",            pathGet_new},
    { "addTreeVisualization", pathAddTreeVisualization_new}};

static QList<CallbackInfo> trajectoryPathCallbacks = {
    { "calculateTrajectory", trajectoryPathGet },
    { "addMovingCircle",    trajectoryAddMovingCircle},
    { "addMovingLine",      trajectoryAddMovingLine},
    { "setOutOfFieldPrio",  trajectorySetOutOfFieldObstaclePriority},
    { "getTrajectoryAsObstacle", trajectoryGetLastTrajectoryAsRobotObstacle},
    { "addRobotTrajectoryObstacle", trajectoryAddRobotTrajectoryObstacle},
    { "maxIntersectingObstaclePrio", trajectoryMaxIntersectingObstaclePrio},
    { "setRobotId",         trajectorySetRobotId},
    { "addOpponentRobotObstacle",   trajectoryAddOpponentRobotObstacle}};

static void pathCreateNew(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *ts = static_cast<QTPath*>(Local<External>::Cast(args.Data())->Value())->typescript();
    QTPath *p = new QTPath(new Path(ts->time()), nullptr, ts);

    Local<Object> pathWrapper = Object::New(isolate);
    Local<External> pathObject = External::New(isolate, p);
    installCallbacks(isolate, pathWrapper, commonCallbacks, pathObject);
    installCallbacks(isolate, pathWrapper, rrtPathCallbacks, pathObject);
    args.GetReturnValue().Set(pathWrapper);
}

static void trajectoryPathCreateNew(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Typescript *ts = static_cast<QTPath*>(Local<External>::Cast(args.Data())->Value())->typescript();

    ProtobufFileSaver *inputSaver = nullptr;

    std::pair<const char*, pathfinding::InputSourceType> pathfindingOptions[4] = {
        {SAVE_PATHFINDING_INPUT_ALL, pathfinding::AllSamplers},
        {SAVE_PATHFINDING_INPUT_STANDARDSAMPLER, pathfinding::StandardSampler},
        {SAVE_PATHFINDING_INPUT_ENDINOBSTACLE, pathfinding::EndInObstacleSampler},
        {SAVE_PATHFINDING_INPUT_ESCAPEOBSTACLE, pathfinding::EscapeObstacleSampler}
    };
    pathfinding::InputSourceType sourceType = pathfinding::None;
    for (auto option : pathfindingOptions) {
        if (ts->scriptState().selectedOptions.contains(option.first)) {
            if (sourceType != pathfinding::None) {
                sourceType = pathfinding::AllSamplers;
                ts->log("Warning: multiple pathfinding save input options selected, saving all inputs!");
            } else {
                sourceType = option.second;
            }
        }
    }
    if (sourceType != pathfinding::None) {
        inputSaver = ts->scriptState().pathInputSaver;
    }
    if (inputSaver == nullptr) { // not all strategy instances might get one
        sourceType = pathfinding::None;
    }
    QTPath *p = new QTPath(nullptr, new TrajectoryPath(ts->time(), inputSaver, sourceType), ts);

    Local<Object> pathWrapper = Object::New(isolate);
    Local<External> pathObject = External::New(isolate, p);
    installCallbacks(isolate, pathWrapper, commonCallbacks, pathObject);
    installCallbacks(isolate, pathWrapper, trajectoryPathCallbacks, pathObject);
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
    Local<Context> context = isolate->GetCurrentContext();

    QList<CallbackInfo> callbacks = {
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
    installCallbacks(isolate, pathObject, callbacks, [isolate, t](auto _) {
            return External::New(isolate, new QTPath(nullptr, nullptr, t));
    });

    Local<String> pathStr = v8string(isolate, "path");
    global->Set(context, pathStr, pathObject).Check();
}
#include "js_path.moc"
