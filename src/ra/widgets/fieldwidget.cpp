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
#include <QActionGroup>
#include <QContextMenuEvent>
#include <QMenu>
#include <cmath>
#include <QGraphicsRectItem>
#include <QOpenGLWidget>
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

#include "core/coordinates.h"

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
    m_drawScenes(1),
    m_visualizationsUpdated(false),
    m_showCoordinateAxes(false),
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

    geometrySetDefault(&m_drawScenes[m_currentScene].geometry);
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
                                         &m_actionShowYellowReplayVis, &m_actionShowOtherVis};
    QList<QString> actionNames {"Show blue visualizations", "Show blue replay visualizations",
                               "Show yellow visualizations", "Show yellow replay visualizations",
                               "Show other visualizations"};
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

    m_contextMenu->addSeparator();
    m_actionShowAxes = m_contextMenu->addAction("Show yellows coordinate axes");
    m_actionShowAxes->setCheckable(true);
    m_actionShowAxes->setChecked(true);
    connect(m_actionShowAxes, &QAction::toggled, this, &FieldWidget::setShowCoordinateAxes);

    // ball placement commands
    m_contextMenu->addSeparator();
    m_actionBallPlacementBlue = m_contextMenu->addAction("Ball placement Blue");
    connect(m_actionBallPlacementBlue, SIGNAL(triggered()), SLOT(ballPlacementBlue()));
    m_actionBallPlacementYellow = m_contextMenu->addAction("Ball placement Yellow");
    connect(m_actionBallPlacementYellow, SIGNAL(triggered()), SLOT(ballPlacementYellow()));

    // other actions
    m_contextMenu->addSeparator();
    m_actionShowAOI = m_contextMenu->addAction("Enable custom vision area");
    m_actionShowAOI->setCheckable(true);
    connect(m_actionShowAOI, SIGNAL(toggled(bool)), SLOT(setAOIVisible(bool)));
    m_actionFollowBall = m_contextMenu->addAction("Follow ball");
    m_actionFollowBall->setCheckable(true);
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

    QMenu *saveSituationMenu = m_contextMenu->addMenu("Save Situation");
    QAction *actionSaveSituationLua = saveSituationMenu->addAction("As Lua Strategy File");
    connect(actionSaveSituationLua, SIGNAL(triggered()), SLOT(saveSituationLua()));
    QMenu *saveSituationTsMenu = saveSituationMenu->addMenu("As Typescript Data File");
    QAction *actionSaveSituationTsAutoref = saveSituationTsMenu->addAction("Autoref Perspective");
    QAction *actionSaveSituationTsBlue = saveSituationTsMenu->addAction("Blue Strategy Perspective");
    QAction *actionSaveSituationTsYellow = saveSituationTsMenu->addAction("Yellow Strategy Perspective");

    QSignalMapper *saveSituationMapper = new QSignalMapper(saveSituationTsMenu);
    connect(actionSaveSituationTsAutoref, SIGNAL(triggered()), saveSituationMapper, SLOT(map()));
    saveSituationMapper->setMapping(actionSaveSituationTsAutoref, static_cast<int>(TrackingFrom::AUTOREF));
    connect(actionSaveSituationTsBlue, SIGNAL(triggered()), saveSituationMapper, SLOT(map()));
    saveSituationMapper->setMapping(actionSaveSituationTsBlue, static_cast<int>(TrackingFrom::BLUE));
    connect(actionSaveSituationTsYellow, SIGNAL(triggered()), saveSituationMapper, SLOT(map()));
    saveSituationMapper->setMapping(actionSaveSituationTsYellow, static_cast<int>(TrackingFrom::YELLOW));

    connect(saveSituationMapper, &QSignalMapper::mappedInt, this, &FieldWidget::saveSituationTypescript);

    m_actionRestoreSimulatorState = m_contextMenu->addAction("Restore Simulator State");
    m_actionRestoreSimulatorState->setVisible(false);
    connect(m_actionRestoreSimulatorState, &QAction::triggered, this, &FieldWidget::restoreSituation);

    // different points of view
    m_contextMenu->addSeparator();
    QMenu *trackingFromMenu = m_contextMenu->addMenu("Use tracking from");
    trackingFromMenu->setToolTip("Changes point of view of the robot position tracking.");
    m_contextMenu->setToolTipsVisible(true);

    QAction *actionTrackingFromRa = trackingFromMenu->addAction("Ra");
    actionTrackingFromRa->setCheckable(true);

    QAction *actionTrackingFromRef = trackingFromMenu->addAction("Autoref");
    actionTrackingFromRef->setCheckable(true);

    QAction *actionTrackingFromYellow = trackingFromMenu->addAction("Yellow");
    actionTrackingFromYellow->setCheckable(true);

    QAction *actionTrackingFromBlue = trackingFromMenu->addAction("Blue");
    actionTrackingFromBlue->setCheckable(true);

    QAction *actionTrackingFromNone = trackingFromMenu->addAction("None");
    actionTrackingFromNone->setCheckable(true);

    QSignalMapper *trackingMapper = new QSignalMapper(m_contextMenu);
    connect(actionTrackingFromRa, SIGNAL(triggered()), trackingMapper, SLOT(map()));
    trackingMapper->setMapping(actionTrackingFromRa, static_cast<int>(TrackingFrom::RA));
    connect(actionTrackingFromRef, SIGNAL(triggered()), trackingMapper, SLOT(map()));
    trackingMapper->setMapping(actionTrackingFromRef, static_cast<int>(TrackingFrom::AUTOREF));
    connect(actionTrackingFromYellow, SIGNAL(triggered()), trackingMapper, SLOT(map()));
    trackingMapper->setMapping(actionTrackingFromYellow, static_cast<int>(TrackingFrom::YELLOW));
    connect(actionTrackingFromBlue, SIGNAL(triggered()), trackingMapper, SLOT(map()));
    trackingMapper->setMapping(actionTrackingFromBlue, static_cast<int>(TrackingFrom::BLUE));
    connect(actionTrackingFromNone, SIGNAL(triggered()), trackingMapper, SLOT(map()));
    trackingMapper->setMapping(actionTrackingFromNone, static_cast<int>(TrackingFrom::NONE));

    connect(trackingMapper, &QSignalMapper::mappedInt, this, &FieldWidget::setTrackingFrom);

    QActionGroup *trackingGroup = new QActionGroup(trackingFromMenu);
    trackingGroup->setExclusive(true);
    trackingGroup->addAction(actionTrackingFromRa);
    trackingGroup->addAction(actionTrackingFromRef);
    trackingGroup->addAction(actionTrackingFromYellow);
    trackingGroup->addAction(actionTrackingFromBlue);
    trackingGroup->addAction(actionTrackingFromNone);

    m_trackingFrom = TrackingFrom::RA;
    actionTrackingFromRa->setChecked(true);

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

    // ball objects
    const QColor ballColor(255, 66, 0);
    m_rollingBall = new QGraphicsEllipseItem;
    m_rollingBall->setPen(Qt::NoPen);
    m_rollingBall->setBrush(ballColor);
    m_rollingBall->setZValue(100.0f);
    m_rollingBall->setRect(QRectF(-ballRadius, -ballRadius, ballRadius * 2.0f, ballRadius * 2.0f));
    m_rollingBall->hide();
    m_scene->addItem(m_rollingBall);

    m_flyingBall = new QGraphicsEllipseItem;
    m_flyingBall->setPen(Qt::NoPen);
    m_flyingBall->setBrush(ballColor);
    m_flyingBall->setZValue(100.0f);
    m_flyingBall->setRect(QRectF(-ballRadius * 4.0f, -ballRadius * 4.0f, ballRadius * 8.0f, ballRadius * 8.0f));
    m_flyingBall->hide();
    m_scene->addItem(m_flyingBall);

    // rectangle for area of interest
    m_aoiItem = createAoiItem(128);
    m_aoi = QRectF(-1, -1, 2, 2);

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
    bool showAxes = s.value("ShowAxes", false).toBool();
    m_actionShowAxes->setChecked(showAxes);
    setShowCoordinateAxes(showAxes);  // Initialize the coordinate axes state
    connect(m_actionShowAxes, &QAction::toggled, this, &FieldWidget::setShowCoordinateAxes);
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
    s.setValue("ShowAxes", m_actionShowAxes->isChecked());
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

void FieldWidget::internalRefereeEnabled(bool enabled)
{
    m_internalRefereeEnabled = enabled;
    m_actionBallPlacementBlue->setVisible(!m_isLogplayer && m_internalRefereeEnabled);
    m_actionBallPlacementYellow->setVisible(!m_isLogplayer && m_internalRefereeEnabled);
}

void FieldWidget::setHorusMode(bool enable)
{
    m_isLogplayer = enable;
    m_actionBallPlacementBlue->setVisible(!m_isLogplayer && m_internalRefereeEnabled);
    m_actionBallPlacementYellow->setVisible(!m_isLogplayer && m_internalRefereeEnabled);
    m_actionShowBlueReplayVis->setVisible(enable);
    m_actionShowYellowReplayVis->setVisible(enable);
    if (!m_isLogplayer) {
        m_actionRestoreSimulatorState->setVisible(false);
    }

    switchScene(enable ? 1 : 0);
}

void FieldWidget::setCornerBlockCathetusLength(float cornerBlockCathetusLength) {
    m_cornerBlockCathetusLength = cornerBlockCathetusLength;
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
    const bool hasNeutral = status->has_world_state()
        && (m_trackingFrom == TrackingFrom::RA || m_trackingFrom == TrackingFrom::NONE || m_showVision || m_showTruth);
    const bool hasBlue = status->has_execution_state() && (m_trackingFrom == TrackingFrom::BLUE && status->has_blue_running());
    const bool hasYellow = status->has_execution_state() && (m_trackingFrom == TrackingFrom::YELLOW && status->has_yellow_running());
    const bool hasAutoref = status->has_execution_state() && (m_trackingFrom == TrackingFrom::AUTOREF && status->has_autoref_running());
    if (hasNeutral || hasBlue || hasYellow || hasAutoref) {
        m_worldState.append(status);
        m_guiTimer->requestTriggering();
    }
    if (status->has_world_state()) {
        m_drawScenes[m_currentScene].lastWorldState[TrackingFrom::RA] = status;
        m_drawScenes[m_currentScene].lastWorldState[TrackingFrom::NONE] = status;
    }
    if (status->has_execution_state()) {
        if (status->has_blue_running()) {
            m_drawScenes[m_currentScene].lastWorldState[TrackingFrom::BLUE] = status;
        } else if (status->has_yellow_running()) {
            m_drawScenes[m_currentScene].lastWorldState[TrackingFrom::YELLOW] = status;
        } else if (status->has_autoref_running()) {
            m_drawScenes[m_currentScene].lastWorldState[TrackingFrom::AUTOREF] = status;
        }
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
        m_drawScenes[m_currentScene].geometry.CopyFrom(status->geometry());
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
            m_drawScenes[m_currentScene].visualizations.remove(it.key());
            m_guiTimer->requestTriggering();
        }
    }
    for (const auto& debug: status->debug()) {
        // just save status to avoid copying the visualizations
        m_drawScenes[m_currentScene].visualizations[debug.source()] = status;
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

void FieldWidget::hideVisualizationToggles()
{
    m_actionShowBlueVis->setVisible(false);
    m_actionShowYellowVis->setVisible(false);
    m_actionShowOtherVis->setVisible(false);
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

    // use protobuf reflections so that no source is missing when they are added in the future
    const QVector<amun::DebugSource> explicitSources = {amun::StrategyBlue, amun::ReplayBlue, amun::StrategyYellow, amun::ReplayYellow};
    const auto debugSources = amun::DebugSource_descriptor();
    for (int i = 0;i<debugSources->value_count();i++) {
        const amun::DebugSource source = static_cast<amun::DebugSource>(debugSources->value(i)->number());
        if (!explicitSources.contains(source)) {
            m_visibleVisSources[source] = m_actionShowOtherVis->isChecked();
        }
    }

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

    const bool yellowReplayRunning = m_actionShowYellowReplayVis->isEnabled()
            && m_actionShowYellowReplayVis->isChecked()
            && m_debugSourceCounter.contains(amun::DebugSource::ReplayYellow)
            && m_debugSourceCounter[amun::DebugSource::ReplayYellow] >= 0;
    const bool blueReplayRunning = m_actionShowBlueReplayVis->isChecked()
            && m_actionShowBlueReplayVis->isEnabled()
            && m_debugSourceCounter.contains(amun::DebugSource::ReplayBlue)
            && m_debugSourceCounter[amun::DebugSource::ReplayBlue] >= 0;
    for (const Status &v : m_drawScenes[m_currentScene].visualizations) {
        for (const auto& debug: v->debug()) {
            if (m_visibleVisSources.value(debug.source())) {
                const bool grey = (debug.source() == amun::DebugSource::StrategyYellow && yellowReplayRunning)
                    || (debug.source() == amun::DebugSource::StrategyBlue && blueReplayRunning);
                updateVisualizations(debug, grey);
            }
        }
    }
}

void FieldWidget::updateVisualizations(const amun::DebugValues &v, const bool grey)
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
                QColor col(
                        vis.pen().color().red(),
                        vis.pen().color().green(),
                        vis.pen().color().blue(),
                        vis.pen().color().alpha());

                if (grey) {
                    int h, s, v, a;
                    col.getHsv(&h, &s, &v, &a);
                    col = QColor::fromHsv(h, s / 2, v, a / 4);
                }
                pen.setColor(col);
            }
            if (vis.has_width()) {
                pen.setWidthF(vis.width());
            } else {
                pen.setWidthF(0.01f);
            }
        }

        // configure brush
        if (vis.has_brush()) {
            QColor col(QColor(vis.brush().red(), vis.brush().green(), vis.brush().blue(), vis.brush().alpha()));
            if (grey) {
                int h, s, v, a;
                col.getHsv(&h, &s, &v, &a);
                col = QColor::fromHsv(h, s / 2, v, a / 4);
            }
            brush = QBrush(col);
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

        if (vis.has_image()) {
            m_visualizationItems << createFieldFunction(vis);
        }
    }
}

QGraphicsItem* FieldWidget::createFieldFunction(const amun::Visualization &vis)
{
    QGraphicsPixmapItem *item = new QGraphicsPixmapItem;

    if (vis.image().data().size() != vis.image().width() * vis.image().height() * 4) {
        std::cerr <<"Error: image visualization data size does not match width * height"<<std::endl;
        return item;
    }

    QRectF drawRect = m_fieldRect;
    if (vis.image().has_draw_area()) {
        drawRect.setLeft(vis.image().draw_area().topleft().x());
        drawRect.setRight(vis.image().draw_area().bottomright().x());
        drawRect.setTop(vis.image().draw_area().topleft().y());
        drawRect.setBottom(vis.image().draw_area().bottomright().y());
    }

    QTransform transform = QTransform::fromTranslate(drawRect.left(), drawRect.top());
    transform.scale(drawRect.width() / vis.image().width(), drawRect.height() / vis.image().height());
    item->setTransform(transform);

    const uint8_t* data = (uint8_t*)(vis.image().data().data());
    const QImage image(data, vis.image().width(), vis.image().height(), vis.image().width() * 4, QImage::Format_ARGB32);
    const QPixmap p = QPixmap::fromImage(image);

    item->setPixmap(p);
    item->setZValue(vis.background() ? 1.0f : 10.0f);
    m_scene->addItem(item);
    return item;
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
    QVector<Status> normalStatus, executionStatus;

    for (const Status &status : m_worldState) {
        if (status.isNull()) {
            continue;
        }

        if (status->has_execution_state()) {
            executionStatus.append(status);
        } else if (status->has_world_state()) {
            normalStatus.append(status);
        }
    }

    const bool useExecutionState = m_trackingFrom == TrackingFrom::BLUE
        || m_trackingFrom == TrackingFrom::YELLOW
        || m_trackingFrom == TrackingFrom::AUTOREF;

    const auto& statusForTrackingDisplay = useExecutionState ? executionStatus : normalStatus;

    for (int k = 0; k < statusForTrackingDisplay.size(); ++k) {
        const world::State &worldState = useExecutionState
            ? statusForTrackingDisplay[k]->execution_state()
            : statusForTrackingDisplay[k]->world_state();
        const bool isLast = (k == (statusForTrackingDisplay.size() - 1));

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
                m_rollingBall->hide();
                m_flyingBall->hide();
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
        } else {
            m_rollingBall->hide();
            m_flyingBall->hide();
        }
    }

    for (const auto& status : normalStatus) {
        const auto& worldState = status->world_state();

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

        // doing it here ensures that the chosen state is exactly the one currently being displayed
        if (worldState.reality_size() > 0) {
            if (m_isLogplayer) {
                m_actionRestoreSimulatorState->setVisible(true);
                m_lastSimulatorState.CopyFrom(worldState.reality(worldState.reality_size()-1));
            }
            m_statesWithoutSimulatorReality = 0;
        } else {
            m_statesWithoutSimulatorReality++;
            if (m_statesWithoutSimulatorReality > 10) {
                m_actionRestoreSimulatorState->setVisible(false);
                m_lastSimulatorState.Clear();
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
    QGraphicsEllipseItem *currentBall;
    if (ball.p_z() == 0.0f) {
        currentBall = m_rollingBall;
        m_flyingBall->hide();
    } else {
        currentBall = m_flyingBall;
        m_rollingBall->hide();
    }
    ::setBall(currentBall, ball.p_x(), ball.p_y());

    if (m_actionFollowBall->isChecked()) {
        ensureVisible(currentBall, 150, 150);
        createInfoText();
    }
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

    QQuaternion q{robot.rotation().real(), robot.rotation().i(), robot.rotation().j(), robot.rotation().k()};
    QVector3D forwards{0, 1, 0};
    QVector3D rotated = q.rotatedVector(forwards);
    float phi = -atan2(rotated.x(), rotated.y());
    phi = m_virtualFieldTransform.applyAngle(phi) * 180 / M_PI;
    if (phi < 0) {
        phi += 360;
    }

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
            const world::TransformedRobotMeasurement &p = robot.raw(i);
            addTrace(robotRawTrace, QPointF(p.p_x(), p.p_y()), p.time());
        }
        addTrace(robotTrace, QPointF(robot.p_x(), robot.p_y()), time);
    }
}

void FieldWidget::updateGeometry()
{
    const world::Geometry &g = m_usingVirtualField ? m_virtualFieldGeometry : m_drawScenes[m_currentScene].geometry;
    if (!g.IsInitialized() || !m_geometryUpdated) {
        return;
    }
    m_geometryUpdated = false; // don't process geometry again and again

    // check if geometry changed
    const std::string geometry = g.SerializeAsString();
    if (m_geometryString != geometry) {
        m_geometryString = geometry;

        // add some space around the field
        const float offsetTouchLine = g.boundary_width();
        const float offsetGoalLine = g.boundary_width_goal_line();

        QRectF rect;
        rect.setLeft(-g.field_width() / 2.0f - offsetTouchLine);
        rect.setTop(-g.field_height() / 2.0f - offsetGoalLine);
        rect.setWidth(g.field_width() + offsetTouchLine * 2);
        rect.setHeight(g.field_height() + offsetGoalLine * 2);
        m_fieldRect = rect;
        if (!m_usingVirtualField) {
            m_realFieldRect = rect;
        }
        resetCachedContent();

        updateAOI();

        // allow showing a small area around the field
        setSceneRect(rect.adjusted(-2, -2, 2, 2));
        showWholeField();

        createInfoText();
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
    m_worldState.append(m_drawScenes[m_currentScene].lastWorldState[m_trackingFrom]);
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
    resetCachedContent();
}

void FieldWidget::setOpenGL(bool enable)
{
    if (enable) {
        setViewport(new QOpenGLWidget());
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

static void drawGoalSubstitutionArea(QPainter *painter, const world::Geometry& geometry)
{
    const auto fieldEnd = geometry.field_height() * 0.5 + geometry.boundary_width_goal_line();
    const auto goalSubstitutionY = fieldEnd - geometry.goal_substitution_area_width();
    const auto goalSubstitutionX = geometry.field_width() * 0.5 + geometry.boundary_width();

    // make color a transparent white
    const QPen pen = painter->pen();
    const QBrush brush = painter->brush();
    painter->setPen(Qt::NoPen);
    QColor c = Qt::white;
    c.setAlphaF(0.25f);
    painter->setBrush(c);

    QRectF rect;
    rect.setLeft(-goalSubstitutionX);
    rect.setTop(goalSubstitutionY);
    rect.setWidth(2 * goalSubstitutionX);
    rect.setHeight(geometry.goal_substitution_area_width());
    painter->drawRect(rect);

    rect.setTop(-fieldEnd);
    // height needs to be explicitly set again, because setTop also changes height
    rect.setHeight(geometry.goal_substitution_area_width());
    painter->drawRect(rect);

    // reset pen
    painter->setPen(pen);
    painter->setBrush(brush);
}

void FieldWidget::virtualFieldSetupDialog()
{
    VirtualFieldSetupDialog dialog(*m_virtualFieldConfiguration, this);
    dialog.exec();
    auto config = new VirtualFieldConfiguration(dialog.getResult(m_drawScenes[m_currentScene].geometry));
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

    if (m_usingVirtualField) {
        auto maxX = m_virtualFieldGeometry.field_width() * 0.5 + m_virtualFieldGeometry.boundary_width();
        auto maxY = m_virtualFieldGeometry.field_height() * 0.5 + m_virtualFieldGeometry.boundary_width_goal_line();
        m_aoi = QRectF(QPointF(-maxX, -maxY), QPointF(maxX, maxY));
    }

    m_aoiItem->setVisible(m_usingVirtualField);
    // toggling this bool calls the slot setAOIVisible
    m_actionShowAOI->setChecked(m_usingVirtualField);
    // if virtual field is on then custom vision area can't be disabled
    m_actionShowAOI->setEnabled(!m_usingVirtualField);
}

void FieldWidget::resizeAOI(QPointF pos)
{
    const world::Geometry &geometry = m_usingVirtualField ? m_virtualFieldGeometry : m_drawScenes[m_currentScene].geometry;
    if (geometry.IsInitialized()) {
        double offsetTouchLine = geometry.boundary_width() + 0.1f;
        double offsetGoalLine = geometry.boundary_width_goal_line() + 0.1f;
        double limitX = geometry.field_width() / 2 + offsetTouchLine;
        double limitY = geometry.field_height() / 2 + offsetGoalLine;
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
        world::TrackingAOI *aoi = tracking->mutable_aoi();
        aoi->set_x1(qMin(m_aoi.left(), m_aoi.right()));
        aoi->set_y1(qMin(m_aoi.top(), m_aoi.bottom()));
        aoi->set_x2(qMax(m_aoi.left(), m_aoi.right()));
        aoi->set_y2(qMax(m_aoi.top(), m_aoi.bottom()));
    }
    emit sendCommand(command);
}

void FieldWidget::sendRobotMoveCommands(const QPointF &p)
{
    Command command(new amun::Command);
    amun::CommandSimulator *sim = command->mutable_simulator();
    float flipFactor = m_flipped && !m_usingVirtualField ? -1.0f : 1.0f;
    if (m_dragType == DragBall) {
        sslsim::TeleportBall *ball = sim->mutable_ssl_control()->mutable_teleport_ball();
        coordinates::toVision(p * flipFactor, *ball); // TODO: mm vs. m. This one should be in meters, but is in mm.
        ball->set_by_force(true);
    } else if (m_dragType == DragBlue) {
        sslsim::TeleportRobot *robot = sim->mutable_ssl_control()->add_teleport_robot();
        auto* id = robot->mutable_id();
        id->set_id(m_dragId);
        id->set_team(gameController::BLUE);
        coordinates::toVision(p * flipFactor, *robot);
        robot->set_by_force(true);
    } else if (m_dragType == DragYellow) {
        sslsim::TeleportRobot *robot = sim->mutable_ssl_control()->add_teleport_robot();
        auto* id = robot->mutable_id();
        id->set_id(m_dragId);
        id->set_team(gameController::YELLOW);
        coordinates::toVision(p * flipFactor, *robot);
        robot->set_by_force(true);
    }

    if (m_dragType == DragYellow || m_dragType == DragBlue) {
        amun::RobotMoveCommand *move = m_dragType == DragYellow
            ? command->add_robot_move_yellow()
            : command->add_robot_move_blue();
        move->set_id(m_dragId);
        if (m_usingVirtualField) {
            move->set_p_x(flipFactor * m_virtualFieldTransform.applyPosX(p.x(), p.y()));
            move->set_p_y(flipFactor * m_virtualFieldTransform.applyPosY(p.x(), p.y()));
        } else {
            move->set_p_x(p.x());
            move->set_p_y(p.y());
        }
    }

    emit sendCommand(command);
}

void FieldWidget::sendSimulatorTeleportBall(const QPointF &p)
{
    float flipFactor = m_flipped && !m_usingVirtualField ? -1.0f : 1.0f;
    Command command(new amun::Command);
    amun::CommandSimulator *sim = command->mutable_simulator();
    sslsim::TeleportBall *ball = sim->mutable_ssl_control()->mutable_teleport_ball();
    coordinates::toVision(p * flipFactor, *ball);
    ball->set_vx(0);
    ball->set_vy(0);
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

    if (mimeData->hasUrls()) {
        QList<QUrl> urlList = mimeData->urls();
        if (urlList.size() > 0) {
            emit fileDropped(urlList.at(0).toLocalFile());
            event->acceptProposedAction();
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

            const int minDim = qMin(size().width(), size().height());
            if (min <= minDim / 50) {
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
            m_dragItem = m_rollingBall;
            m_rollingBall->show();
            m_flyingBall->hide();
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
            sim->mutable_ssl_control()->mutable_teleport_ball();
        } else if (m_dragType == DragBlue) {
            gameController::BotId *id = sim->mutable_ssl_control()->add_teleport_robot()->mutable_id();
            id->set_id(m_dragId);
            id->set_team(gameController::BLUE);
        } else if (m_dragType == DragYellow) {
            gameController::BotId *id = sim->mutable_ssl_control()->add_teleport_robot()->mutable_id();
            id->set_id(m_dragId);
            id->set_team(gameController::YELLOW);
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
        scaleFactor = std::pow(1.2, m_scrollSensitivity * numPixels.y() / 15.f);
    } else if (!numDegrees.isNull()) {
        scaleFactor = std::pow(1.2, m_scrollSensitivity * numDegrees.y() / 15.f);
    }

    // transform centered on the mouse cursor
    const QPointF p = mapToScene(event->position().toPoint());
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

void FieldWidget::drawCoordinateAxes(QPainter *painter, const QRectF &rect) 
{
    // Colors for the X and Y axes
    const QColor xColor = Qt::red;
    const QColor yColor = Qt::cyan;

    // Width of the axis lines and ticks (in meters)
    const float tickWidth = 0.02f;
    // Height of minor tick marks (every 0.25 units, in meters)
    const float smallTickHeight = 0.025f;
    // Height of major tick marks (every 0.5 units, in meters)
    const float largeTickHeight = 0.05f;
    // Scale factor for text (labels and numbers)
    const float labelScale = 0.01f;
    // Distance between consecutive tick marks (in meters)
    const float tickSpacing = 0.25f;
    // Threshold to skip drawing around the center (0,0) (in meters)
    const float centerThreshold = 0.01f;
    // Threshold for detecting whole numbers and 0.5 intervals (in meters)
    const float numberThreshold = 0.01f;
    // Text positioning offsets
    const float textVerticalPos = 30.0f;
    const float negativeRedHorizontalOffset = -24.0f;
    const float positiveRedHorizontalOffset = -30.0f;
    const float negativeCyanHorizontalOffset = -7.0f;
    const float positiveCyanHorizontalOffset = -3.0f;
    const float axisLabelOffsets = 20.0f;  // Horizontal and vertical offset for the "x" and "y" labels 
    
    painter->save();
    const QTransform originalTransform = painter->transform();
    
    // Create label transform by copying original and applying scale and rotation
    QTransform labelTransform = originalTransform;
    labelTransform.scale(labelScale, -labelScale);
    labelTransform.rotate(-90);
    
    // --- X AXIS ---
    QPen axisPen(xColor, tickWidth);
    painter->setPen(axisPen);
    painter->drawLine(QPointF(rect.left(), 0), QPointF(rect.right(), 0));
    
    // Draw X axis dashes and labels
    const float xStart = ceil(rect.left() / tickSpacing) * tickSpacing;
    for (float x = xStart; x <= rect.right(); x += tickSpacing) {
        if (abs(x) < centerThreshold) continue;  // Skip center
        
        // Draw dash
        painter->setTransform(originalTransform);
        const float height = (abs(remainder(x, 0.5f)) < numberThreshold) ? largeTickHeight : smallTickHeight;
        painter->drawLine(QPointF(x, -height), QPointF(x, height));
        
        // Add label for whole numbers only
        if (abs(remainder(x, 1.0f)) < numberThreshold) {
            painter->setTransform(labelTransform);
            const float horizontalOffset = x < 0 ? negativeRedHorizontalOffset : positiveRedHorizontalOffset;
            painter->drawText(QPointF(horizontalOffset, -x*100+5), QString::number(-x, 'g', 2));
        }
    }
    
    // --- Y AXIS ---
    painter->setTransform(originalTransform);
    painter->setPen(QPen(yColor, tickWidth));
    painter->drawLine(QPointF(0, rect.top()), QPointF(0, rect.bottom()));
    
    // Draw Y axis dashes and labels
    const float yStart = ceil(rect.top() / tickSpacing) * tickSpacing;
    for (float y = yStart; y <= rect.bottom(); y += tickSpacing) {
        if (abs(y) < centerThreshold) continue;  // Skip center
        
        // Draw dash
        painter->setTransform(originalTransform);
        const float height = (abs(remainder(y, 0.5f)) < numberThreshold) ? largeTickHeight : smallTickHeight;
        painter->drawLine(QPointF(-height, y), QPointF(height, y));
        
        // Add label for whole numbers only
        if (abs(remainder(y, 1.0f)) < numberThreshold) {
            painter->setTransform(labelTransform);
            const float horizontalOffset = y < 0 ? negativeCyanHorizontalOffset : positiveCyanHorizontalOffset;
            painter->drawText(QPointF(y*100 + horizontalOffset, textVerticalPos), QString::number(y, 'g', 2));
        }
    }
    
    // --- AXIS LABELS ---
    // X axis label
    painter->setPen(xColor);
    painter->setTransform(labelTransform);
    painter->drawText(QPointF(-axisLabelOffsets, -axisLabelOffsets), "x");
    
    // Y axis label - rotate text to be readable from left to right
    painter->setPen(yColor);
    QTransform yLabelTransform = originalTransform;
    yLabelTransform.scale(labelScale, -labelScale);
    yLabelTransform.rotate(-90);
    painter->setTransform(yLabelTransform);
    painter->drawText(QPointF(axisLabelOffsets, axisLabelOffsets), "y");  // Changed position to positive offsets
    
    painter->restore();
}

void FieldWidget::drawBackground(QPainter *painter, const QRectF &rect)
{
    const world::Geometry &geometry = m_usingVirtualField ? m_virtualFieldGeometry : m_drawScenes[m_currentScene].geometry;
    painter->save();

    const float fieldWidth = geometry.field_width();
    const float fieldHeight = geometry.field_height();
    const float goalWidth = geometry.goal_width();
    const float goalWallWidth = geometry.goal_wall_width();
    const float halfFieldWidth = fieldWidth / 2.0f;
    const float halfFieldHeight = fieldHeight / 2.0f;
    const float halfGoalWidth = goalWidth / 2.0f;

    QRectF rect1;
    rect1.setLeft(-halfFieldWidth);
    rect1.setTop(-halfFieldHeight);
    rect1.setWidth(fieldWidth);
    rect1.setHeight(fieldHeight);

    const float boundaryWidth = geometry.boundary_width();
    const float offset = boundaryWidth + 0.025f;
    const QRectF rect2 = rect1.adjusted(-offset, -offset, offset, offset);

    if (m_actionAntialiasing->isChecked()) {
        painter->setRenderHint(QPainter::Antialiasing);
    }
    painter->fillRect(rect, palette().brush(QPalette::Base));

    // field
    painter->setPen(QPen(Qt::white, 0.05, Qt::SolidLine, Qt::SquareCap, Qt::MiterJoin));
    painter->setBrush(QColor(0,60,0));
    painter->drawRect(rect2);

    // corner blocks
    painter->setPen(Qt::NoPen);
    painter->setBrush(Qt::white);
    for (const float xSign : { -1, 1 }) {
        for (const float ySign : { -1, 1 }) {
            const float wf = halfFieldWidth + boundaryWidth;
            const float hf = halfFieldHeight + geometry.boundary_width_goal_line();
            const QPointF corner[] = {
                QPointF{xSign * wf, ySign * hf},
                QPointF{xSign * (wf - m_cornerBlockCathetusLength), ySign * hf},
                QPointF{xSign * wf, ySign * (hf - m_cornerBlockCathetusLength)},
            };
            painter->drawConvexPolygon(corner, 3);

            const float wg = halfGoalWidth + goalWallWidth;
            const QPointF goal[] = {
                QPointF{xSign * wg, ySign * hf},
                QPointF{xSign * (wg + m_cornerBlockCathetusLength), ySign * hf},
                QPointF{xSign * wg, ySign * (hf - m_cornerBlockCathetusLength)},
            };
            painter->drawConvexPolygon(goal, 3);
        }
    }

    painter->setPen(QPen(Qt::white, 0));
    painter->setBrush(Qt::NoBrush);

    // draw field lines twice
    // first with a cosmetic pen
    // and again with a two dimensional pen
    if (!m_isExportingScreenshot) {
        // do not render cosmetic lines when exporting to SVG
        // these lines create issues when inkscape processes them, making the result unusable
        drawLines(painter, rect1, true);
    }
    drawLines(painter, rect1, false);

    // penalty points
    painter->setPen(Qt::NoPen);
    painter->setBrush(Qt::white);
    painter->drawEllipse(QPointF(0, halfFieldHeight - geometry.penalty_spot_from_field_line_dist()), 0.01, 0.01);
    painter->drawEllipse(QPointF(0, -halfFieldHeight + geometry.penalty_spot_from_field_line_dist()), 0.01, 0.01);


    if (m_showCoordinateAxes) {
        drawCoordinateAxes(painter, rect2);
    }

    painter->restore();
}

void FieldWidget::drawLines(QPainter *painter, QRectF rect, bool cosmetic)
{
    const world::Geometry &geometry = m_usingVirtualField ? m_virtualFieldGeometry : m_drawScenes[m_currentScene].geometry;
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

    drawGoalSubstitutionArea(painter, geometry);

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
    const world::Geometry &geometry = m_usingVirtualField ? m_virtualFieldGeometry : m_drawScenes[m_currentScene].geometry;
    QPainterPath path;

    const float d = cosmetic ? 0 : geometry.goal_wall_width() / 2.0f;
    const float h = geometry.field_height() / 2.0f;
    const float w = geometry.goal_width() / 2.0f + d;
    path.moveTo( w, side * h);
    path.lineTo( w, side * (h + geometry.boundary_width_goal_line() + d));
    path.lineTo(-w, side * (h + geometry.boundary_width_goal_line() + d));
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
        const auto &geometry = m_drawScenes[m_currentScene].geometry;
        const float scale = 100;
        const float width = scale * geometry.field_height();
        const float height = scale * geometry.field_width();
        const QRectF outputRect{-width / 2, -height / 2, width, height};
        file.setViewBox(outputRect);
        file.setTitle("Ra screenshot");
        QPainter painter(&file);
        m_isExportingScreenshot = true;
        render(&painter, outputRect, drawRect);
        m_isExportingScreenshot = false;

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

void FieldWidget::saveSituationLua()
{
    const Status &status = m_drawScenes[m_currentScene].lastWorldState[m_trackingFrom];
    if (status.isNull()) {
        return;
    }
    const world::State& worldState = status->has_execution_state() ? status->execution_state() : status->world_state();
    ::saveSituation(worldState, m_gameState);
}

void FieldWidget::saveSituationTypescript(int trackingFromInt)
{
    auto trackingFrom = static_cast<TrackingFrom>(trackingFromInt);
    const Status &status = m_drawScenes[m_currentScene].lastWorldState[trackingFrom];
    if (status.isNull()) {
        return;
    }
    const world::State& worldState = status->has_execution_state() ? status->execution_state() : status->world_state();
    const amun::GameState gameState = status->has_execution_game_state() ? status->execution_game_state() : m_gameState;
    ::saveSituationTypescript(trackingFrom, worldState, gameState, m_drawScenes[m_currentScene].geometry, m_teamBlue, m_teamYellow);
}

void FieldWidget::restoreSituation()
{
    QList<int> yellowIds;
    for (const auto &robot : m_lastSimulatorState.yellow_robots()) {
        yellowIds.append(robot.id());
    }
    QList<int> blueIds;
    for (const auto &robot : m_lastSimulatorState.blue_robots()) {
        blueIds.append(robot.id());
    }
    emit selectRobots(yellowIds, blueIds);
    Command command(new amun::Command);
    command->mutable_simulator()->mutable_set_simulator_state()->CopyFrom(m_lastSimulatorState);
    emit sendCommand(command);
}

void FieldWidget::ballPlacement(bool blue)
{
    float flipFactor = m_flipped && !m_usingVirtualField ? -1.0f : 1.0f;
    emit sendPlaceBall(blue, m_mouseBegin.y() * flipFactor * 1000.0f, -m_mouseBegin.x() * flipFactor * 1000.0f);
    m_referee.set_command(blue ? SSL_Referee::BALL_PLACEMENT_BLUE : SSL_Referee::BALL_PLACEMENT_YELLOW);
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
    m_worldState.append(m_drawScenes[m_currentScene].lastWorldState[m_trackingFrom]);
    updateDetection();
}

void FieldWidget::setShowCoordinateAxes(bool show) {
    if (m_showCoordinateAxes != show) {
        m_showCoordinateAxes = show;
        // Force a full redraw of the field
        scene()->update();
        // Also update the viewport to ensure the change is visible
        viewport()->update();
        resetCachedContent();  // Clear any cached content to ensure fresh redraw
    }
}

void FieldWidget::setShowVision(bool enable)
{
    m_showVision = enable;
    m_worldState.append(m_drawScenes[m_currentScene].lastWorldState[m_trackingFrom]);
    updateDetection();
}

void FieldWidget::setShowTruth(bool enable)
{
    m_showTruth = enable;
    m_worldState.append(m_drawScenes[m_currentScene].lastWorldState[m_trackingFrom]);
    updateDetection();
}

void FieldWidget::switchScene(int scene)
{
    while (scene >= m_drawScenes.size()) {
        m_drawScenes.resize(m_drawScenes.size() + 1);
        geometrySetDefault(&m_drawScenes.back().geometry);
    }
    m_currentScene = scene;

    m_geometryUpdated = true;
    updateGeometry();

    m_visualizationsUpdated = true;
    updateVisualizations();

    if (!m_drawScenes[m_currentScene].lastWorldState[m_trackingFrom].isNull()
            && (m_drawScenes[m_currentScene].lastWorldState[m_trackingFrom]->has_world_state()
                || m_drawScenes[m_currentScene].lastWorldState[m_trackingFrom]->has_execution_state())) {
        m_worldState.append(m_drawScenes[m_currentScene].lastWorldState[m_trackingFrom]);
        updateDetection();
    }
}

void FieldWidget::setScrollSensitivity(float sensitivity) {
    m_scrollSensitivity = sensitivity;
}
