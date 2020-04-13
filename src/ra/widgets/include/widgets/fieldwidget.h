/***************************************************************************
 *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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

#ifndef FIELDWIDGET_H
#define FIELDWIDGET_H

#include "core/fieldtransform.h"
#include "protobuf/command.h"
#include "protobuf/status.h"
#include "protobuf/ssl_referee.h"
#include <QGraphicsView>
#include <QMap>
#include <QHash>
#include <QLinkedList>

class GuiTimer;
class QLabel;
class QMenu;
class QGestureEvent;
struct VirtualFieldConfiguration;

enum class TrackingFrom{BOTH, REFEREE, YELLOW, BLUE};

class FieldWidget : public QGraphicsView
{
    Q_OBJECT

private:
    struct Robot
    {
        Robot() : robot(nullptr), id(nullptr) {}
        QGraphicsPathItem *robot;
        QGraphicsSimpleTextItem *id;
        bool visible;

        void tryHide();
        void show();
    };

    typedef QMultiMap<qint64, QGraphicsEllipseItem *> TraceMap;
    struct Trace
    {
        TraceMap traces;
        QLinkedList<QGraphicsEllipseItem *> staged;
        QLinkedList<QGraphicsEllipseItem *> invalid;
        QColor color;
        float z_index;
    };

    typedef QMap<uint, Robot> RobotMap;
    enum DragType {
        DragNone =          0x00,
        DragBall =          0x10,
        DragYellow =        0x20,
        DragBlue =          0x21,
        DragTopLeft =       0x40,
        DragTopRight =      0x41,
        DragBottomLeft =    0x42,
        DragBottomRight =   0x43,
        DragAOIMask =       0x40,
        DragMeasure =       0x80,
    };

public:
    explicit FieldWidget(QWidget *parent = nullptr);
    ~FieldWidget() override;
    FieldWidget(const FieldWidget&) = delete;
    FieldWidget& operator=(const FieldWidget&) = delete;

    void setHorusMode(bool enable);

signals:
    void sendCommand(const Command &command);
    void fileDropped(const QString &fileName);
    void robotDoubleClicked(bool teamIsBlue, int robotId);
    void robotCtrlClicked(bool teamIsBlue, int robotId);

public slots:
    void handleStatus(const Status &status);
    void visualizationsChanged(const QStringList &items);
    void clearData();
    void clearTraces();
    void hideVisualizationToggles();
    void saveConfig();
    void enableDragMeasure(bool enable) { m_enableDragMeasure = enable; }
    void toggleStrategyVisualizations();
    void setRegularVisualizationsEnabled(bool blue, bool enabled);

protected:
    void keyPressEvent(QKeyEvent *event) override;
    void mousePressEvent(QMouseEvent *event) override;
    void mouseMoveEvent(QMouseEvent *event) override;
    void mouseReleaseEvent(QMouseEvent *event) override;
    void mouseDoubleClickEvent(QMouseEvent *event) override;
    void wheelEvent(QWheelEvent *) override;
    void resizeEvent(QResizeEvent *event) override;
    bool gestureEvent(QGestureEvent *event);
    bool viewportEvent(QEvent *event) override;
    void drawBackground(QPainter *painter, const QRectF &rect) override;
    void leaveEvent(QEvent *event) override;
    bool event(QEvent *event) override;
    void dragEnterEvent(QDragEnterEvent *event) override;
    void dragMoveEvent(QDragMoveEvent *event) override;
    void dragLeaveEvent(QDragLeaveEvent *event) override;
    void dropEvent(QDropEvent *event) override;

    void setInfoText(const QString &str);
private slots:
    void updateVisualizationVisibility();
    void updateTracesVisibility();
    void setHorizontal();
    void setVertical();
    void flipField();
    void setAntialiasing(bool enable);
    void setOpenGL(bool enable);
    void updateAll();
    void setAOIVisible(bool visible);
    void virtualFieldSetupDialog();
    void takeScreenshot();
    void saveSituation();
    void ballPlacementBlue();
    void ballPlacementYellow();

    void setTrackingFrom(int newViewPoint);

private:
    void addToggleVisAction();
    void createInfoText();
    void resizeAOI(QPointF pos);
    void updateAOI();
    void updateDetection();
    void updateGeometry();
    void updateInfoText();
    void updateVisualizations();
    void updateVisualizations(const amun::DebugValues &v);
    void clearTeamData(RobotMap &team);
    void updateTeam(RobotMap &team, QHash<uint, robot::Specs> &specsMap, const robot::Team &specs);
    void setBall(const world::Ball &ball);
    void addBallTrace(qint64 time, const world::Ball &ball);
    void setRobot(const world::Robot &robot, const robot::Specs &specs, RobotMap &robots, const QColor &color);
    void addBlob(float x, float y, const QBrush &brush, QGraphicsItem *parent);
    void addRobotTrace(qint64 time, const world::Robot &robot, Trace &robotTrace, Trace &robotRawTrace);
    void showWholeField();
    void setFieldOrientation(float rotation);
    void sendRobotMoveCommands(const QPointF &p);
    void sendSimulatorTeleportBall(const QPointF &p);
    void drawLines(QPainter *painter, QRectF rect, bool cosmetic);
    void drawGoal(QPainter *painter, float side, bool cosmetic);
    QGraphicsItem* createCircle(const QPen &pen, const QBrush &brush, const amun::Visualization &vis);
    QGraphicsItem* createPolygon(const QPen &pen, const QBrush &brush, const amun::Visualization &vis);
    QGraphicsItem* createPath(const QPen &pen, const QBrush &brush, const amun::Visualization &vis);

    void invalidateTraces(Trace &trace, TraceMap::iterator begin, TraceMap::iterator end);
    void invalidateTraces(Trace &trace, qint64 time);
    void finishInvalidateTraces(Trace &trace);
    void addTrace(Trace &trace, const QPointF &pos, qint64 time);
    void clearTrace(Trace &trace);
    void clearBallTraces();
    void clearRobotTraces();
    void ballPlacement(bool blue);
    QGraphicsPathItem *createAoiItem(unsigned int transparency);

private:
    QGraphicsScene *m_scene;
    GuiTimer *m_guiTimer;

    QMenu *m_contextMenu;
    QAction *m_actionShowBlueVis;
    QAction *m_actionShowBlueReplayVis;
    QAction *m_actionShowYellowVis;
    QAction *m_actionShowYellowReplayVis;
    QAction *m_actionShowControllerVis;
    QAction *m_actionShowBallTraces;
    QAction *m_actionShowRobotTraces;
    QAction *m_actionBallPlacementBlue;
    QAction *m_actionBallPlacementYellow;
    QAction *m_actionAntialiasing;
    QAction *m_actionGL;

    std::string m_geometryString;
    bool m_geometryUpdated;
    world::Geometry m_geometry;
    world::Geometry m_virtualFieldGeometry;
    bool m_usingVirtualField;
    float m_rotation;
    QRectF m_fieldRect;
    QRectF m_realFieldRect;
    QRectF m_aoi;
    QGraphicsPathItem *m_aoiItem;
    QGraphicsPathItem *m_virtualFieldAoiItem;
    QRectF m_virtualFieldAoi;

    QHash<uint, robot::Specs> m_teamBlue;
    QHash<uint, robot::Specs> m_teamYellow;
    QList<Status> m_worldState;
    Status m_lastWorldState;
    QMap<int, bool> m_visibleVisSources;
    // save status to avoid copying the debug values
    QMap<int, Status> m_visualizations;
    QMap<int, int> m_debugSourceCounter;
    bool m_visualizationsUpdated;
    amun::GameState m_gameState;

    QGraphicsEllipseItem *m_ball;
    QStringList m_visibleVisualizations;
    typedef QList<QGraphicsItem*> Items;
    Items m_visualizationItems;
    RobotMap m_robotsBlue;
    RobotMap m_robotsYellow;

    Trace m_ballTrace;
    Trace m_ballRawTrace;
    Trace m_robotYellowTrace;
    Trace m_robotYellowRawTrace;
    Trace m_robotBlueTrace;
    Trace m_robotBlueRawTrace;

    bool m_infoTextUpdated;
    QString m_infoText;
    QGraphicsTextItem *m_infoTextItem;

    Qt::GestureType m_touchStatusType;
    bool m_hasTouchInput;
    QPointF m_mouseBegin;
    QPoint m_dragStart;
    DragType m_dragType;
    QPoint m_mousePosition;
    QGraphicsItem *m_dragItem;
    int m_dragId;

    bool m_isLogplayer;
    bool m_enableDragMeasure;
    bool m_flipped;

    SSL_Referee m_referee;
    std::unique_ptr<VirtualFieldConfiguration> m_virtualFieldConfiguration;
    FieldTransform m_virtualFieldTransform;

    TrackingFrom m_trackingFrom;
};

#endif // FIELDWIDGET_H
