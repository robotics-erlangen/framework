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
#include <QDragEnterEvent>
#include <QDragLeaveEvent>
#include <QDragMoveEvent>
#include <QDropEvent>
#include <QMimeData>
#include <QUrl>
#include <QSignalMapper>
#include <QQuaternion>
#include "fieldwidget.h"
#include "virtualfieldsetupdialog.h"

#ifdef QTSVG_FOUND
#include <QSvgGenerator>
#endif //QTSVG_FOUND

const float ballRadius = 0.02133f;

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
    m_usingVirtualField(false),
    m_rotation(0.0f),
    m_visualizationsUpdated(false),
    m_infoTextUpdated(false),
    m_hasTouchInput(false),
    m_dragType(DragNone),
    m_dragItem(NULL),
    m_isLogplayer(false),
    m_enableDragMeasure(false),
    m_flipped(false),
    m_virtualFieldConfiguration(new VirtualFieldConfiguration)
{
    m_touchStatusType = QGestureRecognizer::registerRecognizer(new TouchStatusRecognizer);
    grabGesture(m_touchStatusType);
    grabGesture(Qt::PanGesture);
    grabGesture(Qt::PinchGesture);

    m_guiTimer = new GuiTimer(30, this);
    connect(m_guiTimer, &GuiTimer::timeout, this, &FieldWidget::updateAll);
    m_guiTimer->requestTriggering();

    geometrySetDefault(&m_geometry);
    geometrySetDefault(&m_virtualFieldGeometry);

    setAcceptDrops(true);

    // setup context menu
    m_contextMenu = new QMenu(this);
    QAction *actionHorizontal = m_contextMenu->addAction("Horizontal");
    connect(actionHorizontal, SIGNAL(triggered()), SLOT(setHorizontal()));
    QAction *actionVertical = m_contextMenu->addAction("Vertical");
    connect(actionVertical, SIGNAL(triggered()), SLOT(setVertical()));
    QAction *actionFlip = m_contextMenu->addAction("Flip");
    connect(actionFlip, SIGNAL(triggered()), SLOT(flipField()));
    m_contextMenu->addSeparator();
    // add actions to allow hiding visualizations of a team
    QList<QAction**> visualizationActions {&m_actionShowBlueVis, &m_actionShowBlueReplayVis, &m_actionShowYellowVis,
                                         &m_actionShowYellowReplayVis, &m_actionShowControllerVis};
    QList<QString> actionNames {"Show blue visualizations", "Show blue replay visualizations",
                               "Show yellow visualizations", "Show yellow replay visualizations",
                               "Show controller visualizations"};
    for (int i = 0;i<visualizationActions.size();i++) {
        QAction * action = m_contextMenu->addAction(actionNames[i]);
        action->setCheckable(true);
        action->setChecked(true);
        connect(action, SIGNAL(toggled(bool)), SLOT(updateVisualizationVisibility()));
        *(visualizationActions[i]) = action;
    }
    if (!m_isLogplayer) {
        m_actionShowBlueReplayVis->setVisible(false);
        m_actionShowYellowReplayVis->setVisible(false);
    }
    addToggleVisAction();

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

    // ball placement commands
    m_contextMenu->addSeparator();
    m_actionBallPlacementBlue = m_contextMenu->addAction("Ball placement Blue");
    connect(m_actionBallPlacementBlue, SIGNAL(triggered()), SLOT(ballPlacementBlue()));
    m_actionBallPlacementYellow = m_contextMenu->addAction("Ball placement Yellow");
    connect(m_actionBallPlacementYellow, SIGNAL(triggered()), SLOT(ballPlacementYellow()));

    // other actions
    m_contextMenu->addSeparator();
    QAction *actionShowAOI = m_contextMenu->addAction("Enable custom vision area");
    actionShowAOI->setCheckable(true);
    connect(actionShowAOI, SIGNAL(toggled(bool)), SLOT(setAOIVisible(bool)));
    QAction *actionCustomFieldSetup = m_contextMenu->addAction("Virtual Field");
    connect(actionCustomFieldSetup, &QAction::triggered, this, &FieldWidget::virtualFieldSetupDialog);
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

    // different points of view
    m_contextMenu->addSeparator();
    QMenu *trackingFromMenu = m_contextMenu->addMenu("Use tracking from");
    trackingFromMenu->setToolTip("Changes point of view of the robot position tracking.");
    m_contextMenu->setToolTipsVisible(true);

    QAction *actionTrackingFromBoth = trackingFromMenu->addAction("Both");
    actionTrackingFromBoth->setCheckable(true);

    QAction *actionTrackingFromRef = trackingFromMenu->addAction("Autoref");
    actionTrackingFromRef->setCheckable(true);

    QAction *actionTrackingFromYellow = trackingFromMenu->addAction("Yellow");
    actionTrackingFromYellow->setCheckable(true);

    QAction *actionTrackingFromBlue = trackingFromMenu->addAction("Blue");
    actionTrackingFromBlue->setCheckable(true);

    QAction *actionTrackingFromNone = trackingFromMenu->addAction("None");
    actionTrackingFromNone->setCheckable(true);

    QSignalMapper *trackingMapper = new QSignalMapper(m_contextMenu);
    connect(actionTrackingFromBoth, SIGNAL(triggered()), trackingMapper, SLOT(map()));
    trackingMapper->setMapping(actionTrackingFromBoth, static_cast<int>(TrackingFrom::BOTH));
    connect(actionTrackingFromRef, SIGNAL(triggered()), trackingMapper, SLOT(map()));
    trackingMapper->setMapping(actionTrackingFromRef, static_cast<int>(TrackingFrom::REFEREE));
    connect(actionTrackingFromYellow, SIGNAL(triggered()), trackingMapper, SLOT(map()));
    trackingMapper->setMapping(actionTrackingFromYellow, static_cast<int>(TrackingFrom::YELLOW));
    connect(actionTrackingFromBlue, SIGNAL(triggered()), trackingMapper, SLOT(map()));
    trackingMapper->setMapping(actionTrackingFromBlue, static_cast<int>(TrackingFrom::BLUE));
    connect(actionTrackingFromNone, SIGNAL(triggered()), trackingMapper, SLOT(map()));
    trackingMapper->setMapping(actionTrackingFromNone, static_cast<int>(TrackingFrom::NONE));

    connect(trackingMapper, SIGNAL(mapped(int)), SLOT(setTrackingFrom(int)));

    QActionGroup *trackingGroup = new QActionGroup(trackingFromMenu);
    trackingGroup->setExclusive(true);
    trackingGroup->addAction(actionTrackingFromBoth);
    trackingGroup->addAction(actionTrackingFromRef);
    trackingGroup->addAction(actionTrackingFromYellow);
    trackingGroup->addAction(actionTrackingFromBlue);
    trackingGroup->addAction(actionTrackingFromNone);

    m_trackingFrom = TrackingFrom::BOTH;
    actionTrackingFromBoth->setChecked(true);

    m_actionShowVision = m_contextMenu->addAction("Show vision");
    m_actionShowVision->setCheckable(true);
    connect(m_actionShowVision, SIGNAL(toggled(bool)), SLOT(setShowVision(bool)));
    QAction *actionSimulatorData = m_contextMenu->addAction("Show Simulator Truth");
    actionSimulatorData->setCheckable(true);
    connect(actionSimulatorData, &QAction::toggled, this, &FieldWidget::setShowTruth);
    m_showVision = false;

    // create graphics scene
    m_scene = new QGraphicsScene(this);
    setScene(m_scene);

    // ball object
    m_ball = new QGraphicsEllipseItem;
    m_ball->setPen(Qt::NoPen);
    m_ball->setBrush(QColor(255, 66, 0));
    m_ball->setZValue(100.0f);
    m_ball->setRect(QRectF(-ballRadius, -ballRadius, ballRadius * 2.0f, ballRadius * 2.0f));
    m_ball->hide();
    m_scene->addItem(m_ball);

    // rectangle for area of interest
    m_aoiItem = createAoiItem(128);
    m_virtualFieldAoiItem = createAoiItem(80);
    m_aoi = QRectF(-1, -1, 2, 2);

    QColor ballColor(255, 66, 0);
    m_ballTrace.color = ballColor.darker();
    m_ballTrace.z_index = 2.f;
    m_ballRawTrace.color =  QColor(Qt::blue);//ballColor.darker(300);
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

    // set up ssl referee packet
    m_referee.set_packet_timestamp(0);
    m_referee.set_stage(SSL_Referee::NORMAL_FIRST_HALF);
    m_referee.set_command(SSL_Referee::BALL_PLACEMENT_BLUE);
    m_referee.set_command_counter(1);
    m_referee.set_command_timestamp(0);
    teamInfoSetDefault(m_referee.mutable_yellow());
    teamInfoSetDefault(m_referee.mutable_blue());
}

FieldWidget::~FieldWidget()
{
    saveConfig();
    ungrabGesture(m_touchStatusType);
    QGestureRecognizer::unregisterRecognizer(m_touchStatusType);
}

void FieldWidget::saveConfig()
{
    QSettings s;
    s.beginGroup("Field");
    s.setValue("OpenGL", m_actionGL->isChecked());
    s.setValue("AntiAliasing", m_actionAntialiasing->isChecked());
    s.setValue("BallTraces", m_actionShowBallTraces->isChecked());
    s.setValue("RobotTraces", m_actionShowRobotTraces->isChecked());
    s.endGroup();
}

QGraphicsPathItem *FieldWidget::createAoiItem(unsigned int transparency)
{
    QGraphicsPathItem *item = new QGraphicsPathItem;
    item->setPen(Qt::NoPen);
    item->setBrush(QColor(0, 0, 0, transparency));
    item->setZValue(10000.0f);
    item->hide();
    m_scene->addItem(item);
    return item;
}

void FieldWidget::addToggleVisAction()
{
    QAction *actionToggleVisualizations = new QAction(this);
    actionToggleVisualizations->setShortcut(QKeySequence("T"));
    connect(actionToggleVisualizations, SIGNAL(triggered()), SLOT(toggleStrategyVisualizations()));
    addAction(actionToggleVisualizations);
}

void FieldWidget::setHorusMode(bool enable)
{
    m_isLogplayer = enable;
    m_actionBallPlacementBlue->setVisible(!enable);
    m_actionBallPlacementYellow->setVisible(!enable);
    m_actionShowBlueReplayVis->setVisible(enable);
    m_actionShowYellowReplayVis->setVisible(enable);
}

void FieldWidget::toggleStrategyVisualizations()
{
    if (m_isLogplayer) {
        m_actionShowBlueVis->setChecked(!m_actionShowBlueVis->isChecked());
        m_actionShowBlueReplayVis->setChecked(!m_actionShowBlueReplayVis->isChecked());
        m_actionShowYellowVis->setChecked(!m_actionShowYellowVis->isChecked());
        m_actionShowYellowReplayVis->setChecked(!m_actionShowYellowReplayVis->isChecked());
    }
}

void FieldWidget::handleStatus(const Status &status)
{
    if (status->has_world_state()) {
        m_worldState.append(status);
        m_lastWorldState = status;
        m_guiTimer->requestTriggering();
    }

    if (status->has_game_state()) {
        const amun::GameState &state = status->game_state();
        // update referee information
        m_referee.set_stage(state.stage());
        m_referee.mutable_yellow()->CopyFrom(state.yellow());
        m_referee.mutable_blue()->CopyFrom(state.blue());
        if (state.has_goals_flipped()) {
            if (m_flipped != state.goals_flipped()) {
                m_virtualFieldTransform.setFlip(state.goals_flipped());
                QRectF flippedAoi;
                flippedAoi.setTopLeft(-m_aoi.bottomRight());
                flippedAoi.setBottomRight(-m_aoi.topLeft());
                m_aoi = flippedAoi;
                updateAOI();
            }
            m_flipped = state.goals_flipped();
        }
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

    if (status->has_geometry() && !m_usingVirtualField) {
        m_geometry.CopyFrom(status->geometry());
        m_geometryUpdated = true;
        m_guiTimer->requestTriggering();
    }

    for (auto it = m_debugSourceCounter.begin(); it != m_debugSourceCounter.end(); it++) {
        // don't try to clear multiple times
        if (it.value() >= 0) {
            it.value()++;
        }
        if (it.value() > 100) {
            it.value() = -1;
            m_visualizations.remove(it.key());
            m_guiTimer->requestTriggering();
        }
    }
    for (const auto& debug: status->debug()) {
        // just save status to avoid copying the visualizations
        m_visualizations[debug.source()] = status;
        m_debugSourceCounter[debug.source()] = 0;
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
    geometrySetDefault(&m_virtualFieldGeometry);
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

void FieldWidget::setRegularVisualizationsEnabled(bool blue, bool enabled)
{
    if (blue) {
        m_actionShowBlueVis->setChecked(enabled);
    } else {
        m_actionShowYellowVis->setChecked(enabled);
    }
}

void FieldWidget::updateVisualizationVisibility()
{
    m_visibleVisSources[amun::StrategyBlue] = m_actionShowBlueVis->isChecked();
    m_visibleVisSources[amun::ReplayBlue] = m_actionShowBlueReplayVis->isChecked();
    m_visibleVisSources[amun::StrategyYellow] = m_actionShowYellowVis->isChecked();
    m_visibleVisSources[amun::ReplayYellow] = m_actionShowYellowReplayVis->isChecked();
    m_visibleVisSources[amun::Controller] = m_actionShowControllerVis->isChecked();
    m_visibleVisSources[amun::Autoref] = true;
    m_visibleVisSources[amun::Tracking] = true;

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
        for (const auto& debug: v->debug()) {
            if (m_visibleVisSources.value(debug.source())) {
                updateVisualizations(debug);
            }
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
            pen.setCapStyle(Qt::RoundCap);
            pen.setJoinStyle(Qt::RoundJoin);

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

    // if the start and end point of a simple line are the same, QPainterPath.lineTo draws nothing (even with a positive line width)
    if (vis.path().point_size() == 2 && vis.path().point(0).x() == vis.path().point(1).x() &&
            vis.path().point(0).y() == vis.path().point(1).y()) {
        // a radius of zero will discard the ellipse, just use a very very small radius
        const float EPS = 0.00001f;
        path.addEllipse(vis.path().point(0).x(), vis.path().point(0).y(), EPS, 0);
    } else {
        // a regular line
        path.moveTo(vis.path().point(0).x(), vis.path().point(0).y());
        for (int i = 1; i < vis.path().point_size(); i++) {
            path.lineTo(vis.path().point(i).x(), vis.path().point(i).y());
        }
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
        trace.invalid.enqueue(item);
    }
    trace.traces.clear();
}

void FieldWidget::invalidateTraces(Trace &trace, TraceMap::iterator begin,
                                   TraceMap::iterator end)
{
    for (auto it = begin; it != end;) {
        QGraphicsEllipseItem *item = it.value();
        it = trace.traces.erase(it);
        // stage item for now, to avoid hiding and immediatelly showing again
        trace.staged.append(item);
    }
}

void FieldWidget::invalidateTraces(Trace &trace, qint64 time)
{
    const qint64 TIME_DIFF = 1000*1000*1000;
    auto lower = trace.traces.lowerBound(time - TIME_DIFF);
    auto upper = trace.traces.upperBound(time + TIME_DIFF);
    invalidateTraces(trace, trace.traces.begin(), lower);
    invalidateTraces(trace, upper, trace.traces.end());
}

void FieldWidget::finishInvalidateTraces(Trace &trace)
{
    for (auto &item: trace.staged) {
        trace.invalid.enqueue(item);
        item->hide();
    }
    trace.staged.clear();
}

void FieldWidget::addTrace(Trace &trace, const QPointF &pos, qint64 time)
{
    QGraphicsEllipseItem *item = nullptr;
    if (!trace.staged.isEmpty()) {
        item = trace.staged.dequeue();
    } else if (!trace.invalid.isEmpty()) {
        item = trace.invalid.dequeue();
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
    trace.traces.insert(time, item);
}

static void setBall(QGraphicsEllipseItem* ball, float x, float y)
{
    bool update = false;
    // update ball if it moved for more than 1 millimeter
    update |= (qAbs(x - ball->pos().x()) > 0.001);
    update |= (qAbs(y - ball->pos().y()) > 0.001);

    if (update) {
        ball->setPos(x, y);
    }
    ball->show();
}

void FieldWidget::updateDetection()
{
    if (m_worldState.isEmpty()) {
        return;
    }

    QSet<uint> cameraIDs{};
    for (int k = 0; k < m_worldState.size(); ++k) {
        if (m_worldState[k].isNull()) {
            continue;
        }
        const world::State &worldState = m_worldState[k]->world_state();
        const bool isLast = (k == (m_worldState.size() - 1));

        // pre-clean all traces, independent of existence of ball / robot
        invalidateTraces(m_ballTrace, worldState.time());
        invalidateTraces(m_ballRawTrace, worldState.time());
        invalidateTraces(m_robotBlueTrace, worldState.time());
        invalidateTraces(m_robotBlueRawTrace, worldState.time());
        invalidateTraces(m_robotYellowTrace, worldState.time());
        invalidateTraces(m_robotYellowRawTrace, worldState.time());

        if (m_trackingFrom != TrackingFrom::NONE) {
            if (worldState.has_ball()) {
                if (isLast) {
                    setBall(worldState.ball());
                }
                addBallTrace(worldState.time(), worldState.ball());
            } else {
                m_ball->hide();
            }

            // update the individual robots
            bool useSimpleBlueTracking = worldState.simple_tracking_blue_size() > 0 && (m_trackingFrom == TrackingFrom::REFEREE || m_trackingFrom == TrackingFrom::YELLOW);
            for (int i = 0; i < worldState.blue_size(); i++) {
                const world::Robot &robot = useSimpleBlueTracking ? worldState.simple_tracking_blue(i) : worldState.blue(i);
                const robot::Specs &specs = m_teamBlue[robot.id()];
                if (isLast) {
                    setRobot(robot, specs, m_robotsBlue, Qt::blue);
                }
                addRobotTrace(worldState.time(), robot, m_robotBlueTrace, m_robotBlueRawTrace);
            }

            bool useSimpleYellowTracking = worldState.simple_tracking_yellow_size() > 0 && (m_trackingFrom == TrackingFrom::REFEREE || m_trackingFrom == TrackingFrom::BLUE);
            for (int i = 0; i < worldState.yellow_size(); i++) {
                const world::Robot &robot = useSimpleYellowTracking ? worldState.simple_tracking_yellow(i) : worldState.yellow(i);
                const robot::Specs &specs = m_teamYellow[robot.id()];
                if (isLast) {
                    setRobot(robot, specs, m_robotsYellow, Qt::yellow);
                }
                addRobotTrace(worldState.time(), robot, m_robotYellowTrace, m_robotYellowRawTrace);
            }
        } else {
            m_ball->hide();
        }
        
        if (m_showVision) {
            m_visionCurrentlyDisplayed = true;
            for (int i = 0; i < worldState.vision_frames_size(); ++i) {
                if (worldState.vision_frames(i).has_detection()) {
                    const SSL_DetectionFrame &detection = worldState.vision_frames(i).detection();
                    uint cameraID = detection.camera_id();
                    cameraIDs.insert(cameraID);
                    for (int j = 0; j < detection.balls_size(); ++j) {
                        const SSL_DetectionBall &b = detection.balls(j);
                        setVisionBall(b, cameraID, j);
                    }

                    for (int j = 0; j < detection.robots_blue_size(); ++j) {
                        const SSL_DetectionRobot &r = detection.robots_blue(j);
                        const robot::Specs &specs = m_teamBlue[r.robot_id()];
                        setVisionRobot(r, specs, m_visionRobotsBlue[cameraID], Qt::blue);
                    }

                    for (int j = 0; j < detection.robots_yellow_size(); ++j) {
                        const SSL_DetectionRobot &r = detection.robots_yellow(j);
                        const robot::Specs &specs = m_teamYellow[r.robot_id()];
                        setVisionRobot(r, specs, m_visionRobotsYellow[cameraID], Qt::yellow);
                    }
                }
            }
        }

        if (m_showTruth) {
            m_truthDisplayed = true;
            if (worldState.reality_size() > 0) {
                const world::SimulatorState& reality = worldState.reality(worldState.reality_size() - 1);
                for (int i=0; i < reality.blue_robots_size(); ++i) {
                    const world::SimRobot& robot = reality.blue_robots(i);
                    const robot::Specs &specs = m_teamBlue[robot.id()];
                    setTrueRobot(robot, specs, m_realRobotsBlue, Qt::blue);
                }
                for (int i=0; i < reality.yellow_robots_size(); ++i) {
                    const world::SimRobot& robot = reality.yellow_robots(i);
                    const robot::Specs &specs = m_teamYellow[robot.id()];
                    setTrueRobot(robot, specs, m_realRobotsYellow, Qt::yellow);
                }
                if (reality.has_ball()) {
                    if (!m_realBall) {
                        m_realBall = new QGraphicsEllipseItem;
                        m_realBall->setPen(Qt::NoPen);
                        m_realBall->setBrush(QColor(250, 150, 0));
                        m_realBall->setZValue(90.0f);
                        m_realBall->setRect({-ballRadius, -ballRadius, ballRadius * 2, ballRadius * 2});
                        m_realBall->hide();
                        m_scene->addItem(m_realBall);
                    }
                    const QPointF pos = m_virtualFieldTransform.applyPosition({reality.ball().p_x(), reality.ball().p_y()});
                    ::setBall(m_realBall, pos.x(), pos.y());
                } else if (m_realBall) {
                    m_realBall->hide();
                }

            }
        }
    }

    // cleanup trace remainders
    finishInvalidateTraces(m_ballTrace);
    finishInvalidateTraces(m_ballRawTrace);
    finishInvalidateTraces(m_robotBlueTrace);
    finishInvalidateTraces(m_robotBlueRawTrace);
    finishInvalidateTraces(m_robotYellowTrace);
    finishInvalidateTraces(m_robotYellowRawTrace);

    // hide robots that are no longer tracked
    for(auto &robot : m_robotsBlue) {
        robot.tryHide();
    }

    for(auto &robot : m_robotsYellow) {
        robot.tryHide();
    }

    for(auto &robot : m_realRobotsBlue) {
        robot.tryHide();
    }

    for(auto &robot : m_realRobotsYellow) {
        robot.tryHide();
    }

    for (uint cameraID : cameraIDs) {
        for (auto &robots : m_visionRobotsBlue[cameraID]) {
            for (auto &r : robots) {
                r.tryHide();
            }
        }
        for (auto &robots : m_visionRobotsYellow[cameraID]) {
            for (auto &r : robots) {
                r.tryHide();
            }
        }
        for (auto &b : m_visionBalls[cameraID]) {
            if (!b.seenThisFrame) {
                b.ball->hide();
            }
            b.seenThisFrame = false;
        }
    }

    if (!m_showVision && m_visionCurrentlyDisplayed) {
        hideVision();
    }

    if (!m_showTruth && m_truthDisplayed) {
        hideTruth();
    }

    // prevent applying the world state again
    m_worldState.clear();
}

void FieldWidget::hideVision() {
    for (auto &robotMaps : m_visionRobotsBlue) {
        for (auto &robots : robotMaps) {
            for (auto &r : robots) {
                r.tryHide();
            }
        }
    }
    for (auto &robotMaps : m_visionRobotsYellow) {
        for (auto &robots : robotMaps) {
            for (auto &r : robots) {
                r.tryHide();
            }
        }
    }
    for (auto &ballList : m_visionBalls) {
        for (auto &b : ballList) {
            b.ball->hide();
        }
    }
    m_visionCurrentlyDisplayed = false;
}

void FieldWidget::hideTruth() {
    for(auto &robot : m_realRobotsBlue) {
        robot.tryHide();
    }

    for(auto &robot : m_realRobotsYellow) {
        robot.tryHide();
    }
    if (m_realBall) {
        m_realBall->hide();
    }
    m_truthDisplayed = false;
}

void FieldWidget::setBall(const world::Ball &ball)
{
    ::setBall(m_ball, ball.p_x(), ball.p_y());
}

void FieldWidget::setVisionBall(const SSL_DetectionBall &ball, uint cameraID, int ballID)
{
    float posX = -ball.y()/1000.0f;
    float posY = ball.x()/1000.0f;
    QPointF pos(m_virtualFieldTransform.applyPosX(posX, posY), m_virtualFieldTransform.applyPosY(posX, posY));

    // increase number of ball visualizations
    if (ballID >= m_visionBalls[cameraID].size()) {
        m_visionBalls[cameraID].append(VisionBall(new QGraphicsEllipseItem));
        m_visionBalls[cameraID][ballID].ball->setPen(Qt::NoPen);
        m_visionBalls[cameraID][ballID].ball->setBrush(QColor(150, 0, 250));
        m_visionBalls[cameraID][ballID].ball->setZValue(100.0f);
        m_visionBalls[cameraID][ballID].ball->setRect(QRectF(-ballRadius, -ballRadius, ballRadius * 2.0f, ballRadius * 2.0f));
        m_visionBalls[cameraID][ballID].ball->hide();
        m_scene->addItem(m_visionBalls[cameraID][ballID].ball);
    }


    m_visionBalls[cameraID][ballID].ball->setPos(pos);
    m_visionBalls[cameraID][ballID].seenThisFrame = true;

    m_visionBalls[cameraID][ballID].ball->show();
}

void FieldWidget::addBallTrace(qint64 time, const world::Ball &ball)
{
    if (m_actionShowBallTraces->isChecked()) {
        for (int i = 0; i < ball.raw_size(); ++i) {
            const world::BallPosition &p = ball.raw(i);
            addTrace(m_ballRawTrace, QPointF(p.p_x(), p.p_y()), p.time());
        }
        addTrace(m_ballTrace, QPointF(ball.p_x(), ball.p_y()), time);
    }
}

void FieldWidget::createRobotItem(Robot &r, const robot::Specs &specs, const QColor &color, const uint id, RobotVisualisation visType)
{
    r.robot = new QGraphicsPathItem;
    r.robot->setBrush(Qt::black);
    if (visType == RobotVisualisation::VISION) {
        r.robot->setBrush(color);
    }
    r.robot->setPen(Qt::NoPen);

    if (visType != RobotVisualisation::VISION) {
        // team marker
        QGraphicsEllipseItem *center = new QGraphicsEllipseItem(r.robot);
        center->setPen(Qt::NoPen);
        center->setBrush(color);
        center->setRect(QRectF(-0.025f, -0.025f, 0.05f, 0.05f));

        const QBrush pink("fuchsia");
        const QBrush green("lime");
        QBrush brush;

        // team id blobs
        // positions are as seen in the ssl rules (dribbler is on the upper side)
        // upper left
        brush = (id == 0 || id == 3 || id == 4 || id == 7 || id == 9 || id == 10 || id == 14 || id == 15) ? pink : green;
        addBlob(-0.054772f,  0.035f, brush, r.robot);
        // lower left
        brush = (id == 4 || id == 5 || id == 6 || id == 7 || id == 9 || id == 11 || id == 13  || id == 15) ? pink : green;
        addBlob(-0.035f, -0.054772f, brush, r.robot);
        // lower right
        brush = (id == 0 || id == 1 || id == 2 || id == 3 || id == 9 || id == 11 || id == 13  || id == 15) ? pink : green;
        addBlob( 0.035f, -0.054772f, brush, r.robot);
        // upper right
        brush = (id == 0 || id == 1 || id == 4 || id == 5 || id == 9 || id == 10 || id == 12  || id == 13) ? pink : green;
        addBlob( 0.054772f,  0.035f, brush, r.robot);
    }

    const float angle = specs.has_angle() ? (specs.angle() / M_PI * 180.0f) : 70.0f;
    const float radius = specs.has_radius() ? specs.radius() : 0.09f;
    // robot body
    const QRectF rect(-radius, -radius, radius * 2.0f, radius * 2.0f);
    QPainterPath path;
    path.arcMoveTo(rect, angle / 2.0f - 90.0f);
    path.arcTo(rect, angle / 2.0f - 90.0f, 360.0f - angle);
    path.closeSubpath();
    r.robot->setPath(path);

    // opacity
    if (visType != RobotVisualisation::RA) {
        r.robot->setZValue(6.0f);
        r.robot->setOpacity(0.5);
    } else {
        r.robot->setZValue(5.0f);
    }

    // id
    if (visType != RobotVisualisation::SEE_THROUGH) {
        QGraphicsSimpleTextItem *text;
        qreal tx, ty;
        if (visType == RobotVisualisation::RA) {
            text = new QGraphicsSimpleTextItem(QString::number(id));
            tx = 100 * radius;
            ty = 0;
            text->setBrush(Qt::white);
        } else {
            char data[2] = {0,'\0'};
            data[0] = "0123456789ABCDEFGHIKLMN"[id];
            text = new QGraphicsSimpleTextItem(data);
            text->setBrush(Qt::black);
            auto width = text->boundingRect().width() * 0.01;
            auto height = text->boundingRect().height() * 0.01;
            tx = -width * 50;
            ty = -height * 50;
        }
        text->setTransform(QTransform::fromScale(0.01, -0.01).rotate(-m_rotation).translate(tx, ty), true);
        r.id = text;
        r.id->setZValue(11.0f);
        m_scene->addItem(r.id);

        // just translated
        r.id->setCacheMode(QGraphicsItem::DeviceCoordinateCache);
    }
    m_scene->addItem(r.robot);
}

void FieldWidget::setRobot(const world::Robot &robot, const robot::Specs &specs, RobotMap &robots,
                           const QColor &color)
{
    // get robot or create it
    Robot &r = robots[robot.id()];
    // recreate robot body if neccessary
    if (!r.robot) {
        createRobotItem(r, specs, color, robot.id(), RobotVisualisation::RA);
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

void FieldWidget::setVisionRobot(const SSL_DetectionRobot &robot, const robot::Specs &specs, QList<RobotMap> &robotMapList, const QColor &color)
{
    // looks for robot visualization with that id to avoid unnecessary recreation of objects
    auto robotMapIt = std::find_if(robotMapList.begin(), robotMapList.end(),
            [&] (auto &robotMap) {
                auto rM = robotMap.find(robot.robot_id());
                return rM != robotMap.end() && !rM->visible;
            });

    // increase number of robotmaps accordingly
    if (robotMapIt == robotMapList.end()) {
        robotMapList.append(RobotMap{});
        robotMapIt = std::prev(robotMapList.end());
    }

    RobotMap &robotMap = *robotMapIt;

    // get robot or create it
    Robot &r = robotMap[robot.robot_id()];

    // recreate robot body if neccessary
    if (!r.robot) {
        createRobotItem(r, specs, color, robot.robot_id(), RobotVisualisation::SEE_THROUGH);
    }

    const float phi = m_virtualFieldTransform.applyAngle(robot.orientation()) * 180 / M_PI;

    const QPointF pos = m_virtualFieldTransform.applyPosition({-robot.y()/1000.0f, robot.x()/1000.0f});
    r.robot->setPos(pos);
    r.robot->setRotation(phi);
    if (r.id) {
        r.id->setPos(pos);
    }

    r.show();
}

void FieldWidget::setTrueRobot(const world::SimRobot& robot, const robot::Specs &specs, RobotMap& robots, const QColor &color) {
    // get robot or create it
    Robot &r = robots[robot.id()];
    // recreate robot body if neccessary
    if (!r.robot) {
        createRobotItem(r, specs, color, robot.id(), RobotVisualisation::VISION);
    }

    QQuaternion q{robot.rotation().real(), robot.rotation().i(), robot.rotation().j(), robot.rotation().k()}; // see simrobot.cpp
    QVector3D forwards{0, 1, 0};
    QVector3D rotated = q.rotatedVector(forwards);
    float phi = -atan2(rotated.z(), rotated.y());
    phi = m_virtualFieldTransform.applyAngle(phi) * 180 / M_PI + 180;

    bool update = false;
    const QPointF pos = m_virtualFieldTransform.applyPosition({robot.p_x(), robot.p_y()});

    // update if moved more than 1 millimeter or rotated for over 0.2 degrees
    update |= (qAbs(pos.x() - r.robot->pos().x()) > 0.001);
    update |= (qAbs(pos.y() - r.robot->pos().y()) > 0.001);
    update |= (qAbs(phi - r.robot->rotation()) > 0.2);


    if (update) {
        r.robot->setPos(pos);
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
    const world::Geometry &g = m_usingVirtualField ? m_virtualFieldGeometry : m_geometry;
    if (!g.IsInitialized() || !m_geometryUpdated) {
        return;
    }
    m_geometryUpdated = false; // don't process geometry again and again

    // check if geometry changed
    const std::string geometry = g.SerializeAsString();
    if (m_geometryString != geometry) {
        m_geometryString = geometry;

        // add some space around the field
        const float offset = g.boundary_width();

        QRectF rect;
        rect.setLeft(-g.field_width() / 2.0f - offset);
        rect.setTop(-g.field_height() / 2.0f - offset);
        rect.setWidth(g.field_width() + offset * 2);
        rect.setHeight(g.field_height() + offset * 2);
        m_fieldRect = rect;
        if (!m_usingVirtualField) {
            m_realFieldRect = rect;
        }
        resetCachedContent();

        updateAOI();

        // allow showing a small area around the field
        setSceneRect(rect.adjusted(-2, -2, 2, 2));
        showWholeField();
    }
}

void FieldWidget::showWholeField()
{
    // reset aspect ratio and rotation to avoid problems during resize
    QTransform t;
    t.rotate(m_rotation);
    t.scale(1, -1);
    setTransform(t);
    fitInView(m_fieldRect, Qt::KeepAspectRatio);
}

void FieldWidget::setFieldOrientation(float rotation)
{
    m_rotation = rotation;
    showWholeField();

    auto clear = [](RobotMap& map) {
        for(const auto& robot : map) {
            delete robot.id;
            delete robot.robot;
        }
        map.clear();
    };

    // force redrawing robots, required to update the label orientation
    clear(m_robotsBlue);
    clear(m_robotsYellow);
    clear(m_realRobotsBlue);
    clear(m_realRobotsYellow);

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

void FieldWidget::flipField()
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

void FieldWidget::virtualFieldSetupDialog()
{
    VirtualFieldSetupDialog dialog(*m_virtualFieldConfiguration, this);
    dialog.exec();
    auto config = new VirtualFieldConfiguration(dialog.getResult(m_geometry));
    m_virtualFieldConfiguration.reset(config);
    m_usingVirtualField = m_virtualFieldConfiguration->enabled;
    m_virtualFieldGeometry.CopyFrom(m_virtualFieldConfiguration->geometry);
    m_virtualFieldTransform.setTransform(m_virtualFieldConfiguration->transform);
    m_geometryUpdated = true;
    updateGeometry();

    Command command(new amun::Command);
    auto tracking = command->mutable_tracking();
    tracking->set_enable_virtual_field(m_virtualFieldConfiguration->enabled);
    auto transform = tracking->mutable_field_transform();
    transform->set_a11(m_virtualFieldConfiguration->transform[0]);
    transform->set_a12(m_virtualFieldConfiguration->transform[1]);
    transform->set_a21(m_virtualFieldConfiguration->transform[2]);
    transform->set_a22(m_virtualFieldConfiguration->transform[3]);
    transform->set_offsetx(m_virtualFieldConfiguration->transform[4]);
    transform->set_offsety(m_virtualFieldConfiguration->transform[5]);

    tracking->mutable_virtual_geometry()->CopyFrom(config->geometry);
    emit sendCommand(command);
    m_virtualFieldAoiItem->setVisible(m_virtualFieldConfiguration->enabled);
    updateAOI();
}

void FieldWidget::resizeAOI(QPointF pos)
{
    const world::Geometry &geometry = m_usingVirtualField ? m_virtualFieldGeometry : m_geometry;
    if (geometry.IsInitialized()) {
        double offset = geometry.boundary_width() + 0.1f;
        double limitX = geometry.field_width() / 2 + offset;
        double limitY = geometry.field_height() / 2 + offset;
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

    QRectF transformedVirtualFieldRect;
    if (m_usingVirtualField) {
        // transform real field rect to virtual field space
        QPointF virtualAoiOffset(0.3f, 0.3f); // subtract a small offset from the aoi to protect field borders etc.
        QPointF topLeft = m_virtualFieldTransform.applyPosition(m_realFieldRect.topLeft() + virtualAoiOffset);
        QPointF bottomRight = m_virtualFieldTransform.applyPosition(m_realFieldRect.bottomRight() - virtualAoiOffset);
        transformedVirtualFieldRect = QRectF(topLeft, bottomRight);
        QPainterPath realPath;
        realPath.addPolygon(polygon.subtracted(QPolygonF(transformedVirtualFieldRect)));
        m_virtualFieldAoiItem->setPath(realPath);
    }

    // inform tracking about changes
    Command command(new amun::Command);
    amun::CommandTracking *tracking = command->mutable_tracking();
    tracking->set_aoi_enabled(m_aoiItem->isVisible() || m_usingVirtualField);
    if (m_aoiItem->isVisible() || m_usingVirtualField) {
        world::TrackingAOI *aoi = tracking->mutable_aoi();
        QRectF resultAoi;
        if (m_aoiItem->isVisible() && m_usingVirtualField) {
            resultAoi = m_aoi.intersected(transformedVirtualFieldRect);
        } else if (m_aoiItem->isVisible()) {
            resultAoi = m_aoi;
        } else { // m_usingVirtualField
            resultAoi = transformedVirtualFieldRect;
        }
        aoi->set_x1(qMin(resultAoi.left(), resultAoi.right()));
        aoi->set_y1(qMin(resultAoi.top(), resultAoi.bottom()));
        aoi->set_x2(qMax(resultAoi.left(), resultAoi.right()));
        aoi->set_y2(qMax(resultAoi.top(), resultAoi.bottom()));
    }
    emit sendCommand(command);
}

void FieldWidget::sendRobotMoveCommands(const QPointF &p)
{
    Command command(new amun::Command);
    amun::CommandSimulator *sim = command->mutable_simulator();
    float flipFactor = m_flipped && !m_usingVirtualField ? -1.0f : 1.0f;
    if (m_dragType == DragBall) {
        amun::SimulatorMoveBall *ball = sim->mutable_move_ball();
        ball->set_p_x(p.x() * flipFactor);
        ball->set_p_y(p.y() * flipFactor);
    } else if (m_dragType == DragBlue) {
        amun::SimulatorMoveRobot *robot = sim->add_move_blue();
        robot->set_id(m_dragId);
        robot->set_p_x(p.x() * flipFactor);
        robot->set_p_y(p.y() * flipFactor);

        amun::RobotMoveCommand *move = command->add_robot_move_blue();
        move->set_id(m_dragId);
        move->set_p_x(p.x());
        move->set_p_y(p.y());
    } else if (m_dragType == DragYellow) {
        amun::SimulatorMoveRobot *robot = sim->add_move_yellow();
        robot->set_id(m_dragId);
        robot->set_p_x(p.x() * flipFactor);
        robot->set_p_y(p.y() * flipFactor);

        amun::RobotMoveCommand *move = command->add_robot_move_yellow();
        move->set_id(m_dragId);
        move->set_p_x(p.x() );
        move->set_p_y(p.y());
    }
    emit sendCommand(command);
}

void FieldWidget::sendSimulatorTeleportBall(const QPointF &p)
{
    float flipFactor = m_flipped && !m_usingVirtualField ? -1.0f : 1.0f;
    Command command(new amun::Command);
    amun::CommandSimulator *sim = command->mutable_simulator();
    amun::SimulatorMoveBall *ball = sim->mutable_move_ball();
    ball->set_p_x(p.x() * flipFactor);
    ball->set_p_y(p.y() * flipFactor);
    ball->set_v_x(0);
    ball->set_v_y(0);
    ball->set_position(true);
    emit sendCommand(command);
}

void FieldWidget::dragEnterEvent(QDragEnterEvent *event)
{
    event->acceptProposedAction();
}

void FieldWidget::dragMoveEvent(QDragMoveEvent *event)
{
    event->acceptProposedAction();
}

void FieldWidget::dragLeaveEvent(QDragLeaveEvent *event)
{
    event->accept();
}

void FieldWidget::dropEvent(QDropEvent *event)
{
    const QMimeData* mimeData = event->mimeData();

    if (mimeData->hasUrls() && m_isLogplayer) {
        QList<QUrl> urlList = mimeData->urls();
        if (urlList.size() > 0) {
            emit fileDropped(urlList.at(0).toLocalFile());
        }
    }
}

void FieldWidget::keyPressEvent(QKeyEvent *event)
{
    QGraphicsView::keyPressEvent(event);
    int key = event->key();
    if (key == Qt::Key_Up || key == Qt::Key_Down || key == Qt::Key_Left || key == Qt::Key_Right) {
        createInfoText();
    }
}

void FieldWidget::mouseDoubleClickEvent(QMouseEvent *event)
{
    const QPointF p = mapToScene(event->pos());
    for (RobotMap::iterator it = m_robotsBlue.begin(); it != m_robotsBlue.end() && m_dragType == DragNone; ++it) {
        QPointF mapped = it.value().robot->mapFromScene(p);
        QGraphicsPathItem *robot = it.value().robot;
        if (robot->path().contains(mapped)) {
            emit robotDoubleClicked(true, it->id->text().toInt());
            break;
        }
    }

    for (RobotMap::iterator it = m_robotsYellow.begin(); it != m_robotsYellow.end() && m_dragType == DragNone; ++it) {
        QPointF mapped = it.value().robot->mapFromScene(p);
        QGraphicsPathItem *robot = it.value().robot;
        if (robot->path().contains(mapped)) {
            emit robotDoubleClicked(false, it->id->text().toInt());
            break;
        }
    }
}

void FieldWidget::mousePressEvent(QMouseEvent *event)
{
    const QPointF p = mapToScene(event->pos());
    const QPointF realFieldPos = m_virtualFieldTransform.applyInversePosition(p);
    const QPointF selectedPos = m_usingVirtualField ? realFieldPos : p;

    if (event->button() == Qt::LeftButton) {
        if (event->modifiers().testFlag(Qt::ControlModifier)) {

            bool wasOverRobot = false;
            for (bool teamIsBlue : {false, true}) {
                auto &team = teamIsBlue ? m_robotsBlue : m_robotsYellow;
                for (RobotMap::iterator it = team.begin(); it != team.end(); ++it) {
                    QPointF mapped = it.value().robot->mapFromScene(p);
                    QGraphicsPathItem *robot = it.value().robot;
                    if (robot->path().contains(mapped)) {
                        emit robotCtrlClicked(teamIsBlue, it.key());
                        wasOverRobot = true;
                        break;
                    }
                }
            }

            if (!wasOverRobot) {
                // click was to somewhere in the field
                sendSimulatorTeleportBall(selectedPos);
            }

            return;
        }

        m_dragItem = nullptr;
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

        if (m_isLogplayer || m_enableDragMeasure) {
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
            sendRobotMoveCommands(selectedPos);
        }
    }

    event->accept();
    m_dragStart = event->pos();
    m_mouseBegin = p;
}

void FieldWidget::createInfoText()
{
    const QPointF p = mapToScene(m_mousePosition);
    // create a html table containing the mouse position in both coordinate systems
    QString bgColor = palette().brush(QPalette::Window).color().name();
    QString infoText = QString("<table style='background-color:" + bgColor + ";padding: 2px;'><tr><th>Yellow</th><th>(</th><th>%1,</th>\
                                <th>%2</th><th>)</th></tr><tr><th>Blue</th><th>(</th><th>%3,</th><th>%4</th><th>)</th></tr>")
            .arg(p.x(), 0, 'f', 4).arg(p.y(), 0, 'f', 4).arg(-p.x(), 0, 'f', 4).arg(-p.y(), 0, 'f', 4);

    int textRows = 2;
    if (m_dragType == DragMeasure) {
        QPointF diff = (p - m_mouseBegin);
        float dist = std::sqrt(diff.x() * diff.x() + diff.y() * diff.y());
        infoText += QString("<tr><th>Distance</th><th></th><th>%1</th></tr>").arg(dist, 0, 'f', 4);
        textRows++;
    }
    infoText += "</table>";
    setInfoText(infoText, textRows);
}

void FieldWidget::mouseMoveEvent(QMouseEvent *event)
{
    m_mousePosition = event->pos();
    const QPointF p = mapToScene(event->pos());
    const QPointF realFieldPos = m_virtualFieldTransform.applyInversePosition(p);
    const QPointF selectedPos = m_usingVirtualField ? realFieldPos : p;
    event->accept();

    createInfoText();

    if (event->buttons() != Qt::NoButton) {
        if (m_dragType & DragAOIMask) {
            resizeAOI(p);
        } else if (m_dragType != DragNone) {
            if (m_dragItem) {
                sendRobotMoveCommands(selectedPos);
            }
        } else if (!event->modifiers().testFlag(Qt::ControlModifier)) {
            QPointF d = p - m_mouseBegin;
            translate(d.x(), d.y());
            updateInfoText();
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
    updateInfoText();
}

void FieldWidget::resizeEvent(QResizeEvent *event)
{
    showWholeField();
    QGraphicsView::resizeEvent(event);
}

bool FieldWidget::gestureEvent(QGestureEvent *event)
{
    event->accept();
    if (event->gesture(Qt::PanGesture)) {
        QPanGesture *pan = static_cast<QPanGesture *>(event->gesture(Qt::PanGesture));
        QPointF delta = pan->delta();
        translate(delta.x(), delta.y());
        updateInfoText();
    }
    if (event->gesture(Qt::PinchGesture)) {
        QPinchGesture *pinch = static_cast<QPinchGesture *>(event->gesture(Qt::PinchGesture));
        if (pinch->changeFlags() & QPinchGesture::ScaleFactorChanged) {
            // faster scaling
            qreal scaleChange = (pinch->scaleFactor() - 1.)*1.6 + 1.;
            // similar to wheelEvent
            const QPointF p = mapToScene(pinch->centerPoint().toPoint());
            translate(p.x(), p.y());
            scale(scaleChange, scaleChange);
            translate(-p.x(), -p.y());
            updateInfoText();
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
    setInfoText(QString(), 0);
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

    m_infoTextItem->setHtml(m_infoText);
    m_infoTextItem->show();

    QFontMetrics fm(QGuiApplication::font());
    QPoint lblPos = QPoint(-4, height() - m_infoTextRows * fm.height() - 12);

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

void FieldWidget::setInfoText(const QString &str, int textRows)
{
    if (str == m_infoText) {
        return;
    }
    m_infoText = str;
    m_infoTextRows = textRows;
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
    const world::Geometry &geometry = m_usingVirtualField ? m_virtualFieldGeometry : m_geometry;
    painter->save();

    QRectF rect1;
    rect1.setLeft(-geometry.field_width() / 2.0f);
    rect1.setTop(-geometry.field_height() / 2.0f);
    rect1.setWidth(geometry.field_width());
    rect1.setHeight(geometry.field_height());

    const float offset = geometry.boundary_width() + 0.025f;
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
    painter->drawEllipse(QPointF(0, geometry.field_height() / 2.0 - geometry.penalty_spot_from_field_line_dist()), 0.01, 0.01);
    painter->drawEllipse(QPointF(0, -geometry.field_height() / 2.0 + geometry.penalty_spot_from_field_line_dist()), 0.01, 0.01);

    painter->restore();
}

void FieldWidget::drawLines(QPainter *painter, QRectF rect, bool cosmetic)
{
    const world::Geometry &geometry = m_usingVirtualField ? m_virtualFieldGeometry : m_geometry;
    const float lw = geometry.line_width();
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
        if (geometry.type() == world::Geometry::TYPE_2014) {
            float dr = geometry.defense_radius();
            const float ds = geometry.defense_stretch();

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

        } else {
            float dw = geometry.defense_width();
            float dh = geometry.defense_height();

            if (!cosmetic) {
                dw -= lwh;
                dh -= lwh;
            }

            QRectF defAreaBlue(QPointF(-0.5 * dw, rect.bottom() - dh), QPointF(0.5 * dw, rect.bottom()));
            QRectF defAreaYellow(QPointF(0.5 * dw, rect.top() + dh), QPointF(-0.5 * dw, rect.top()));
            painter->drawRect(defAreaBlue);
            painter->drawRect(defAreaYellow);
        }
    }

    if (!cosmetic) {
        rect.adjust(lwh, lwh, -lwh, -lwh);
    }

    // inner boundary
    painter->drawRect(rect);
    painter->drawLine(QPointF(rect.left(), 0.0f), QPointF(rect.right(), 0.0f));

    // center circle
    float r = geometry.center_circle_radius();
    if (!cosmetic) {
        r -= lwh;
    }
    painter->drawEllipse(QPointF(0, 0), r, r);

    if (!cosmetic) {
        pen.setWidthF(geometry.goal_wall_width());
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
    const world::Geometry &geometry = m_usingVirtualField ? m_virtualFieldGeometry : m_geometry;
    QPainterPath path;

    const float d = cosmetic ? 0 : geometry.goal_wall_width() / 2.0f;
    const float h = geometry.field_height() / 2.0f;
    const float w = geometry.goal_width() / 2.0f + d;
    path.moveTo( w, side * h);
    path.lineTo( w, side * (h + geometry.goal_depth() + d));
    path.lineTo(-w, side * (h + geometry.goal_depth() + d));
    path.lineTo(-w, side * h);

    painter->drawPath(path);
}

void FieldWidget::takeScreenshot()
{
#ifdef QTSVG_FOUND
    QString fileFilter = "SVG files (*.svg);;PNG files (*.png)";
#else
    QString fileFilter = "PNG files (*.png)";
#endif

    QString filename = QFileDialog::getSaveFileName(NULL, "Save Screenshot...",
        QString(), fileFilter);
    if (filename.isNull()) {
        return;
    }
    if (!filename.endsWith(".png") && !filename.endsWith(".svg")) {
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

    bool hasSvgSupport = false;
#ifdef QTSVG_FOUND
    hasSvgSupport = true;
#endif

    if (!hasSvgSupport || filename.endsWith(".png")) {
        QImage img(4000, 4000, QImage::Format_ARGB32);
        QPainter painter(&img);
        render(&painter, QRectF(), drawRect);
        img.save(filename);
    } else {
#ifdef QTSVG_FOUND
        // disable caching of text elements. Otherwise they are present as (low resolution) pixel graphics in the result
        for (auto &team : {m_robotsBlue, m_robotsYellow}) {
            for (auto &r : team) {
                r.id->setCacheMode(QGraphicsItem::NoCache);
            }
        }

        QSvgGenerator file;
        file.setFileName(filename);
        file.setSize(QSize(drawRect.width(), drawRect.height()));
        file.setTitle("Ra screenshot");
        QPainter painter(&file);
        render(&painter, QRectF(), drawRect);

        // reset cache mode of text elements
        for (auto &team : {m_robotsBlue, m_robotsYellow}) {
            for (auto &r : team) {
                r.id->setCacheMode(QGraphicsItem::DeviceCoordinateCache);
            }
        }
#endif
    }

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

void FieldWidget::ballPlacement(bool blue)
{
    m_referee.set_command(blue ? SSL_Referee::BALL_PLACEMENT_BLUE : SSL_Referee::BALL_PLACEMENT_YELLOW);
    float flipFactor = m_flipped && !m_usingVirtualField ? -1.0f : 1.0f;
    m_referee.mutable_designated_position()->set_x(m_mouseBegin.y() * flipFactor * 1000.0f);
    m_referee.mutable_designated_position()->set_y(-m_mouseBegin.x() * flipFactor * 1000.0f);
    assert(m_referee.IsInitialized());

    std::string referee;
    if (m_referee.SerializeToString(&referee)) {
        Command command(new amun::Command);
        command->mutable_referee()->set_command(referee);
        emit sendCommand(command);
    }
}

void FieldWidget::ballPlacementBlue()
{
    ballPlacement(true);
}

void FieldWidget::ballPlacementYellow()
{
    ballPlacement(false);
}

void FieldWidget::Robot::tryHide()
{
    // hide robot on second call, without interleaved call to show
    if (!visible) {
        robot->hide();
        if (id != nullptr) {
            id->hide();
        }
    }
    visible = false;
}

void FieldWidget::Robot::show()
{
    robot->show();
    if (id != nullptr) {
        id->show();
    }
    visible = true;
}

void FieldWidget::setTrackingFrom(int newViewPoint)
{
    m_trackingFrom = static_cast<TrackingFrom>(newViewPoint);
    m_worldState.append(m_lastWorldState);
    updateDetection();
}

void FieldWidget::setShowVision(bool enable)
{
    m_showVision = enable;
    m_worldState.append(m_lastWorldState);
    updateDetection();
}

void FieldWidget::setShowTruth(bool enable)
{
    m_showTruth = enable;
    m_worldState.append(m_lastWorldState);
    updateDetection();
}
