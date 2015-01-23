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

#include "simulator.h"
#include "simball.h"
#include "simfield.h"
#include "simrobot.h"
#include "core/rng.h"
#include "core/timer.h"
#include "protobuf/geometry.h"
#include "protobuf/ssl_wrapper.pb.h"
#include <QTimer>
#include <algorithm>

struct SimulatorData
{
    RNG rng;
    btDefaultCollisionConfiguration *collision;
    btCollisionDispatcher *dispatcher;
    btBroadphaseInterface *overlappingPairCache;
    btSequentialImpulseConstraintSolver *solver;
    btDiscreteDynamicsWorld *dynamicsWorld;
    world::Geometry geometry;
    SimField *field;
    SimBall *ball;
    Simulator::RobotMap robotsBlue;
    Simulator::RobotMap robotsYellow;
    bool flip;
    float stddevBall;
    float stddevRobot;
    float stddevRobotPhi;
};

static void simulatorTickCallback(btDynamicsWorld *world, btScalar timeStep)
{
    Simulator *sim = reinterpret_cast<Simulator *>(world->getWorldUserInfo());
    sim->handleSimulatorTick(timeStep);
}

/*!
 * \class Simulator
 * \ingroup simulator
 * \brief %Simulator interface
 */

Simulator::Simulator(const Timer *timer) :
    m_timer(timer),
    m_time(0),
    m_lastSentStatusTime(0),
    m_timeScaling(1.f),
    m_enabled(false),
    m_charge(false),
    m_visionDelay(35 * 1000 * 1000),
    m_visionProcessingTime(5 * 1000 * 1000)
{
    // triggers by default every 5 milliseconds if simulator is enabled
    // timing may change if time is scaled
    m_trigger = new QTimer(this);
    m_trigger->setTimerType(Qt::PreciseTimer);
    connect(m_trigger, SIGNAL(timeout()), SLOT(process()));

    // setup bullet
    m_data = new SimulatorData;
    m_data->collision = new btDefaultCollisionConfiguration();
    m_data->dispatcher = new btCollisionDispatcher(m_data->collision);
    m_data->overlappingPairCache = new btDbvtBroadphase();
    m_data->solver = new btSequentialImpulseConstraintSolver;
    m_data->dynamicsWorld = new btDiscreteDynamicsWorld(m_data->dispatcher, m_data->overlappingPairCache, m_data->solver, m_data->collision);
    m_data->dynamicsWorld->setGravity(btVector3(0.0f, 0.0f, -9.81f * SIMULATOR_SCALE));
    m_data->dynamicsWorld->setInternalTickCallback(simulatorTickCallback, this, true);

    geometrySetDefault(&m_data->geometry);

    // add field and ball
    m_data->field = new SimField(m_data->dynamicsWorld, m_data->geometry);
    m_data->ball = new SimBall(&m_data->rng, m_data->dynamicsWorld);
    m_data->flip = false;
    m_data->stddevBall = 0.0f;
    m_data->stddevRobot = 0.0f;
    m_data->stddevRobotPhi = 0.0f;

    // no robots after initialisation
}

Simulator::~Simulator()
{
    qDeleteAll(m_data->robotsBlue);
    qDeleteAll(m_data->robotsYellow);
    delete m_data->ball;
    delete m_data->field;
    delete m_data->dynamicsWorld;
    delete m_data->solver;
    delete m_data->overlappingPairCache;
    delete m_data->dispatcher;
    delete m_data->collision;
    delete m_data;
}

void Simulator::process()
{
    Q_ASSERT(m_time != 0);
    const qint64 start_time = Timer::systemTime();

    const qint64 current_time = m_timer->currentTime();

    // collect responses from robots
    QList<robot::RadioResponse> responses;

    // apply only radio commands that were already received by the robots
    while (m_radioCommands.size() > 0 && m_radioCommands.head().second < m_time) {
        RadioCommand commands = m_radioCommands.dequeue();
        foreach (const robot::RadioCommand &command, commands.first) {
            // pass radio command to robot that matches the generation and id
            const QPair<uint, uint> id(command.generation(), command.id());
            if (m_data->robotsBlue.contains(id)) {
                robot::RadioResponse response = m_data->robotsBlue[id]->setCommand(command.command(), m_data->ball, m_charge);
                response.set_time(m_time);
                // only collect valid responses
                if (response.IsInitialized()) {
                    responses.append(response);
                }
            }
            if (m_data->robotsYellow.contains(id)) {
               robot::RadioResponse response = m_data->robotsYellow[id]->setCommand(command.command(), m_data->ball, m_charge);
               response.set_time(m_time);
               if (response.IsInitialized()) {
                   responses.append(response);
               }
            }
        }
    }

    // radio responses are sent when a robot gets his command
    // thus send the responses immediatelly
    sendRadioResponses(responses);

    // simulate to current strategy time
    double timeDelta = (current_time - m_time) / 1E9;
    m_data->dynamicsWorld->stepSimulation(timeDelta, 10, SUB_TIMESTEP);
    m_time = current_time;

    // only send a vision packet every third frame = 15 ms - epsilon (=half frame)
    // gives a vision frequency of 66.67Hz
    if (m_lastSentStatusTime + 12500000 <= m_time) {
        QByteArray data = createVisionPacket();
        m_visionPackets.enqueue(data);

        // timeout is in milliseconds
        int timeout = m_visionDelay * 1E-6 / m_timeScaling;
        // send after timeout, default timer mode, may jitter a bit
        QTimer *timer = new QTimer();
        timer->setTimerType(Qt::PreciseTimer);
        timer->setSingleShot(true);
        connect(timer, SIGNAL(timeout()), SLOT(sendVisionPacket()));
        timer->start(timeout);
        m_visionTimers.enqueue(timer);

        m_lastSentStatusTime = m_time;
    }

    // send timing information
    Status status(new amun::Status);
    status->mutable_timing()->set_simulator((Timer::systemTime() - start_time) / 1E9);
    emit sendStatus(status);
}

void Simulator::resetFlipped(Simulator::RobotMap &robots, float side)
{
    // find flipped robots and align them on a line
    const float x = m_data->geometry.field_width() / 2 - 0.2;
    float y = m_data->geometry.field_height() / 2 - 0.2;

    for (RobotMap::iterator it = robots.begin(); it != robots.end(); ++it) {
        SimRobot *robot = it.value();
        if (robot->isFlipped()) {
            SimRobot *new_robot = new SimRobot(&m_data->rng, robot->specs(), m_data->dynamicsWorld, btVector3(x, side * y, 0), 0.0f);
            delete robot;
            it.value() = new_robot;
        }
        y -= 0.3;
    }
}

void Simulator::handleSimulatorTick(double timeStep)
{
    // has to be done according to bullet wiki
    m_data->dynamicsWorld->clearForces();

    resetFlipped(m_data->robotsBlue, 1.0f);
    resetFlipped(m_data->robotsYellow, -1.0f);

    // apply commands and forces to ball and robots
    m_data->ball->begin();
    foreach (SimRobot *robot, m_data->robotsBlue) {
        robot->begin(m_data->ball, timeStep);
    }
    foreach (SimRobot *robot, m_data->robotsYellow) {
        robot->begin(m_data->ball, timeStep);
    }

    // add gravity to all ACTIVE objects
    // thus has to be done after applying commands
    m_data->dynamicsWorld->applyGravity();
}

QByteArray Simulator::createVisionPacket()
{
    // setup vision packet
    SSL_WrapperPacket packet;
    SSL_DetectionFrame *detection = packet.mutable_detection();
    detection->set_frame_number(0);
    detection->set_camera_id(0);
    detection->set_t_capture((m_time + m_visionDelay - m_visionProcessingTime)*1E-9);
    detection->set_t_sent((m_time + m_visionDelay)*1E-9);

    // get ball and robot position
    m_data->ball->update(detection->add_balls(), m_data->stddevBall);
    foreach (SimRobot *robot, m_data->robotsBlue) {
        robot->update(detection->add_robots_blue(), m_data->stddevRobot, m_data->stddevRobotPhi);
    }
    foreach (SimRobot *robot, m_data->robotsYellow) {
        robot->update(detection->add_robots_yellow(), m_data->stddevRobot, m_data->stddevRobotPhi);
    }

    // add field geometry
    SSL_GeometryData *geometry = packet.mutable_geometry();
    SSL_GeometryFieldSize *field = geometry->mutable_field();
    field->set_line_width(m_data->geometry.line_width() * 1000.0f);
    field->set_field_width(m_data->geometry.field_width() * 1000.0f);
    field->set_field_length(m_data->geometry.field_height() * 1000.0f);
    field->set_boundary_width(m_data->geometry.boundary_width() * 1000.0f);
    field->set_referee_width(m_data->geometry.referee_width() * 1000.0f);
    field->set_goal_width(m_data->geometry.goal_width() * 1000.0f);
    field->set_goal_depth(m_data->geometry.goal_depth() * 1000.0f);
    field->set_goal_wall_width(m_data->geometry.goal_wall_width() * 1000.0f);
    field->set_center_circle_radius(m_data->geometry.center_circle_radius() * 1000.0f);
    field->set_defense_radius(m_data->geometry.defense_radius() * 1000.0f);
    field->set_defense_stretch(m_data->geometry.defense_stretch() * 1000.0f);
    field->set_free_kick_from_defense_dist(m_data->geometry.free_kick_from_defense_dist() * 1000.0f);
    field->set_penalty_spot_from_field_line_dist(m_data->geometry.penalty_spot_from_field_line_dist() * 1000.0f);
    field->set_penalty_line_from_spot_dist(m_data->geometry.penalty_line_from_spot_dist() * 1000.0f);

    // serialize "vision packet"
    QByteArray data;
    data.resize(packet.ByteSize());
    if (packet.SerializeToArray(data.data(), data.size()))
        return data;
    return QByteArray();
}

void Simulator::sendVisionPacket()
{
    QByteArray data = m_visionPackets.dequeue();
    emit gotPacket(data, m_timer->currentTime()); // send "vision packet" and assume instant receiving
    // the receive time may be a bit jittered just like a real transmission

    QTimer *timer = m_visionTimers.dequeue();
    timer->deleteLater();
}

void Simulator::resetVisionPackets()
{
    qDeleteAll(m_visionTimers);
    m_visionTimers.clear();
    m_visionPackets.clear();
}

void Simulator::handleRadioCommands(const QList<robot::RadioCommand> &commands)
{
    qint64 receiveTime = m_timer->currentTime();
    m_radioCommands.enqueue(qMakePair(commands, receiveTime));
}

void Simulator::setTeam(Simulator::RobotMap &list, float side, const robot::Team &team)
{
    // remove old team
    qDeleteAll(list);
    list.clear();

    // changing a team is also triggering a tracking reset
    // thus the old robots will disappear immediatelly
    // however if the delayed vision packets arrive the old robots will be tracked again
    // thus after removing a robot from a team it can take 1 simulated second for the robot to disappear
    // to prevent this remove outdated vision packets
    resetVisionPackets();

    // align robots on a line
    const float x = m_data->geometry.field_width() / 2 - 0.2;
    float y = m_data->geometry.field_height() / 2 - 0.2;

    for (int i = 0; i < team.robot_size(); i++) {
        const robot::Specs& specs = team.robot(i);
        const QPair<uint, uint> id(specs.generation(), specs.id());
        // (generation, robot id) must be unique
        if (list.contains(id)) {
            continue;
        }

        SimRobot *robot = new SimRobot(&m_data->rng, specs, m_data->dynamicsWorld, btVector3(x, side * y, 0), 0.0f);
        list[id] = robot;
        y -= 0.3;
    }
}

void Simulator::moveBall(const amun::SimulatorMoveBall &ball)
{
    // handle ball move command
    amun::SimulatorMoveBall b = ball;
    if (m_data->flip) {
        if (ball.has_p_x()) {
            b.set_p_x(-ball.p_x());
        }
        if (ball.has_p_y()) {
            b.set_p_y(-ball.p_y());
        }
    }

    m_data->ball->move(b);
}

void Simulator::moveRobot(const Simulator::RobotMap &list, const amun::SimulatorMoveRobot &robot)
{
    // handle robot move command
    amun::SimulatorMoveRobot r = robot;
    if (m_data->flip) {
        if (robot.has_p_x()) {
            r.set_p_x(-robot.p_x());
        }
        if (robot.has_p_y()) {
            r.set_p_y(-robot.p_y());
        }
    }

    foreach (SimRobot *sim_robot, list) {
        if (sim_robot->specs().id() == r.id()) {
            sim_robot->move(r);
            break;
        }
    }
}

void Simulator::handleCommand(const Command &command)
{
    // is field flipped
    if (command->has_flip()) {
        m_data->flip = command->flip();
    }

    if (command->has_simulator()) {
        const amun::CommandSimulator &sim = command->simulator();
        if (sim.has_enable()) {
            m_enabled = sim.enable();
            m_time = m_timer->currentTime();
            // update timer when simulator status is changed
            setScaling(m_timeScaling);
        }

        if (sim.has_vision_delay()) {
            m_visionDelay = std::max((qint64)0, (qint64)sim.vision_delay());
        }

        if (sim.has_vision_processing_time()) {
            m_visionProcessingTime = std::max((qint64)0, (qint64)sim.vision_processing_time());
        }

        if (sim.has_stddev_ball_p()) {
            m_data->stddevBall = sim.stddev_ball_p();
        }

        if (sim.has_stddev_robot_p()) {
            m_data->stddevRobot = sim.stddev_robot_p();
        }

        if (sim.has_stddev_robot_phi()) {
            m_data->stddevRobotPhi = sim.stddev_robot_phi();
        }

        if (sim.has_move_ball()) {
            const amun::SimulatorMoveBall &ball = sim.move_ball();
            moveBall(ball);
        }

        for (int i = 0; i < sim.move_blue_size(); i++) {
            const amun::SimulatorMoveRobot &robot = sim.move_blue(i);
            moveRobot(m_data->robotsBlue, robot);
        }

        for (int i = 0; i < sim.move_yellow_size(); i++) {
            const amun::SimulatorMoveRobot &robot = sim.move_yellow(i);
            moveRobot(m_data->robotsYellow, robot);
        }
    }

    if (command->has_transceiver()) {
        const amun::CommandTransceiver &t = command->transceiver();
        if (t.has_charge()) {
            m_charge = t.charge();
        }
    }

    if (command->has_set_team_blue()) {
        setTeam(m_data->robotsBlue, 1.0f, command->set_team_blue());
    }

    if (command->has_set_team_yellow()) {
        setTeam(m_data->robotsYellow, -1.0f, command->set_team_yellow());
    }
}

void Simulator::setScaling(float scaling)
{
    if (scaling <= 0 || !m_enabled) {
        m_trigger->stop();
    } else {
        // scale default timing of 5 milliseconds
        const int t = 5 / scaling;
        m_trigger->start(qMax(1, t));

        // The vision packet timings are wrong after a scaling change
        // In addition if the new scaling is larger than the old one,
        // this would cause the timers started after the scaling change
        // to trigger before the old timers, what causes the deletion of
        // the old timers before they are fired.
        resetVisionPackets();
    }
    // needed if scaling is set before simulator was enabled
    m_timeScaling = scaling;
}
