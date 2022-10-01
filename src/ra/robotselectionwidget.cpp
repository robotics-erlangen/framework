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
    connect(m_widget, &RobotSelectionWidget::sendIsSimulator, widget, &RobotWidget::setIsSimulator);
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
    m_itemDelegate(nullptr),
    m_contentDisabled(false),
    m_isSimulator(false),
    m_isInitialized(false)
{
    ui->setupUi(this);

    m_model = new QStandardItemModel(this);
    ui->robots->setModel(m_model);
    connect(ui->robots, SIGNAL(doubleClicked(QModelIndex)), SLOT(showConfigDialog(QModelIndex)));
}

RobotSelectionWidget::~RobotSelectionWidget()
{
    saveConfig();

    delete ui;
    delete m_itemDelegate;
}

void RobotSelectionWidget::saveConfig()
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

    if (m_isSimulator) {
        saveRobots("SimulatorBlueTeam", RobotWidget::Blue);
        saveRobots("SimulatorYellowTeam", RobotWidget::Yellow);
        saveRobots("SimulatorSharedTeam", RobotWidget::Mixed);
    } else {
        saveRobots("BlueTeam", RobotWidget::Blue);
        saveRobots("YellowTeam", RobotWidget::Yellow);
    }
}

void RobotSelectionWidget::setColor(bool blue)
{
    bool changed = false;
    for (uint gen : m_generations.keys()) {
        Generation &generation = m_generations[gen];
        for (uint id : generation.robots.keys()) {
            RobotWidget::Team t = generation.robots[id].team;
            if (t == RobotWidget::Blue && !blue) {
                changed = true;
                generation.robots[id].team = RobotWidget::Yellow;
                emit setTeam(gen, id, RobotWidget::Yellow);
            } else if (t == RobotWidget::Yellow && blue) {
                changed = true;
                generation.robots[id].team = RobotWidget::Blue;
                emit setTeam(gen, id, RobotWidget::Blue);
            }
        }
    }
    if (changed) {
        sendTeams();
    }
}

void RobotSelectionWidget::enableContent(bool enable)
{
    ui->robots->viewport()->setEnabled(enable);
    m_contentDisabled = !enable;
}

void RobotSelectionWidget::init(QWidget *window, InputManager *inputManager)
{
    connect(window, SIGNAL(gotStatus(Status)), SLOT(handleStatus(Status)));

    m_itemDelegate = new ItemDelegate(inputManager, this);
    ui->robots->setItemDelegate(m_itemDelegate);
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

    loadRobotsFromGroup(m_isSimulator);
    sendTeams();

    emit sendIsSimulator(m_isSimulator);
}

void RobotSelectionWidget::loadRobots(const QString &group, RobotWidget::Team team, bool* hasRobot)
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
                if (hasRobot) {
                    *hasRobot = true;
                }
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

void RobotSelectionWidget::unsetAll()
{
    for (Generation &g : m_generations) {
        for (Generation::Robot &robot : g.robots) {
            robot.team = RobotWidget::NoTeam;
            emit setTeam(g.def.generation(), robot.specs.id(), RobotWidget::NoTeam);
        }
    }
}

void RobotSelectionWidget::loadRobotsFromGroup(bool simulator)
{
    if (simulator) {
        bool hasSimRobots = false;
        loadRobots("SimulatorBlueTeam", RobotWidget::Blue, &hasSimRobots);
        loadRobots("SimulatorYellowTeam", RobotWidget::Yellow, &hasSimRobots);
        loadRobots("SimulatorSharedTeam", RobotWidget::Mixed, &hasSimRobots);
#ifdef EASY_MODE
        if (!hasSimRobots) {
            int generation = 3;
            selectTeamForGeneration(generation, 0 /* unused */, RobotWidget::Select11v11);
        }
#endif
    } else {
        loadRobots("BlueTeam", RobotWidget::Blue, nullptr);
        loadRobots("YellowTeam", RobotWidget::Yellow, nullptr);
    }
}

void RobotSelectionWidget::setIsSimulator(bool simulator)
{
    if (simulator == m_isSimulator) {
        return;
    }
    m_isSimulator = simulator;
    emit sendIsSimulator(simulator);
    if (!m_isInitialized) {
        return;
    }
    if (simulator) {
        saveRobots("BlueTeam", RobotWidget::Blue);
        saveRobots("YellowTeam", RobotWidget::Yellow);
        unsetAll();
        loadRobotsFromGroup(true);
    } else {
        saveRobots("SimulatorBlueTeam", RobotWidget::Blue);
        saveRobots("SimulatorYellowTeam", RobotWidget::Yellow);
        saveRobots("SimulatorSharedTeam", RobotWidget::Mixed);
        unsetAll();
        loadRobotsFromGroup(false);
    }
    sendTeams();
}

void RobotSelectionWidget::selectRobots(const QList<int> &yellow, const QList<int> &blue)
{
    // find currently most used generation
    uint bestGeneration = 0;
    int bestGenerationRobots = 0;
    for (auto gen : m_generations.keys()) {
        if (m_generations[gen].robots.size() > bestGenerationRobots) {
            bestGenerationRobots = m_generations[gen].robots.size();
            bestGeneration = gen;
        }
    }

    // set all robots
    for (int id : yellow) {
        auto t = RobotWidget::Team::Yellow;
        if (blue.contains(id)) {
            t = RobotWidget::Team::Mixed;
        }
        emit setTeam(bestGeneration, id, t);
    }
    for (int id : blue) {
        if (yellow.contains(id)) {
                continue;
        }
        emit setTeam(bestGeneration, id, RobotWidget::Team::Blue);
    }
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
            if (robot.team == team || robot.team == RobotWidget::Mixed) {
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
            emit sendRadioResponse(state.radio_response(i));
        }
    }

    for (const auto& debug : status->debug()) {
        for (int i = 0;i<debug.robot_size();i++) {
            const amun::RobotValue &value = debug.robot(i);
            emit setRobotExchangeIcon(value.generation(), value.id(), value.exchange());
        }
    }
}

void RobotSelectionWidget::showConfigDialog(const QModelIndex &index)
{
    if (m_contentDisabled) {
        return;
    }
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
        switch (team) {
        case RobotWidget::Select6v6:
            t = robotCounter < 6 ? RobotWidget::Blue : robotCounter < 12 ? RobotWidget::Yellow : RobotWidget::NoTeam;
            break;
        case RobotWidget::Select11v11:
            if (!m_isSimulator) {
                qDebug() << "using the 11v11 mode without being in simulation will not work";
            } else {
                bool isBlue = robotCounter < 11;
                bool isYellow = robotCounter >= g.robots.size() - 11;
                if (isYellow && isBlue) {
                    t = RobotWidget::Mixed;
                } else if (isYellow) {
                    t = RobotWidget::Yellow;
                } else if (isBlue) {
                    t = RobotWidget::Blue;
                } else {
                    t = RobotWidget::NoTeam;
                }
            }
            break;
        case RobotWidget::SwapTeam:
            // Can't swap the team if none is assigned
            if (r.team != RobotWidget::NoTeam && r.team != RobotWidget::Mixed) {
                t = r.team == RobotWidget::Blue ? RobotWidget::Yellow : RobotWidget::Blue;
            }
            else {
                t = r.team;
            }
            break;
        default:
            break;
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

        if (it.value().robots.contains(id))
        {
            RobotWidget::Team oldTeam = it.value().robots[id].team;
            RobotWidget::Team newTeam = oldTeam;
            if ( oldTeam == team || team == RobotWidget::Mixed) {
                newTeam = RobotWidget::NoTeam;
            } else if (oldTeam == RobotWidget::Mixed) {
                if (team == RobotWidget::Blue) {
                    newTeam = RobotWidget::Yellow;
                } else if (team == RobotWidget::Yellow) {
                    newTeam = RobotWidget::Blue;
                }
            }
            if ( oldTeam != newTeam) {
                it.value().robots[id].team = newTeam;
                emit setTeam(it.key(), id, newTeam);
            }
        }
    }
}

void RobotSelectionWidget::resend()
{
    sendTeams();
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

            case RobotWidget::Mixed:
                yellow = true;
                blue = true;
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
