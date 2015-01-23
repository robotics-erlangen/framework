/***************************************************************************
 *   Copyright 2015 Michael Eischer, Jan Kallwies, Philipp Nordhus         *
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

#include "leaffilterproxymodel.h"
#include "plotter.h"
#include "plot.h"
#include "ui_plotter.h"
#include "google/protobuf/descriptor.h"
#include "protobuf/status.pb.h"
#include <cmath>
#include <QComboBox>
#include <QMenu>
#include <QSettings>
#include <QTimer>

Plotter::Plotter() :
    QWidget(nullptr, Qt::Window),
    ui(new Ui::Plotter),
    m_startTime(0),
    m_freeze(false)
{
    setWindowIcon(QIcon("icon:plotter.svg"));
    ui->setupUi(this);

    // proxy model for tree filtering
    m_proxy = new LeafFilterProxyModel(this);
    m_proxy->setFilterCaseSensitivity(Qt::CaseInsensitive);
    m_proxy->setSourceModel(&m_model);
    ui->tree->setUniformRowHeights(true);
    ui->tree->setModel(m_proxy);
    connect(ui->lineSearch, SIGNAL(textChanged(QString)), m_proxy, SLOT(setFilterFixedString(QString)));

    // root items in the plotter
    addRootItem("Ball", "Ball");
    addRootItem("Yellow", "Yellow robots");
    addRootItem("YellowStrategy", "Yellow strategy");
    addRootItem("Blue", "Blue robots");
    addRootItem("BlueStrategy", "Blue strategy");
    addRootItem("RadioCommand", "Radio commands");
    addRootItem("RadioResponse", "Radio responses");
    addRootItem("Timing", "Timing");

    ui->tree->expandAll(); // expands the root items, thus childs are immediatelly visible once added
    connect(&m_model, SIGNAL(itemChanged(QStandardItem*)), SLOT(itemChanged(QStandardItem*)));

    // connect freeze
    connect(ui->btnFreeze, SIGNAL(toggled(bool)), this, SLOT(setFreeze(bool)));

    // connect the plot widget
    m_timeLimit = ui->spinDuration->maximum();
    connect(ui->spinYMin, SIGNAL(valueChanged(double)), ui->widget, SLOT(setYMin(double)));
    connect(ui->spinYMax, SIGNAL(valueChanged(double)), ui->widget, SLOT(setYMax(double)));
    connect(ui->spinDuration, SIGNAL(valueChanged(double)), ui->widget, SLOT(setDuration(double)));
    connect(this, SIGNAL(addPlot(const Plot*)), ui->widget, SLOT(addPlot(const Plot*)));
    connect(this, SIGNAL(removePlot(const Plot*)), ui->widget, SLOT(removePlot(const Plot*)));
    // connect the time axis scroll bar
    // scrolling creates a negative time offset
    ui->timeScroll->setMaximum(0);
    ui->timeScroll->setValue(0); // scroll to the latest values
    connect(ui->spinDuration, SIGNAL(valueChanged(double)), SLOT(updateScrollBar()));
    connect(ui->timeScroll, SIGNAL(valueChanged(int)), SLOT(updateOffset(int)));
    updateScrollBar();
    // redirect scroll events on the widget
    ui->widget->installEventFilter(this);

    // setup context menu for plot list
    m_plotMenu = new QMenu(this);
    QAction *actionClear = new QAction("Clear selection", m_plotMenu);
    connect(actionClear, SIGNAL(triggered()), this, SLOT(clearSelection()));
    m_plotMenu->addAction(actionClear);

    ui->tree->setContextMenuPolicy(Qt::CustomContextMenu);
    connect(ui->tree, SIGNAL(customContextMenuRequested(QPoint)), this, SLOT(plotContextMenu(QPoint)));

    // restore geometry
    QSettings s;
    s.beginGroup("Plotter");
    restoreGeometry(s.value("geometry").toByteArray());
    ui->splitter->restoreState(s.value("splitter").toByteArray());
    ui->tree->header()->restoreState(s.value("tree").toByteArray());
    s.endGroup();

    // setup invalidate timer
    QTimer *timer = new QTimer(this);
    connect(timer, SIGNAL(timeout()), SLOT(invalidatePlots()));
    timer->start(1000);

    loadSelection();
}

Plotter::~Plotter()
{
    delete ui;
}

void Plotter::closeEvent(QCloseEvent *event)
{
    QSettings s;
    s.beginGroup("Plotter");
    s.setValue("geometry", saveGeometry());
    s.setValue("splitter", ui->splitter->saveState());
    s.setValue("tree", ui->tree->header()->saveState());
    s.setValue("visible", QStringList(m_selection.toList()));
    s.endGroup();

    QWidget::closeEvent(event);
}

void Plotter::addRootItem(const QString &name, const QString &displayName)
{
    QStandardItem *item = new QStandardItem(displayName);
    m_model.appendRow(item);
    m_items[name] = item;
}

void Plotter::loadSelection()
{
    QSettings s;
    s.beginGroup("Plotter");

    m_selection.clear();
    foreach (const QString &s, s.value("visible").toStringList()) {
        m_selection.insert(s);
    }

    s.endGroup();
}

void Plotter::plotContextMenu(const QPoint &pos)
{
    m_plotMenu->popup(ui->tree->mapToGlobal(pos));
}

void Plotter::clearSelection()
{
    foreach (QStandardItem *item, m_items) {
        // only modify checked plots
        if (item->isCheckable() && item->checkState() == Qt::Checked) {
            item->setCheckState(Qt::Unchecked);
        }
    }
    // clear selection afterwards, as the itemChanged won't fire otherwise
    m_selection.clear();
}

void Plotter::updateScrollBar()
{
    double duration = ui->spinDuration->value();

    // max - min + pageStep = full time scale
    ui->timeScroll->setMinimum(-(m_timeLimit - duration)*100);
    ui->timeScroll->setSingleStep(duration*10); // scroll a tenth of the screen width
    ui->timeScroll->setPageStep(duration*100);
}

void Plotter::updateOffset(int pos)
{
    // divide by 100 to allow fine scrolling
    ui->widget->setOffset(pos / 100.);
}

bool Plotter::eventFilter(QObject *obj, QEvent *event)
{
    if (event->type() == QEvent::Wheel) {
        // forward scroll events to scrollbar
        ui->timeScroll->event(event);
        return true;
    } else {
        // standard event processing
        return QObject::eventFilter(obj, event);
    }
}

void Plotter::setFreeze(bool freeze)
{
    if (!freeze && m_freeze) {
        // merge plots on unfreezing
        foreach (QStandardItem *item, m_items) {
            QVariant fplot = item->data(Plotter::FreezePlotRole);
            if (!fplot.isValid()) {
                continue;
            }
            // remove freeze plot entry
            item->setData(QVariant(), Plotter::FreezePlotRole);

            QVariant pplot = item->data(Plotter::PlotRole);
            if (pplot.isValid()) { // merge freeze plot if there's already a plot
                Plot *freezePlot = fplot.value<Plot*>();
                Plot *plot = pplot.value<Plot*>();
                plot->mergeFrom(freezePlot);
                delete freezePlot;
            } else { // otherwise reuse it as plot
                item->setData(fplot, Plotter::PlotRole);
            }
        }
    }
    m_freeze = freeze;
    ui->btnFreeze->setChecked(freeze); // update button
}

void Plotter::handleStatus(const Status &status)
{
    // don't consume cpu while closed
    if (!isVisible())
        return;

    m_time = status->time();
    // normalize time to be able to store it in floats
    if (m_startTime == 0)
        m_startTime = status->time();

    const float time = (status->time() - m_startTime) / 1E9;

    // handle each message
    if (status->has_world_state()) {
        const world::State &worldState = status->world_state();
        float time = (worldState.time() - m_startTime) / 1E9;

        if (worldState.has_ball()) {
            parseMessage(worldState.ball(), "Ball", time);

            for (int i = 0; i < worldState.ball().raw_size(); i++) {
                const world::BallPosition &p = worldState.ball().raw(i);
                parseMessage(p, "Ball.raw", (p.time() - m_startTime) / 1E9);
            }
        }

        for (int i = 0; i < worldState.yellow_size(); i++) {
            const world::Robot &robot = worldState.yellow(i);
            parseMessage(robot, QString("Yellow.%1").arg(robot.id()), time);

            const QString rawParent = QString("Yellow.%1.raw").arg(robot.id());
            for (int i = 0; i < robot.raw_size(); i++) {
                const world::RobotPosition &p = robot.raw(i);
                parseMessage(p, rawParent, (p.time() - m_startTime) / 1E9);
            }
        }

        for (int i = 0; i < worldState.blue_size(); i++) {
            const world::Robot &robot = worldState.blue(i);
            parseMessage(robot, QString("Blue.%1").arg(robot.id()), time);

            const QString rawParent = QString("Blue.%1.raw").arg(robot.id());
            for (int i = 0; i < robot.raw_size(); i++) {
                const world::RobotPosition &p = robot.raw(i);
                parseMessage(p, rawParent, (p.time() - m_startTime) / 1E9);
            }
        }

        for (int i = 0; i < worldState.radio_response_size(); i++) {
            const robot::RadioResponse &response = worldState.radio_response(i);
            const QString name = QString("%1-%2").arg(response.generation()).arg(response.id());
            const float responseTime = (response.time() - m_startTime) / 1E9;
            parseMessage(response, QString("RadioResponse.%1").arg(name), responseTime);
            parseMessage(response.estimated_speed(), QString("RadioResponse.%1.estimatedSpeed").arg(name), responseTime);
        }
    }

    for (int i = 0; i < status->radio_command_size(); i++) {
        const robot::RadioCommand &command = status->radio_command(i);
        const QString name = QString("%1-%2").arg(command.generation()).arg(command.id());

        const robot::Command &cmd = command.command();
        parseMessage(cmd, QString("RadioCommand.%1").arg(name), time);
        parseMessage(cmd.debug(), QString("RadioCommand.%1.debug").arg(name), time);
    }

    if (status->has_timing()) {
        const amun::Timing &timing = status->timing();
        parseMessage(timing, "Timing", time);
    }

    if (status->has_debug()) {
        const amun::DebugValues &debug = status->debug();
        // ignore controller as it can create plots via RadioCommand.%1.debug
        if (debug.source() != amun::Controller) {
            const QString parent = (debug.source() == amun::StrategyBlue) ? "BlueStrategy" : "YellowStrategy";
            // strategies can add plots with arbitrary names
            for (int i = 0; i < debug.plot_size(); ++i) {
                const amun::PlotValue &value = debug.plot(i);
                addPoint(QString::fromStdString(value.name()), parent, time, value.value());
            }
        }
    }

    // don't move plots during freeze
    if (!m_freeze) {
        ui->widget->update(time);
    }
}

QStandardItem* Plotter::getItem(const QString &name)
{
    // item already exists
    if (m_items.contains(name)) {
        return m_items[name];
    }

    int split = name.lastIndexOf(QChar('.'));
    if (split == -1) { // silently handle the case that the root item is missing
        addRootItem(name, name);
        return m_items[name];
    }

    // create new item and add it to the model
    const QString parentName = name.mid(0, split);
    const QString childName = name.mid(split + 1);
    QStandardItem *parent = getItem(parentName);
    QStandardItem *child = new QStandardItem(childName);
    child->setData(name, Plotter::FullNameRole);
    m_items[name] = child;
    parent->appendRow(child);
    return child;
}

void Plotter::invalidatePlots()
{
    if (!isVisible()) // values are'nt update while hidden
        return;

    const float time = (m_time - m_startTime) / 1E9;

    foreach (QStandardItem *item, m_items) {
        // check the role that is currently updated
        const int role = (m_freeze) ? Plotter::FreezePlotRole : Plotter::PlotRole;
        QVariant vplot = item->data(role);
        if (!vplot.isValid()) {
            continue;
        }
        Plot *plot = vplot.value<Plot*>();
        if (plot->time() + 5 < time) {
            // mark old plots
            item->setForeground(Qt::gray);
        }
    }
}

void Plotter::parseMessage(const google::protobuf::Message &message, const QString &parent, float time)
{
    const google::protobuf::Descriptor *desc = message.GetDescriptor();
    const google::protobuf::Reflection *refl = message.GetReflection();

    float v_f = NAN;
    float v_s = NAN;
    float v_x = NAN;
    float v_y = NAN;
    float v_d_x = NAN;
    float v_d_y = NAN;
    float v_ctrl_out_f = NAN;
    float v_ctrl_out_s = NAN;

    for (int i = 0; i < desc->field_count(); i++) {
        const google::protobuf::FieldDescriptor *field = desc->field(i);

        // check type and that the field exists
        if (field->cpp_type() == google::protobuf::FieldDescriptor::CPPTYPE_FLOAT
                && refl->HasField(message, field)) {
            const QString name = QString::fromStdString(field->name());
            const float value = refl->GetFloat(message, field);
            if (name == "v_f") {
                v_f = value;
            } else if (name == "v_s") {
                v_s = value;
            } else if (name == "v_desired_x") {
                v_d_x = value;
            } else if (name == "v_desired_y") {
                v_d_y = value;
            } else if (name == "v_ctrl_out_f") {
                v_ctrl_out_f = value;
            } else if (name == "v_ctrl_out_s") {
                v_ctrl_out_s = value;
            } else if (name == "v_x") {
                v_x = value;
            } else if (name == "v_y") {
                v_y = value;
            }

            addPoint(name, parent, time, value);
        } else if (field->cpp_type() == google::protobuf::FieldDescriptor::CPPTYPE_BOOL
                   && refl->HasField(message, field)) {
            const QString name = QString::fromStdString(field->name());
            const float value = refl->GetBool(message,field) ? 1 : 0;
            addPoint(name, parent, time, value);
        }
    }

    // add length of speed vectors
    tryAddLength("v_local", parent, time, v_f, v_s);
    tryAddLength("v_desired", parent, time, v_d_x, v_d_y);
    tryAddLength("v_ctrl_out", parent, time, v_ctrl_out_f, v_ctrl_out_s);
    tryAddLength("v_global", parent, time, v_x, v_y);
}

void Plotter::tryAddLength(const QString &name, const QString &parent, float time, float value1, float value2)
{
    // if both values are set
    if (!std::isnan(value1) && !std::isnan(value2)) {
        const float value = std::sqrt(value1 * value1 + value2 * value2);
        addPoint(name, parent, time, value);
    }
}

void Plotter::addPoint(const QString &name, const QString &parent, float time, float value)
{
    // full name for item retrieval
    const QString fullName = parent + "." + name;
    QStandardItem *item = getItem(fullName);

    // save data into a hidden plot while freezed
    const int role = (m_freeze) ? Plotter::FreezePlotRole : Plotter::PlotRole;
    QVariant vplot = item->data(role);
    Plot *plot;

    if (vplot.isValid()) { // plot exists
        plot = vplot.value<Plot*>();
    } else { // create new plot
        plot = new Plot(fullName, this);
        item->setCheckable(true);
        if (m_selection.contains(fullName)) {
            addPlot(plot); // manually add plot as itemChanged won't add it
            item->setCheckState(Qt::Checked);
        } else {
            item->setCheckState(Qt::Unchecked);
        }
        // set plot information after the check state
        // itemChanged only checks items with valid PlotRole
        // thus no enable / disable flickering will occur
        item->setData(qVariantFromValue(plot), role);
    }
    // only clear foreground if it's set, causes a serious performance regression
    // if it's always done
    if (item->data(Qt::ForegroundRole).isValid()) {
        item->setData(QVariant(), Qt::ForegroundRole); // clear foreground color
    }
    plot->addPoint(time, value);
}

void Plotter::clearData()
{
    // delete everything
    foreach (QStandardItem *item, m_items) {
        // just drop the freeze plot
        QVariant fplot = item->data(Plotter::FreezePlotRole);
        if (fplot.isValid()) {
            delete fplot.value<Plot*>();
            item->setData(Plotter::FreezePlotRole);
        }

        QVariant pplot = item->data(Plotter::PlotRole);
        if (pplot.isValid()) {
            Plot *plot = pplot.value<Plot*>();
            plot->clearData();
        }
    }
    // force unfreeze as no more data is available
    setFreeze(false);
}

void Plotter::itemChanged(QStandardItem *item)
{
    // always use PlotRole as that's what governs which plot to display
    QVariant vplot = item->data(Plotter::PlotRole);
    if (vplot.isValid()) {
        Plot *plot = vplot.value<Plot*>();
        const QString name = item->data(Plotter::FullNameRole).toString();
        if (item->checkState() == Qt::Checked) {
            // only add plot if it isn't in our selection yet
            if (!m_selection.contains(name)) {
                addPlot(plot);
                m_selection.insert(name);
            }
        } else {
            // same for remove
            if (m_selection.remove(name)) {
                removePlot(plot);
            }
        }
    }
}
