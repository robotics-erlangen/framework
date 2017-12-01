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

#include "config/config.h"
#include "protobuf/robot.pb.h"
#include "robotselectionwidget.h"
#include "robotspecsdialog.h"
#include "robotwidget.h"
#include "ui_robotselectionwidget.h"
#include <google/protobuf/text_format.h>
#include <QDebug>
#include <QDir>
#include <QSettings>
#include <QStyledItemDelegate>

static const int DATA_GENERATION_ID = Qt::UserRole + 1;
static const int DATA_ROBOT_ID = Qt::UserRole + 2;

struct RobotSelectionWidget::Generation
{
    struct Robot
    {
        RobotWidget::Team team;
        robot::Specs specs;
    };

    QString filename;
    robot::Specs def;
    QMap<unsigned int, Robot> robots;
};

class ItemDelegate : public QStyledItemDelegate
{
public:
    ItemDelegate(InputManager *inputManager, const RobotSelectionWidget *widget);
    QWidget* createEditor(QWidget *parent, const QStyleOptionViewItem &option, const QModelIndex &index) const override;

private:
    InputManager *m_inputManager;
    const RobotSelectionWidget *m_widget;
};

ItemDelegate::ItemDelegate(InputManager *inputManager, const RobotSelectionWidget *widget) :
    m_inputManager(inputManager),
    m_widget(widget)
{

}

QWidget *ItemDelegate::createEditor(QWidget *parent, const QStyleOptionViewItem &option, const QModelIndex &index) const
{
    (void)option;
    const bool is_generation = index.data(DATA_ROBOT_ID).isNull();
    RobotWidget *widget = new RobotWidget(m_inputManager, is_generation, parent);
    widget->setSpecs(m_widget->specs(index));
    if (is_generation) {
        connect(m_widget, SIGNAL(generationChanged(uint,RobotWidget::Team)), widget, SLOT(generationChanged(uint,RobotWidget::Team)));
        connect(widget, SIGNAL(teamSelected(uint,uint,RobotWidget::Team)), m_widget, SLOT(selectTeamForGeneration(uint,uint,RobotWidget::Team)));
        connect(widget, SIGNAL(inputDeviceSelected(uint,QString)), m_widget, SLOT(selectInputDeviceForGeneration(uint,QString)));
    } else {
        connect(m_widget, SIGNAL(setTeam(uint,uint,RobotWidget::Team)), widget, SLOT(setTeam(uint,uint,RobotWidget::Team)));
        // the response includes generation and robot id, thus just broadcast it to everyone
        connect(m_widget, SIGNAL(sendRadioResponse(robot::RadioResponse)), widget, SLOT(handleResponse(robot::RadioResponse)));
        connect(widget, SIGNAL(teamSelected(uint,uint,RobotWidget::Team)), m_widget, SLOT(selectTeam(uint,uint,RobotWidget::Team)));
        connect(m_widget, SIGNAL(setInputDevice(uint,uint,QString)), widget, SLOT(setInputDevice(uint,uint,QString)));
        connect(m_widget, SIGNAL(setRobotExchangeIcon(uint,uint,bool)), widget, SLOT(exchangeRobot(uint,uint,bool)));
    }
    return widget;
}

RobotSelectionWidget::RobotSelectionWidget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::RobotSelectionWidget),
    m_itemDelegate(NULL)
{
    ui->setupUi(this);

    m_model = new QStandardItemModel(this);
    ui->robots->setModel(m_model);
    connect(ui->robots, SIGNAL(doubleClicked(QModelIndex)), SLOT(showConfigDialog(QModelIndex)));
}

RobotSelectionWidget::~RobotSelectionWidget()
{
    QSettings s;
    s.beginGroup("Robots");
    s.beginWriteArray("Generations");
    int i = 0;
    for (int r = 0; r < m_model->rowCount(); r++) {
        const QModelIndex index = m_model->index(r, 0);
        s.setArrayIndex(i++);
        s.setValue("ID", index.data(DATA_GENERATION_ID));
        s.setValue("Hidden", !ui->robots->isExpanded(index));
    }
    s.endArray();
    s.endGroup();

    s.beginGroup("Strategy");
    s.setValue("RecentScripts", m_recentScripts);
    s.endGroup();

    saveRobots("BlueTeam", RobotWidget::Blue);
    saveRobots("YellowTeam", RobotWidget::Yellow);

    delete ui;
    delete m_itemDelegate;
}

void RobotSelectionWidget::shutdown()
{
    ui->yellow->shutdown();
    ui->blue->shutdown();
}

void RobotSelectionWidget::init(QWidget *window, InputManager *inputManager)
{
    connect(window, SIGNAL(gotStatus(Status)), SLOT(handleStatus(Status)));

    connect(window, SIGNAL(gotStatus(Status)), ui->blue, SLOT(handleStatus(Status)));
    connect(ui->blue, SIGNAL(sendCommand(Command)), window, SLOT(sendCommand(Command)));
    connect(window, SIGNAL(gotStatus(Status)), ui->yellow, SLOT(handleStatus(Status)));
    connect(ui->yellow, SIGNAL(sendCommand(Command)), window, SLOT(sendCommand(Command)));

    ui->blue->init(true);
    ui->yellow->init(false);

    m_itemDelegate = new ItemDelegate(inputManager, this);
    ui->robots->setItemDelegate(m_itemDelegate);
}

void RobotSelectionWidget::load()
{
    QSettings s;
    s.beginGroup("Strategy");
    m_recentScripts = s.value("RecentScripts").toStringList();
    s.endGroup();

    sanitizeRecentScripts();
    ui->blue->setRecentScripts(&m_recentScripts);
    ui->yellow->setRecentScripts(&m_recentScripts);

    loadRobots();

    ui->blue->load();
    ui->yellow->load();
}

void RobotSelectionWidget::sanitizeRecentScripts()
{
    QStringList recentScripts;
    for (QString script: m_recentScripts) {
        QFileInfo file(script);
        if (file.exists() && file.fileName() == "init.lua") {
            recentScripts.append(script);
        }
    }
    m_recentScripts = recentScripts;
}

void RobotSelectionWidget::loadRobots()
{
    m_model->clear();
    m_generations.clear();

    QDir dir(QString("%1/robots").arg(ERFORCE_CONFDIR));
    foreach (const QString &file, dir.entryList(QStringList() << "*.txt", QDir::Files | QDir::Readable)) {
        Generation generation;
        generation.filename = dir.filePath(file);

        const robot::Generation g = loadGeneration(generation.filename);
        if (!validate(g)) {
            qDebug() << "Generation" << file << "is invalid!";
            continue;
        }

        generation.def = g.default_();
        for (int i = 0; i < g.robot_size(); i++) {
            const robot::Specs &specs = g.robot(i);
            Generation::Robot r;
            r.specs = specs;
            r.team = RobotWidget::NoTeam;
            generation.robots.insert(specs.id(), r);
        }

        m_generations.insert(g.default_().generation(), generation);
    }

    QSet<uint> hidden;
    QSettings s;
    s.beginGroup("Robots");
    const int size = s.beginReadArray("Generations");
    for (int i = 0; i < size; i++) {
        s.setArrayIndex(i);
        if (s.value("Hidden").toBool()) {
            hidden.insert(s.value("ID").toUInt());
        }
    }
    s.endArray();
    s.endGroup();

    QMapIterator<uint, Generation> it(m_generations);
    while (it.hasNext()) {
        it.next();

        const Generation &generation = it.value();

        QStandardItem *generation_item = new QStandardItem;
        generation_item->setData(it.key(), DATA_GENERATION_ID);
        generation_item->setEditable(false);
        m_model->appendRow(generation_item);
        ui->robots->openPersistentEditor(generation_item->index());

        foreach (const Generation::Robot &robot, generation.robots) {
            QStandardItem *item = new QStandardItem;
            item->setEditable(false);
            item->setData(robot.specs.id(), DATA_ROBOT_ID);
            item->setData(it.key(), DATA_GENERATION_ID);
//            item->setIcon(QIcon(QString("%1/icons/32/erforce.png").arg(ERFORCE_DATADIR)));
            generation_item->appendRow(item);

            ui->robots->openPersistentEditor(item->index());
        }

        if (!hidden.contains(it.key())) {
            ui->robots->expand(generation_item->index());
        }
    }

    loadRobots("BlueTeam", RobotWidget::Blue);
    loadRobots("YellowTeam", RobotWidget::Yellow);

    sendTeams();
}

void RobotSelectionWidget::loadRobots(const QString &group, RobotWidget::Team team)
{
    QSettings s;
    s.beginGroup(group);
    const int size = s.beginReadArray("Robots");
    for (int i = 0; i < size; i++) {
        s.setArrayIndex(i);
        const uint generation = s.value("Generation").toUInt();
        const uint id = s.value("ID").toUInt();
        if (m_generations.contains(generation)) {
            QMap<uint, Generation::Robot> &robots = m_generations[generation].robots;
            if (robots.contains(id)) {
                unsetTeam(id, generation, team);
                robots[id].team = team;
                emit setTeam(generation, id, team);
            }
        }
    }
    s.endArray();
    s.endGroup();

    updateGenerationTeam();
}

void RobotSelectionWidget::saveRobots(const QString &group, RobotWidget::Team team)
{
    QSettings s;
    s.beginGroup(group);
    s.beginWriteArray("Robots");
    int i = 0;
    foreach (const Generation &g, m_generations) {
        foreach (const Generation::Robot &robot, g.robots) {
            if (robot.team == team) {
                s.setArrayIndex(i++);
                s.setValue("Generation", g.def.generation());
                s.setValue("ID", robot.specs.id());
            }
        }
    }
    s.endArray();
    s.endGroup();
}

bool RobotSelectionWidget::validate(const robot::Generation &g)
{
    if (!g.default_().IsInitialized()) {
        return false;
    }

    const google::protobuf::Descriptor *desc = g.default_().GetDescriptor();
    const google::protobuf::Reflection *refl = g.default_().GetReflection();
    for (int i = 0; i < desc->field_count(); i++) {
        const google::protobuf::FieldDescriptor *field = desc->field(i);
        if (!refl->HasField(g.default_(), field)) {
            return false;
        }
    }

    return true;
}

robot::Generation RobotSelectionWidget::loadGeneration(const QString &filename)
{
    QFile file(filename);
    file.open(QFile::ReadOnly);
    QString str = file.readAll();
    file.close();
    std::string s = qPrintable(str);

    robot::Generation generation;
    google::protobuf::TextFormat::Parser parser;
    parser.AllowPartialMessage(true);
    parser.ParseFromString(s, &generation);

    return generation;
}

void RobotSelectionWidget::saveGeneration(const QString &filename, const robot::Generation &generation)
{
    std::string s;
    google::protobuf::TextFormat::PrintToString(generation, &s);

    QFile file(filename);
    file.open(QFile::WriteOnly | QFile::Truncate);
    file.write(s.data(), s.size());
}

void RobotSelectionWidget::sendTeams()
{
    Command command(new amun::Command);
    sendTeam(command->mutable_set_team_blue(), RobotWidget::Blue);
    sendTeam(command->mutable_set_team_yellow(), RobotWidget::Yellow);
    emit sendCommand(command);
}

void RobotSelectionWidget::sendTeam(robot::Team *t, RobotWidget::Team team)
{
    foreach (const Generation &g, m_generations) {
        foreach (const Generation::Robot &robot, g.robots) {
            if (robot.team == team) {
                t->add_robot()->CopyFrom(specs(robot.specs, g.def));
            }
        }
    }
}

void RobotSelectionWidget::save()
{
    foreach (const Generation &generation, m_generations) {
        robot::Generation g;
        g.mutable_default_()->CopyFrom(generation.def);
        foreach (const Generation::Robot &robot, generation.robots) {
            g.add_robot()->CopyFrom(robot.specs);
        }
        saveGeneration(generation.filename, g);
    }
}

void RobotSelectionWidget::forceAutoReload(bool force)
{
    ui->blue->forceAutoReload(force);
    ui->yellow->forceAutoReload(force);
}

robot::Specs RobotSelectionWidget::specs(const QModelIndex &index) const
{
    const uint generation_id = index.data(DATA_GENERATION_ID).toUInt();
    const uint id = index.data(DATA_ROBOT_ID).toUInt();

    const Generation &generation = m_generations[generation_id];
    if (generation.robots.contains(id)) {
        return specs(generation.robots.value(id).specs, generation.def);
    } else {
        return generation.def;
    }
}

robot::Specs RobotSelectionWidget::specs(const robot::Specs &robot, const robot::Specs &def)
{
    robot::Specs new_specs = def;
    new_specs.MergeFrom(robot);
    new_specs.set_generation(def.generation());
    new_specs.set_year(def.year());
    return new_specs;
}

void RobotSelectionWidget::handleStatus(const Status &status)
{
    if (status->has_world_state()) {
        const world::State &state = status->world_state();
        for (int i = 0; i < state.radio_response_size(); ++i) {
            sendRadioResponse(state.radio_response(i));
        }
    }

    if (status->has_debug()) {
        const amun::DebugValues &debug = status->debug();
        for (int i = 0;i<debug.robot_size();i++) {
            const amun::RobotValue &value = debug.robot(i);
            emit setRobotExchangeIcon(value.generation(), value.id(), value.exchange());
        }
    }
}

void RobotSelectionWidget::showConfigDialog(const QModelIndex &index)
{
    const uint generation_id = index.data(DATA_GENERATION_ID).toUInt();
    Generation &generation = m_generations[generation_id];

    if (index.data(DATA_ROBOT_ID).isNull()) {
        RobotSpecsDialog dialog(generation.def, this);
        if (dialog.exec() == QDialog::Accepted) {
            generation.def = dialog.specs();
            sendTeams();
            save();
        }
    } else {
        const uint id = index.data(DATA_ROBOT_ID).toUInt();
        Q_ASSERT(generation.robots.contains(id));

        RobotSpecsDialog dialog(generation.robots.value(id).specs, generation.def, this);
        if (dialog.exec() == QDialog::Accepted) {
            generation.robots[id].specs = dialog.specs();
            sendTeams();
            save();
        }
    }
}

void RobotSelectionWidget::selectTeam(uint generation, uint id, RobotWidget::Team team)
{
    if (m_generations.contains(generation)) {
        Generation &g = m_generations[generation];
        if (g.robots.contains(id)) {
            unsetTeam(id, generation, team);
            g.robots[id].team = team;
            updateGenerationTeam();
            sendTeams();
        }
    }
}

void RobotSelectionWidget::selectTeamForGeneration(uint generation, uint, RobotWidget::Team team)
{
    if (!m_generations.contains(generation)) {
        return;
    }
    Generation &g = m_generations[generation];
    QMutableMapIterator<uint, Generation::Robot> it(g.robots);
    int robotCounter = 0;
    while (it.hasNext()) {
        it.next();
        Generation::Robot &r = it.value();
        RobotWidget::Team t = team;
        if (team == RobotWidget::HalfHalf && robotCounter < g.robots.size() / 2) {
            t = RobotWidget::Blue;
        } else if (team == RobotWidget::HalfHalf) {
            t = RobotWidget::Yellow;
        }
        robotCounter++;
        unsetTeam(r.specs.id(), generation, t);
        r.team = t;
        emit setTeam(generation, r.specs.id(), t);
    }
    updateGenerationTeam();
    sendTeams();
}

void RobotSelectionWidget::selectInputDeviceForGeneration(uint generation, const QString &inputDevice)
{
    if (!m_generations.contains(generation)) {
        return;
    }
    const Generation &g = m_generations[generation];
    for (const Generation::Robot &r : g.robots) {
        emit setInputDevice(generation, r.specs.id(), inputDevice);
    }
}

void RobotSelectionWidget::unsetTeam(uint id, uint skip_generation, RobotWidget::Team team)
{
    QMutableMapIterator<uint, Generation> it(m_generations);
    while (it.hasNext()) {
        it.next();

        if (it.key() == skip_generation) {
            continue;
        }

        if (it.value().robots.contains(id) && it.value().robots[id].team == team) {
            it.value().robots[id].team = RobotWidget::NoTeam;
            emit setTeam(it.key(), id, RobotWidget::NoTeam);
        }
    }
}


void RobotSelectionWidget::updateGenerationTeam()
{
    foreach (const Generation &generation, m_generations) {
        bool none = false;
        bool blue = false;
        bool yellow = false;

        foreach (const Generation::Robot &r, generation.robots) {
            switch (r.team) {
            case RobotWidget::Blue:
                blue = true;
                break;

            case RobotWidget::Yellow:
                yellow = true;
                break;

            case RobotWidget::NoTeam:
                none = true;
                break;

            default:
                break;
            }
        }

        RobotWidget::Team team = RobotWidget::NoTeam;
        if (yellow && blue) {
            team = RobotWidget::Mixed;
        } else if (none && !yellow && blue) {
            team = RobotWidget::PartialBlue;
        } else if (none && yellow && !blue) {
            team = RobotWidget::PartialYellow;
        } else if (yellow) {
            team = RobotWidget::Yellow;
        } else if (blue) {
            team = RobotWidget::Blue;
        }
        emit generationChanged(generation.def.generation(), team);
    }
}
