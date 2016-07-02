/***************************************************************************
 *   Copyright 2015 Alexander Danzer, Michael Eischer, Philipp Nordhus     *
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

#include "fieldwidget.h"
#include "guihelper/guitimer.h"
#include "protobuf/command.pb.h"
#include "protobuf/geometry.h"
#include "savesituation.h"
#include <QContextMenuEvent>
#include <QMenu>
#include <cmath>
#include <QGraphicsRectItem>
#include <QGLWidget>
#include <QSettings>
#include <QLabel>
#include <QFileDialog>
#include <QGesture>
#include <QGestureRecognizer>
#include <QGuiApplication>

class TouchStatusGesture : public QGesture
{
public:
    explicit TouchStatusGesture(QObject *parent = 0) :
        QGesture(parent),
        m_hasTouchInput(false)
    { }

    bool hasTouchInput() const { return m_hasTouchInput; }
    void setHasTouchInput(bool touchInput) { m_hasTouchInput = touchInput; }

private:
    bool m_hasTouchInput;
};

// the NativeGesture events are only accessible from a QGestureRecognizer
// thus this can't be implemented in the event-function of the FieldWidget
class TouchStatusRecognizer : public QGestureRecognizer
{
    QGesture * create(QObject *target) override
    {
        if (target && target->isWidgetType()) {
           static_cast<QWidget *>(target)->setAttribute(Qt::WA_AcceptTouchEvents);
        }
        return new TouchStatusGesture;
    }

    Result recognize(QGesture *state, QObject *, QEvent *event) override
    {
        TouchStatusGesture *ts = static_cast<TouchStatusGesture *>(state);

        switch (event->type()) {
        case QEvent::TouchBegin:
        case QEvent::TouchUpdate:
            ts->setHasTouchInput(true);
            return QGestureRecognizer::TriggerGesture;
        case QEvent::TouchEnd:
            ts->setHasTouchInput(false);
            return QGestureRecognizer::FinishGesture;
// native (mac only?) gestures are available starting from Qt 5.2
#if (QT_VERSION >= QT_VERSION_CHECK(5, 2, 0))
        case QEvent::NativeGesture:
        {
           QNativeGestureEvent *ev = static_cast<QNativeGestureEvent*>(event);
           switch (ev->gestureType()) {
           case Qt::EndNativeGesture:
               ts->setHasTouchInput(false);
               return QGestureRecognizer::FinishGesture;
           default:
               ts->setHasTouchInput(true);
               return QGestureRecognizer::TriggerGesture;
           }
        }
#endif
        default:
            break;
        }
        return QGestureRecognizer::Ignore;
    }
};

FieldWidget::FieldWidget(QWidget *parent) :
    QGraphicsView(parent),
    m_geometryUpdated(true),
    m_rotation(0.0f),
    m_visualizationsUpdated(false),
    m_infoTextUpdated(false),
    m_hasTouchInput(false),
    m_dragType(DragNone),
    m_dragItem(NULL),
    m_isLogplayer(false)
{
    m_touchStatusType = QGestureRecognizer::registerRecognizer(new TouchStatusRecognizer);
    grabGesture(m_touchStatusType);
    grabGesture(Qt::PanGesture);
    grabGesture(Qt::PinchGesture);

    m_guiTimer = new GuiTimer(30, this);
    connect(m_guiTimer, &GuiTimer::timeout, this, &FieldWidget::updateAll);
    m_guiTimer->requestTriggering();

    geometrySetDefault(&m_geometry);

    // setup context menu
    m_contextMenu = new QMenu(this);
    QAction *actionHorizontal = m_contextMenu->addAction("Horizontal");
    connect(actionHorizontal, SIGNAL(triggered()), SLOT(setHorizontal()));
    QAction *actionVertical = m_contextMenu->addAction("Vertical");
    connect(actionVertical, SIGNAL(triggered()), SLOT(setVertical()));
    QAction *actionFlip = m_contextMenu->addAction("Flip");
    connect(actionFlip, SIGNAL(triggered()), SLOT(flip()));
    m_contextMenu->addSeparator();
    // add actions to allow hiding visualizations of a team
    m_actionShowBlueVis = m_contextMenu->addAction("Show blue visualizations");
    m_actionShowBlueVis->setCheckable(true);
    m_actionShowBlueVis->setChecked(true);
    connect(m_actionShowBlueVis, SIGNAL(triggered()), SLOT(updateVisualizationVisibility()));
    m_actionShowYellowVis = m_contextMenu->addAction("Show yellow visualizations");
    m_actionShowYellowVis->setCheckable(true);
    m_actionShowYellowVis->setChecked(true);
    connect(m_actionShowYellowVis, SIGNAL(triggered()), SLOT(updateVisualizationVisibility()));
    m_actionShowControllerVis = m_contextMenu->addAction("Show controller visualizations");
    m_actionShowControllerVis->setCheckable(true);
    m_actionShowControllerVis->setChecked(true);
    connect(m_actionShowControllerVis, SIGNAL(triggered()), SLOT(updateVisualizationVisibility()));
    updateVisualizationVisibility(); // update the visibility map

    m_contextMenu->addSeparator();
    m_actionShowBallTraces = m_contextMenu->addAction("Show traces behind ball");
    m_actionShowBallTraces->setCheckable(true);
    m_actionShowBallTraces->setChecked(true);
    connect(m_actionShowBallTraces, &QAction::triggered, this, &FieldWidget::updateTracesVisibility);

    m_actionShowRobotTraces = m_contextMenu->addAction("Show traces behind robots");
    m_actionShowRobotTraces->setCheckable(true);
    m_actionShowRobotTraces->setChecked(true);
    connect(m_actionShowRobotTraces, &QAction::triggered, this, &FieldWidget::updateTracesVisibility);

    // other actions
    m_contextMenu->addSeparator();
    QAction *actionShowAOI = m_contextMenu->addAction("Enable custom vision area");
    actionShowAOI->setCheckable(true);
    connect(actionShowAOI, SIGNAL(toggled(bool)), SLOT(setAOIVisible(bool)));
    m_actionAntialiasing = m_contextMenu->addAction("Anti-aliasing");
    m_actionAntialiasing->setCheckable(true);
    connect(m_actionAntialiasing, SIGNAL(toggled(bool)), SLOT(setAntialiasing(bool)));
    m_actionGL = m_contextMenu->addAction("OpenGL");
    m_actionGL->setCheckable(true);
    connect(m_actionGL, SIGNAL(toggled(bool)), SLOT(setOpenGL(bool)));
    m_contextMenu->addSeparator();
    QAction *actionScreenshot = m_contextMenu->addAction("Take screenshot");
    connect(actionScreenshot, SIGNAL(triggered()), SLOT(takeScreenshot()));
    QAction *actionSaveSituation = m_contextMenu->addAction("Save Situation");
    connect(actionSaveSituation, SIGNAL(triggered()), SLOT(saveSituation()));

    // create graphics scene
    m_scene = new QGraphicsScene(this);
    setScene(m_scene);

    // ball object
    const float ballRadius = 0.02133f;
    m_ball = new QGraphicsEllipseItem;
    m_ball->setPen(Qt::NoPen);
    m_ball->setBrush(QColor(255, 66, 0));
    m_ball->setZValue(100.0f);
    m_ball->setRect(QRectF(-ballRadius, -ballRadius, ballRadius * 2.0f, ballRadius * 2.0f));
    m_ball->hide();
    m_scene->addItem(m_ball);

    // rectangle for area of interest
    m_aoiItem = new QGraphicsPathItem;
    m_aoiItem->setPen(Qt::NoPen);
    m_aoiItem->setBrush(QColor(0, 0, 0, 128));
    m_aoiItem->setZValue(10000.0f);
    m_aoiItem->hide();
    m_scene->addItem(m_aoiItem);
    m_aoi = QRectF(-1, -1, 2, 2);

    QColor ballColor(255, 66, 0);
    m_ballTrace.color = ballColor.darker();
    m_ballTrace.z_index = 2.f;
    m_ballRawTrace.color = ballColor.darker(300);
    m_ballRawTrace.z_index = 1.f;

    QColor robotYellowColor = QColor(Qt::yellow);
    m_robotYellowTrace.color = robotYellowColor.darker();
    m_robotYellowTrace.z_index = 2.f;
    m_robotYellowRawTrace.color = robotYellowColor.darker(300);
    m_robotYellowRawTrace.z_index = 1.f;

    QColor robotBlueColor = QColor(Qt::blue);
    m_robotBlueTrace.color = robotBlueColor.darker();
    m_robotBlueTrace.z_index = 2.f;
    m_robotBlueRawTrace.color = robotBlueColor.darker(300);
    m_robotBlueRawTrace.z_index = 1.f;

    m_infoTextItem = new QGraphicsTextItem;
    m_infoTextItem->setZValue(10000);
    m_scene->addItem(m_infoTextItem);
    m_infoTextItem->hide();

    m_scene->setBackgroundBrush(Qt::black);
    m_scene->setItemIndexMethod(QGraphicsScene::NoIndex); // should improve the performance

    setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    setVerticalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    // transforms are centered on the mouse cursor
    setTransformationAnchor(QGraphicsView::NoAnchor);
    setOptimizationFlag(QGraphicsView::DontSavePainterState);
    setCacheMode(QGraphicsView::CacheBackground);

    setHorizontal();

    setMouseTracking(true);

    // load settings
    QSettings s;
    s.beginGroup("Field");
    m_actionGL->setChecked(s.value("OpenGL").toBool());
    m_actionAntialiasing->setChecked(s.value("AntiAliasing").toBool());
    m_actionShowBallTraces->setChecked(s.value("BallTraces", true).toBool());
    m_actionShowRobotTraces->setChecked(s.value("RobotTraces", true).toBool());
    s.endGroup();
}

FieldWidget::~FieldWidget()
{
    QGestureRecognizer::unregisterRecognizer(m_touchStatusType);

    QSettings s;
    s.beginGroup("Field");
    s.setValue("OpenGL", m_actionGL->isChecked());
    s.setValue("AntiAliasing", m_actionAntialiasing->isChecked());
    s.setValue("BallTraces", m_actionShowBallTraces->isChecked());
    s.setValue("RobotTraces", m_actionShowRobotTraces->isChecked());
    s.endGroup();
}

void FieldWidget::setLogplayer()
{
    m_isLogplayer = true;
}

void FieldWidget::handleStatus(const Status &status)
{
    if (status->has_world_state()) {
        m_worldState.append(status);
        m_lastWorldState = status;
        m_guiTimer->requestTriggering();
    }

    if (status->has_game_state()) {
        m_gameState.CopyFrom(status->game_state());
    }

    if (status->has_team_blue()) {
        updateTeam(m_robotsBlue, m_teamBlue, status->team_blue());
    }

    if (status->has_team_yellow()) {
        updateTeam(m_robotsYellow, m_teamYellow, status->team_yellow());
    }

    if (status->has_geometry()) {
        m_geometry.CopyFrom(status->geometry());
        m_geometryUpdated = true;
        m_guiTimer->requestTriggering();
    }

    if (status->has_debug()) {
        // just save status to avoid copying the visualizations
        m_visualizations[status->debug().source()] = status;
        m_visualizationsUpdated = true;
        m_guiTimer->requestTriggering();
    }
}

void FieldWidget::clearTeamData(RobotMap &team)
{
    // force redrawing robots
    foreach (const Robot &r, team) {
        delete r.id;
        delete r.robot;
    }
    team.clear();
}

void FieldWidget::clearData()
{
    m_teamBlue.clear();
    clearTeamData(m_robotsBlue);
    m_teamYellow.clear();
    clearTeamData(m_robotsYellow);

    clearTraces();

    m_worldState.clear();
    m_lastWorldState.clear();

    m_visualizations.clear();
    m_visualizationsUpdated = true;

    geometrySetDefault(&m_geometry);
    m_geometryUpdated = true;
    m_guiTimer->requestTriggering();
}

void FieldWidget::hideVisualizationToggles()
{
    m_actionShowBlueVis->setVisible(false);
    m_actionShowYellowVis->setVisible(false);
    m_actionShowControllerVis->setVisible(false);
}

void FieldWidget::updateTeam(RobotMap &team, QHash<uint, robot::Specs> &specsMap, const robot::Team &specs) {
    // the robot specifications changed
    specsMap.clear();
    for (int i = 0; i < specs.robot_size(); i++) {
        const robot::Specs& robot = specs.robot(i);
        specsMap[robot.id()].CopyFrom(robot);
    }

    clearTeamData(team);
    m_guiTimer->requestTriggering();
}

void FieldWidget::visualizationsChanged(const QStringList &items)
{
    // list of visible visualizations was changed
    m_visibleVisualizations = items;
    m_visualizationsUpdated = true; // force redraw
    m_guiTimer->requestTriggering();
}

void FieldWidget::updateAll()
{
    // update everything
    updateGeometry();
    updateDetection();
    updateVisualizations();
    updateInfoText();
}

void FieldWidget::updateVisualizationVisibility()
{
    m_visibleVisSources[amun::StrategyBlue] = m_actionShowBlueVis->isChecked();
    m_visibleVisSources[amun::StrategyYellow] = m_actionShowYellowVis->isChecked();
    m_visibleVisSources[amun::Controller] = m_actionShowControllerVis->isChecked();
    m_visibleVisSources[amun::Autoref] = true;

    m_visualizationsUpdated = true;
    m_guiTimer->requestTriggering();
}

void FieldWidget::updateTracesVisibility()
{
    if (!m_actionShowBallTraces->isChecked()) {
        clearBallTraces();
    }

    if (!m_actionShowRobotTraces->isChecked()) {
        clearRobotTraces();
    }
}

void FieldWidget::updateVisualizations()
{
    if (!m_visualizationsUpdated) {
        return;
    }
    m_visualizationsUpdated = false; // don't redraw if nothing new has happened

    // delete visualizations and redraw everything
    qDeleteAll(m_visualizationItems);
    m_visualizationItems.clear();

    foreach (const Status &v, m_visualizations) {
        if (m_visibleVisSources.value(v->debug().source())) {
            updateVisualizations(v->debug());
        }
    }
}

void FieldWidget::updateVisualizations(const amun::DebugValues &v)
{
    // use introspection to iterate through the visualizations
    const google::protobuf::RepeatedPtrField<amun::Visualization> &viss = v.visualization();
    for (google::protobuf::RepeatedPtrField<amun::Visualization>::const_iterator it = viss.begin(); it != viss.end(); it++) {
        const amun::Visualization &vis = *it;
        // only draw visible visualizations
        if (!m_visibleVisualizations.contains(QString::fromStdString(vis.name()))) {
            continue;
        }

        QPen pen = Qt::NoPen;
        QBrush brush = Qt::NoBrush;
        // setup pen style and color
        if (vis.has_pen()) {
            pen.setStyle(Qt::SolidLine);

            if (vis.pen().has_style()) {
                switch (vis.pen().style()) {
                case amun::Pen::DashLine:
                    pen.setStyle(Qt::DashLine);
                    break;

                case amun::Pen::DotLine:
                    pen.setStyle(Qt::DotLine);
                    break;

                case amun::Pen::DashDotLine:
                    pen.setStyle(Qt::DashDotLine);
                    break;

                case amun::Pen::DashDotDotLine:
                    pen.setStyle(Qt::DashDotDotLine);
                    break;
                }
            }
            if (vis.pen().has_color()) {
                pen.setColor(QColor(
                                 vis.pen().color().red(),
                                 vis.pen().color().green(),
                                 vis.pen().color().blue(),
                                 vis.pen().color().alpha()));
            }
            if (vis.has_width()) {
                pen.setWidthF(vis.width());
            } else {
                pen.setWidthF(0.01f);
            }
        }

        // configure brush
        if (vis.has_brush()) {
            brush = QBrush(QColor(vis.brush().red(), vis.brush().green(), vis.brush().blue(), vis.brush().alpha()));
        }

        if (vis.has_circle()) {
            m_visualizationItems << createCircle(pen, brush, vis);
        }

        if (vis.has_polygon()) {
            m_visualizationItems << createPolygon(pen, brush, vis);
        }

        if (vis.has_path() && vis.path().point_size() > 1) {
            m_visualizationItems << createPath(pen, brush, vis);
        }
    }
}

QGraphicsItem* FieldWidget::createCircle(const QPen &pen, const QBrush &brush, const amun::Visualization &vis)
{
    QGraphicsEllipseItem *item = new QGraphicsEllipseItem;
    item->setPen(pen);
    item->setBrush(brush);

    float r = vis.circle().radius();
    QRectF rect;
    rect.setWidth(2 * r);
    rect.setHeight(2 * r);
    rect.moveCenter(QPointF(vis.circle().p_x(), vis.circle().p_y()));
    item->setRect(rect);
    item->setZValue(vis.background() ? 1.0f : 10.0f);
    m_scene->addItem(item);
    return item;
}

QGraphicsItem* FieldWidget::createPolygon(const QPen &pen, const QBrush &brush, const amun::Visualization &vis)
{
    QGraphicsPolygonItem *item = new QGraphicsPolygonItem;
    item->setPen(pen);
    item->setBrush(brush);

    QPolygonF polygon;
    const google::protobuf::RepeatedPtrField<amun::Point> &pts = vis.polygon().point();
    for (google::protobuf::RepeatedPtrField<amun::Point>::const_iterator it = pts.begin(); it != pts.end(); it++) {
        const amun::Point &point = *it;
        polygon.append(QPointF(point.x(), point.y()));
    }

    item->setPolygon(polygon);
    item->setZValue(vis.background() ? 1.0f : 10.0f);
    m_scene->addItem(item);
    return item;
}

QGraphicsItem* FieldWidget::createPath(const QPen &pen, const QBrush &brush, const amun::Visualization &vis)
{
    QGraphicsPathItem *item = new QGraphicsPathItem;
    item->setPen(pen);
    item->setBrush(brush);

    QPainterPath path;
    path.moveTo(vis.path().point(0).x(), vis.path().point(0).y());
    for (int i = 1; i < vis.path().point_size(); i++) {
        path.lineTo(vis.path().point(i).x(), vis.path().point(i).y());
    }

    item->setPath(path);
    item->setZValue(vis.background() ? 1.0f : 10.0f);
    m_scene->addItem(item);
    return item;
}

void FieldWidget::clearBallTraces()
{
    clearTrace(m_ballTrace);
    clearTrace(m_ballRawTrace);
}

void FieldWidget::clearRobotTraces()
{
    clearTrace(m_robotYellowTrace);
    clearTrace(m_robotYellowRawTrace);
    clearTrace(m_robotBlueTrace);
    clearTrace(m_robotBlueRawTrace);
}

void FieldWidget::clearTraces()
{
    clearBallTraces();
    clearRobotTraces();
}

void FieldWidget::clearTrace(Trace &trace)
{
    for (QGraphicsEllipseItem *item: trace.traces) {
        item->hide();
        trace.invalid.append(item);
    }
    trace.traces.clear();
}

void FieldWidget::invalidateTraces(Trace &trace, qint64 time)
{
    for (auto it = trace.traces.begin(); it != trace.traces.end();) {
        if (qAbs(time - it.key()) < 1000*1000*1000) {
            ++it;
            continue;
        }

        QGraphicsEllipseItem *item = it.value();
        item->hide();
        it = trace.traces.erase(it);
        trace.invalid.append(item);
    }
}

void FieldWidget::addTrace(Trace &trace, const QPointF &pos, qint64 time)
{
    QGraphicsEllipseItem *item = nullptr;
    if (!trace.invalid.isEmpty()) {
        item = trace.invalid.takeFirst();
        item->show();
    } else if (trace.traces.size() >= 1000) {
        auto firstIt = trace.traces.begin();
        item = firstIt.value();
        trace.traces.erase(firstIt);
    } else {
        item = new QGraphicsEllipseItem;
        item->setPen(Qt::NoPen);
        item->setBrush(trace.color);
        item->setRect(QRectF(-0.015f, -0.015f, 0.03f, 0.03f));
        item->setZValue(trace.z_index);
        m_scene->addItem(item);
        // cache after adding to scene
    }

    item->setPos(pos);
    trace.traces.insertMulti(time, item);
}

void FieldWidget::updateDetection()
{
    if (m_worldState.isEmpty()) {
        return;
    }

    for (int k = 0; k < m_worldState.size(); ++k) {
        if (m_worldState[k].isNull()) {
            continue;
        }
        const world::State &worldState = m_worldState[k]->world_state();
        const bool isLast = (k == (m_worldState.size() - 1));

        if (worldState.has_ball()) {
            if (isLast) {
                setBall(worldState.ball());
            }
            addBallTrace(worldState.time(), worldState.ball());
        } else {
            m_ball->hide();
        }

        // update the individual robots
        for (int i = 0; i < worldState.blue_size(); i++) {
            const world::Robot &robot = worldState.blue(i);
            const robot::Specs &specs = m_teamBlue[robot.id()];
            if (isLast) {
                setRobot(robot, specs, m_robotsBlue, Qt::blue);
            }
            addRobotTrace(worldState.time(), robot, m_robotBlueTrace, m_robotBlueRawTrace);
        }

        for (int i = 0; i < worldState.yellow_size(); i++) {
            const world::Robot &robot = worldState.yellow(i);
            const robot::Specs &specs = m_teamYellow[robot.id()];
            if (isLast) {
                setRobot(robot, specs, m_robotsYellow, Qt::yellow);
            }
            addRobotTrace(worldState.time(), robot, m_robotYellowTrace, m_robotYellowRawTrace);
        }
    }

    // hide robots that are no longer tracked
    for(RobotMap::iterator it = m_robotsBlue.begin(); it != m_robotsBlue.end(); ++it) {
        it.value().tryHide();
    }

    for(RobotMap::iterator it = m_robotsYellow.begin(); it != m_robotsYellow.end(); ++it) {
        it.value().tryHide();
    }

    // prevent applying the world state again
    m_worldState.clear();
}

void FieldWidget::setBall(const world::Ball &ball)
{
    bool update = false;
    // update ball if it moved for more than 1 millimeter
    update |= (qAbs(ball.p_x() - m_ball->pos().x()) > 0.001);
    update |= (qAbs(ball.p_y() - m_ball->pos().y()) > 0.001);

    if (update) {
        m_ball->setPos(ball.p_x(), ball.p_y());
    }
    m_ball->show();
}

void FieldWidget::addBallTrace(qint64 time, const world::Ball &ball)
{
    invalidateTraces(m_ballTrace, time);
    invalidateTraces(m_ballRawTrace, time);

    if (m_actionShowBallTraces->isChecked()) {
        for (int i = 0; i < ball.raw_size(); ++i) {
            const world::BallPosition &p = ball.raw(i);
            addTrace(m_ballRawTrace, QPointF(p.p_x(), p.p_y()), p.time());
        }
        addTrace(m_ballTrace, QPointF(ball.p_x(), ball.p_y()), time);
    }
}

void FieldWidget::setRobot(const world::Robot &robot, const robot::Specs &specs, RobotMap &robots,
                           const QColor &color)
{
    // get robot or create it
    Robot &r = robots[robot.id()];
    // recreate robot body if neccessary
    if (!r.robot) {
        r.robot = new QGraphicsPathItem;
        r.robot->setBrush(Qt::black);
        r.robot->setPen(Qt::NoPen);

        // team marker
        QGraphicsEllipseItem *center = new QGraphicsEllipseItem(r.robot);
        center->setPen(Qt::NoPen);
        center->setBrush(color);
        center->setRect(QRectF(-0.025f, -0.025f, 0.05f, 0.05f));

        const QBrush pink("fuchsia");
        const QBrush green("lime");
        QBrush brush;

        const uint id = robot.id();
        // team id blobs
        brush = (id == 0 || id == 3 || id == 4 || id == 7 || id == 9 || id == 10) ? pink : green;
        addBlob(-0.054772f,  0.035f, brush, r.robot);
        brush = (id == 4 || id == 5 || id == 6 || id == 7 || id == 9 || id == 11) ? pink : green;
        addBlob(-0.035f, -0.054772f, brush, r.robot);
        brush = (id == 0 || id == 1 || id == 2 || id == 3 || id == 9 || id == 11) ? pink : green;
        addBlob( 0.035f, -0.054772f, brush, r.robot);
        brush = (id == 0 || id == 1 || id == 4 || id == 5 || id == 9 || id == 10) ? pink : green;
        addBlob( 0.054772f,  0.035f, brush, r.robot);

        const float angle = specs.has_angle() ? (specs.angle() / M_PI * 180.0f) : 70.0f;
        const float radius = specs.has_radius() ? specs.radius() : 0.09f;
        // robot body
        const QRectF rect(-radius, -radius, radius * 2.0f, radius * 2.0f);
        QPainterPath path;
        path.arcMoveTo(rect, angle / 2.0f - 90.0f);
        path.arcTo(rect, angle / 2.0f - 90.0f, 360.0f - angle);
        path.closeSubpath();
        r.robot->setPath(path);

        // id
        QGraphicsSimpleTextItem *text = new QGraphicsSimpleTextItem(QString::number(id));
        text->setTransform(QTransform::fromScale(0.01, -0.01).rotate(-m_rotation).translate(radius*100, 0), true);
        text->setBrush(Qt::white);
        r.id = text;

        r.robot->setZValue(5.0f);
        r.id->setZValue(11.0f);
        m_scene->addItem(r.robot);
        m_scene->addItem(r.id);

        // just translated
        r.id->setCacheMode(QGraphicsItem::DeviceCoordinateCache);
    }

    const float phi = robot.phi() * 180 / M_PI - 90.0f;
    bool update = false;

    // update if moved more than 1 millimeter or rotated for over 0.2 degrees
    update |= (qAbs(robot.p_x() - r.robot->pos().x()) > 0.001);
    update |= (qAbs(robot.p_y() - r.robot->pos().y()) > 0.001);
    update |= (qAbs(phi - r.robot->rotation()) > 0.2);

    if (update) {
        r.robot->setPos(robot.p_x(), robot.p_y());
        r.robot->setRotation(phi);
        r.id->setPos(robot.p_x(), robot.p_y());
    }

    r.show();
}

void FieldWidget::addBlob(float x, float y, const QBrush &brush, QGraphicsItem *parent)
{
    QGraphicsEllipseItem *blob = new QGraphicsEllipseItem(parent);
    blob->setPen(Qt::NoPen);
    blob->setBrush(brush);
    blob->setRect(QRectF(-0.02f, -0.02f, 0.04f, 0.04f));
    blob->setPos(x, y);
}

void FieldWidget::addRobotTrace(qint64 time, const world::Robot &robot, Trace &robotTrace, Trace &robotRawTrace)
{
    invalidateTraces(robotTrace, time);
    invalidateTraces(robotRawTrace, time);

    if (m_actionShowRobotTraces->isChecked()) {
        for (int i = 0; i < robot.raw_size(); ++i) {
            const world::RobotPosition &p = robot.raw(i);
            addTrace(robotRawTrace, QPointF(p.p_x(), p.p_y()), p.time());
        }
        addTrace(robotTrace, QPointF(robot.p_x(), robot.p_y()), time);
    }
}

void FieldWidget::updateGeometry()
{
    if (!m_geometry.IsInitialized() || !m_geometryUpdated) {
        return;
}
    m_geometryUpdated = false; // don't process geometry again and again

    // check if geometry changed
    const std::string geometry = m_geometry.SerializeAsString();
    if (m_geometryString != geometry) {
        m_geometryString = geometry;

        const world::Geometry &g = m_geometry;
        // add some space around the field
        const float offset = g.referee_width() + g.boundary_width() + 0.1f;

        QRectF rect;
        rect.setLeft(-g.field_width() / 2.0f - offset);
        rect.setTop(-g.field_height() / 2.0f - offset);
        rect.setWidth(g.field_width() + offset * 2);
        rect.setHeight(g.field_height() + offset * 2);
        m_fieldRect = rect;
        resetCachedContent();

        updateAOI();

        // allow showing a small area around the field
        setSceneRect(rect.adjusted(-2, -2, 2, 2));
        // display the whole field
        centerOn(m_fieldRect.center());
        fitInView(m_fieldRect, Qt::KeepAspectRatio);
    }
}

void FieldWidget::setFieldOrientation(float rotation)
{
    m_rotation = rotation;
    QTransform t;
    t.rotate(rotation);
    t.scale(1, -1);
    setTransform(t);
    fitInView(m_fieldRect, Qt::KeepAspectRatio);

    // force redrawing robots, required to update the label orientation
    foreach (Robot r, m_robotsBlue) {
        delete r.id;
        delete r.robot;
    }
    m_robotsBlue.clear();
    foreach (Robot r, m_robotsYellow) {
        delete r.id;
        delete r.robot;
    }
    m_robotsYellow.clear();
    // recreate robots on redraw
    m_worldState.append(m_lastWorldState);
    m_guiTimer->requestTriggering();
}

void FieldWidget::setHorizontal()
{
    setFieldOrientation(90.0f);
}

void FieldWidget::setVertical()
{
    setFieldOrientation(0.0f);
}

void FieldWidget::flip()
{
    m_rotation += 180.0f;
    if (m_rotation >= 360.0f) {
        m_rotation -= 360.0f;
    }
    setFieldOrientation(m_rotation);
}

void FieldWidget::setAntialiasing(bool enable)
{
    setRenderHint(QPainter::Antialiasing, enable);
    setRenderHint(QPainter::HighQualityAntialiasing, enable);
    resetCachedContent();
}

void FieldWidget::setOpenGL(bool enable)
{
    if (enable) {
        QGLFormat format;
        format.setSampleBuffers(true);
        setViewport(new QGLWidget(format));
        setViewportUpdateMode(QGraphicsView::FullViewportUpdate);
    } else {
        setViewport(new QWidget);
        setViewportUpdateMode(QGraphicsView::MinimalViewportUpdate);
    }
}

void FieldWidget::setAOIVisible(bool visible)
{
    m_aoiItem->setVisible(visible);
    updateAOI();
}

void FieldWidget::flipAOI()
{
    QRectF flipped;
    flipped.setTopLeft(-m_aoi.bottomRight());
    flipped.setBottomRight(-m_aoi.topLeft());
    m_aoi = flipped;
    updateAOI();
}

void FieldWidget::resizeAOI(QPointF pos)
{
    if (m_geometry.IsInitialized()) {
        double offset = m_geometry.boundary_width() + 0.1f;
        double limitX = m_geometry.field_width() / 2 + offset;
        double limitY = m_geometry.field_height() / 2 + offset;
        pos.setY(qBound(-limitY, pos.y(), limitY));
        pos.setX(qBound(-limitX, pos.x(), limitX));
    }

    switch (m_dragType) {
    case DragTopLeft:
        m_aoi.setTopLeft(pos);
        break;

    case DragTopRight:
        m_aoi.setTopRight(pos);
        break;

    case DragBottomLeft:
        m_aoi.setBottomLeft(pos);
        break;

    case DragBottomRight:
        m_aoi.setBottomRight(pos);
        break;

    default:
        break;
    }

    updateAOI();
}

void FieldWidget::updateAOI()
{
    QPolygonF polygon(m_fieldRect);
    QPainterPath path;
    // paint space around the area of interest
    path.addPolygon(polygon.subtracted(QPolygonF(m_aoi)));
    m_aoiItem->setPath(path);
    // inform tracking about changes
    Command command(new amun::Command);
    amun::CommandTracking *tracking = command->mutable_tracking();
    tracking->set_aoi_enabled(m_aoiItem->isVisible());
    if (m_aoiItem->isVisible()) {
        amun::TrackingAOI *aoi = tracking->mutable_aoi();
        aoi->set_x1(qMin(m_aoi.left(), m_aoi.right()));
        aoi->set_y1(qMin(m_aoi.top(), m_aoi.bottom()));
        aoi->set_x2(qMax(m_aoi.left(), m_aoi.right()));
        aoi->set_y2(qMax(m_aoi.top(), m_aoi.bottom()));
    }
    emit sendCommand(command);
}

void FieldWidget::sendSimulatorMoveCommand(const QPointF &p)
{
    Command command(new amun::Command);
    amun::CommandSimulator *sim = command->mutable_simulator();
    if (m_dragType == DragBall) {
        amun::SimulatorMoveBall *ball = sim->mutable_move_ball();
        ball->set_p_x(p.x());
        ball->set_p_y(p.y());
    } else if (m_dragType == DragBlue) {
        amun::SimulatorMoveRobot *robot = sim->add_move_blue();
        robot->set_id(m_dragId);
        robot->set_p_x(p.x());
        robot->set_p_y(p.y());
    } else if (m_dragType == DragYellow) {
        amun::SimulatorMoveRobot *robot = sim->add_move_yellow();
        robot->set_id(m_dragId);
        robot->set_p_x(p.x());
        robot->set_p_y(p.y());
    }
    emit sendCommand(command);
}

void FieldWidget::mousePressEvent(QMouseEvent *event)
{
    const QPointF p = mapToScene(event->pos());

    if (event->button() == Qt::LeftButton) {
        m_dragItem = NULL;
        m_dragType = DragNone;
        if (m_aoiItem->isVisible()) {
            // find side which should be dragged
            const int tl = (mapFromScene(m_aoi.topLeft()) - event->pos()).manhattanLength();
            const int tr = (mapFromScene(m_aoi.topRight()) - event->pos()).manhattanLength();
            const int bl = (mapFromScene(m_aoi.bottomLeft()) - event->pos()).manhattanLength();
            const int br = (mapFromScene(m_aoi.bottomRight()) - event->pos()).manhattanLength();
            const int min = qMin(qMin(tl, tr), qMin(bl, br));

            if (min <= 10) {
                if (min == tl) {
                    m_dragType = DragTopLeft;
                } else if (min == tr) {
                    m_dragType = DragTopRight;
                } else if (min == bl) {
                    m_dragType = DragBottomLeft;
                } else if (min == br) {
                    m_dragType = DragBottomRight;
                }

                resizeAOI(p);
                return;
            }
        }

        if (m_isLogplayer) {
            m_dragType = DragMeasure;
        }

        for (RobotMap::iterator it = m_robotsBlue.begin(); it != m_robotsBlue.end() && m_dragType == DragNone; ++it) {
            QPointF mapped = it.value().robot->mapFromScene(p);
            QGraphicsPathItem *robot = it.value().robot;
            if (robot->path().contains(mapped)) {
                m_dragId = it.key();
                m_dragType = DragBlue;
                m_dragItem = robot;
                break;
            }
        }

        for (RobotMap::iterator it = m_robotsYellow.begin(); it != m_robotsYellow.end() && m_dragType == DragNone; ++it) {
            QPointF mapped = it.value().robot->mapFromScene(p);
            QGraphicsPathItem *robot = it.value().robot;
            if (robot->path().contains(mapped)) {
                m_dragId = it.key();
                m_dragType = DragYellow;
                m_dragItem = robot;
                break;
            }
        }

        if (m_dragType == DragNone) {
            m_dragType = DragBall;
            m_dragItem = m_ball;
        }

        if (m_dragType != DragMeasure) {
            sendSimulatorMoveCommand(p);
        }
    }

    event->accept();
    m_dragStart = event->pos();
    m_mouseBegin = p;
}

void FieldWidget::mouseMoveEvent(QMouseEvent *event)
{
    const QPointF p = mapToScene(event->pos());
    event->accept();

    QString infoText = QString("(%1, %2)").arg(p.x(), 0, 'f', 4).arg(p.y(), 0, 'f', 4);
    if (m_dragType == DragMeasure) {
        QPointF diff = (p - m_mouseBegin);
        float dist = std::sqrt(diff.x() * diff.x() + diff.y() * diff.y());
        infoText += QString(", distance: %1").arg(dist, 0, 'f', 4);
    }
    setInfoText(infoText);

    if (event->buttons() != Qt::NoButton) {
        if (m_dragType & DragAOIMask) {
            resizeAOI(p);
        } else if (m_dragType != DragNone) {
            if (m_dragItem) {
                sendSimulatorMoveCommand(p);
            }
        } else {
            QPointF d = p - m_mouseBegin;
            translate(d.x(), d.y());
            m_mouseBegin = mapToScene(event->pos());
        }
    }
}

void FieldWidget::mouseReleaseEvent(QMouseEvent *event)
{
    if (m_dragType != DragNone && m_dragItem) {
        // clear drag commands
        Command command(new amun::Command);
        amun::CommandSimulator *sim = command->mutable_simulator();
        if (m_dragType == DragBall) {
            sim->mutable_move_ball();
        } else if (m_dragType == DragBlue) {
            amun::SimulatorMoveRobot *robot = sim->add_move_blue();
            robot->set_id(m_dragId);
        } else if (m_dragType == DragYellow) {
            amun::SimulatorMoveRobot *robot = sim->add_move_yellow();
            robot->set_id(m_dragId);
        }
        emit sendCommand(command);
    }

    if (event->button() == Qt::RightButton && (event->pos() - m_dragStart).manhattanLength() < 2) {
        // show context menu if mouse didn't move
        m_contextMenu->exec(mapToGlobal(event->pos()));
    }

    m_dragType = DragNone;
    m_dragItem = NULL;
}

void FieldWidget::wheelEvent(QWheelEvent *event)
{
    // the default wheelEvent implementation is required to make the pan gesture work
    if (m_hasTouchInput) {
        QGraphicsView::wheelEvent(event);
        return;
    }

    event->accept();

    QPoint numPixels = event->pixelDelta();
    // 8 ticks are one degree
    QPoint numDegrees = event->angleDelta() / 8;

    float scaleFactor = 1;
    if (!numPixels.isNull()) {
        scaleFactor = std::pow(1.2, numPixels.y() / 15.f);
    } else if (!numDegrees.isNull()) {
        scaleFactor = std::pow(1.2, numDegrees.y() / 15.f);
    }

    // transform centered on the mouse cursor
    const QPointF p = mapToScene(event->pos());
    translate(p.x(), p.y());
    scale(scaleFactor, scaleFactor);
    translate(-p.x(), -p.y());
}

void FieldWidget::resizeEvent(QResizeEvent *event)
{
    fitInView(m_fieldRect, Qt::KeepAspectRatio);
    QGraphicsView::resizeEvent(event);
}

bool FieldWidget::gestureEvent(QGestureEvent *event)
{
    event->accept();
    if (event->gesture(Qt::PanGesture)) {
        QPanGesture *pan = static_cast<QPanGesture *>(event->gesture(Qt::PanGesture));
        QPointF delta = pan->delta();
        translate(delta.x(), delta.y());
    }
    if (event->gesture(Qt::PinchGesture)) {
        QPinchGesture *pinch = static_cast<QPinchGesture *>(event->gesture(Qt::PinchGesture));
        if (pinch->changeFlags() & QPinchGesture::ScaleFactorChanged) {
            // faster scaling
            qreal scaleChange = (pinch->scaleFactor() / pinch->lastScaleFactor() - 1.)*2. + 1.;
            // similar to wheelEvent
            const QPointF p = mapToScene(pinch->centerPoint().toPoint());
            translate(p.x(), p.y());
            scale(scaleChange, scaleChange);
            translate(-p.x(), -p.y());
        }
    }
    if (event->gesture(m_touchStatusType)) {
        TouchStatusGesture *status = (TouchStatusGesture *)event->gesture(m_touchStatusType);
        m_hasTouchInput = status->hasTouchInput();
    }
    return true;
}

void FieldWidget::leaveEvent(QEvent *event)
{
    // clear mouse position
    setInfoText(QString());
    QGraphicsView::leaveEvent(event);
}

bool FieldWidget::event(QEvent *event)
{
    // handle resizes and relayouts
    if (event->type() == QEvent::Gesture) {
        return gestureEvent(static_cast<QGestureEvent*>(event));
    }

    return QGraphicsView::event(event);
}

void FieldWidget::updateInfoText()
{
    if (!m_infoTextUpdated) {
        return;
    }

    m_infoTextUpdated = false;

    if (m_infoText.isNull()) {
        m_infoTextItem->hide();
        return;
    }

    QString bgColor = palette().brush(QPalette::Window).color().name();
    m_infoTextItem->setHtml("<div style='background-color:" + bgColor + ";padding: 2px;'>" + m_infoText + "</div>");
    m_infoTextItem->show();

    QFontMetrics fm(QGuiApplication::font());
    QPoint lblPos = QPoint(-4, height()-fm.height()-6);

    // revert to window scale
    float scaleX, scaleY;
    QTransform t = transform();
    if (t.m11() == 0 && t.m22() == 0) {
        scaleX = std::abs(t.m12());
        scaleY = std::abs(t.m21());
    } else {
        scaleX = std::abs(t.m11());
        scaleY = std::abs(t.m22());
    }

    QPointF scenePos = mapToScene(lblPos);
    QTransform lblTransform = QTransform::fromScale(1./scaleX, -1./scaleY)
            .rotate(-m_rotation);
    if (!qFuzzyCompare(lblTransform, m_infoTextItem->transform()) || scenePos != m_infoTextItem->pos()) {
        m_infoTextItem->setTransform(lblTransform);
        m_infoTextItem->setPos(scenePos);
    }
}

void FieldWidget::setInfoText(const QString &str)
{
    if (str == m_infoText) {
        return;
    }
    m_infoText = str;
    m_infoTextUpdated = true;
    m_guiTimer->requestTriggering();
}

bool FieldWidget::viewportEvent(QEvent *event)
{
    if (event->type() != QEvent::Paint && event->type() != QEvent::UpdateRequest) {
        m_infoTextUpdated = true;
        m_guiTimer->requestTriggering();
    }
    return QGraphicsView::viewportEvent(event);
}

void FieldWidget::drawBackground(QPainter *painter, const QRectF &rect)
{
    painter->save();

    QRectF rect1;
    rect1.setLeft(-m_geometry.field_width() / 2.0f);
    rect1.setTop(-m_geometry.field_height() / 2.0f);
    rect1.setWidth(m_geometry.field_width());
    rect1.setHeight(m_geometry.field_height());

    const float offset = m_geometry.referee_width() + m_geometry.boundary_width() + 0.025f;
    const QRectF rect2 = rect1.adjusted(-offset, -offset, offset, offset);

    if (m_actionAntialiasing->isChecked()) {
        painter->setRenderHint(QPainter::Antialiasing);
    }
    painter->fillRect(rect, palette().brush(QPalette::Base));

    // field
    painter->setPen(QPen(Qt::white, 0.05, Qt::SolidLine, Qt::SquareCap, Qt::MiterJoin));
    painter->setBrush(QColor(0,60,0));
    painter->drawRect(rect2);

    painter->setPen(QPen(Qt::white, 0));
    painter->setBrush(Qt::NoBrush);

    // draw field lines twice
    // first with a cosmetic pen
    // and again with a two dimensional pen
    drawLines(painter, rect1, true);
    drawLines(painter, rect1, false);

    // penalty points
    painter->setPen(Qt::NoPen);
    painter->setBrush(Qt::white);
    painter->drawEllipse(QPointF(0, m_geometry.field_height() / 2.0 - m_geometry.penalty_spot_from_field_line_dist()), 0.01, 0.01);
    painter->drawEllipse(QPointF(0, -m_geometry.field_height() / 2.0 + m_geometry.penalty_spot_from_field_line_dist()), 0.01, 0.01);

    painter->restore();
}

void FieldWidget::drawLines(QPainter *painter, QRectF rect, bool cosmetic)
{
    const float lw = m_geometry.line_width();
    const float lwh = lw / 2.0f;

    QPen pen;
    pen.setCosmetic(cosmetic);
    pen.setCapStyle(Qt::FlatCap);
    pen.setJoinStyle(Qt::MiterJoin);
    pen.setColor(Qt::white);
    if (!cosmetic) {
        pen.setWidthF(lw);
    }
    painter->setPen(pen);

    {
        // defense areas
        float dr = m_geometry.defense_radius();
        const float ds = m_geometry.defense_stretch();

        if (!cosmetic) {
            dr -= lwh;
        }

        QPainterPath path;
        path.moveTo(dr + ds / 2.0f, rect.bottom());
        path.arcTo(-dr + ds / 2.0f, rect.bottom() - dr, dr * 2, dr * 2, 0, 90);
        path.lineTo(-ds / 2.0f, rect.bottom() - dr);
        path.arcTo(-dr - ds / 2.0f, rect.bottom() - dr, dr * 2, dr * 2, 90, 90);

        path.moveTo(dr + ds / 2.0f, rect.top());
        path.arcTo(-dr + ds / 2.0f, rect.top() - dr, dr * 2, dr * 2, 0, -90);
        path.lineTo(-ds / 2.0f, rect.top() + dr);
        path.arcTo(-dr - ds / 2.0f, rect.top() - dr, dr * 2, dr * 2, -90, -90);

        painter->drawPath(path);
    }

    if (!cosmetic) {
        rect.adjust(lwh, lwh, -lwh, -lwh);
    }

    // inner boundary
    painter->drawRect(rect);
    painter->drawLine(QPointF(rect.left(), 0.0f), QPointF(rect.right(), 0.0f));

    // center circle
    float r = m_geometry.center_circle_radius();
    if (!cosmetic) {
        r -= lwh;
    }
    painter->drawEllipse(QPointF(0, 0), r, r);

    if (!cosmetic) {
        pen.setWidthF(m_geometry.goal_wall_width());
    }
    painter->setPen(pen);

    // blue goal
    pen.setColor("dodgerblue");
    painter->setPen(pen);
    drawGoal(painter, 1.0f, cosmetic);

    // yellow goal
    pen.setColor("yellow");
    painter->setPen(pen);
    drawGoal(painter, -1.0f, cosmetic);
}

void FieldWidget::drawGoal(QPainter *painter, float side, bool cosmetic)
{
    QPainterPath path;

    const float d = cosmetic ? 0 : m_geometry.goal_wall_width() / 2.0f;
    const float h = m_geometry.field_height() / 2.0f;
    const float w = m_geometry.goal_width() / 2.0f + d;
    path.moveTo( w, side * h);
    path.lineTo( w, side * (h + m_geometry.goal_depth() + d));
    path.lineTo(-w, side * (h + m_geometry.goal_depth() + d));
    path.lineTo(-w, side * h);

    painter->drawPath(path);
}

void FieldWidget::takeScreenshot()
{
    QString filename = QFileDialog::getSaveFileName(NULL, "Save Screenshot...",
        QString(), "PNG files (*.png)");
    if (filename.isNull()) {
        return;
    }
    if (!filename.endsWith(".png")){
        filename += ".png";
    }

    // ensure that the screenshot is taken using antialiasing
    bool disableAntialiasing = false;
    if (!m_actionAntialiasing->isChecked()) {
        m_actionAntialiasing->setChecked(true);
        disableAntialiasing = true;
    }

    QPoint topLeft = mapFromScene(m_fieldRect.topLeft());
    QPoint bottomRight = mapFromScene(m_fieldRect.bottomRight());
    QRect drawRect(topLeft, bottomRight);

    QImage img(4000, 4000, QImage::Format_ARGB32);
    QPainter painter(&img);
    render(&painter, QRectF(), drawRect);
    img.save(filename);

    if (disableAntialiasing) {
        m_actionAntialiasing->setChecked(false);
    }
}

void FieldWidget::saveSituation()
{
    if (m_lastWorldState.isNull()) {
        return;
    }
    ::saveSituation(m_lastWorldState->world_state(), m_gameState);
}

void FieldWidget::Robot::tryHide()
{
    // hide robot on second call, without interleaved call to show
    if (!visible) {
        robot->hide();
        id->hide();
    }
    visible = false;
}

void FieldWidget::Robot::show()
{
    robot->show();
    id->show();
    visible = true;
}
