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
#include "core/rng.h"
#include "core/timer.h"
#include "protobuf/geometry.h"
#include "protobuf/ssl_wrapper.pb.h"
#include "simball.h"
#include "simfield.h"
#include "simrobot.h"
#include <QTimer>
#include <algorithm>

/* Friction and restitution between robots, ball and field: (empirical measurments)
 * Ball vs. Robot:
 * Restitution: about 0.60
 * Friction: trial and error in simulator 0.18 (similar results as in reality)
 *
 * Ball vs. Floor:
 * Restitution: sqrt(h'/h) = sqrt(0.314) = 0.56
 * Friction: \mu_k = -a / g (while slipping) = 0.35
 *
 * Robot vs. Floor:
 * Restitution and Friction should be as low as possible
 *
 * Calculations:
 * Variables: r: restitution, f: friction
 * Indices: b: ball; f: floor; r: robot
 *
 * r_b * r_f = 0.56
 * r_b * r_r = 0.60
 * r_f * r_r = small
 * => r_b = 1; r_f = 0.56; r_r = 0.60
 *
 * f_b * f_f = 0.35
 * f_b * f_r = 0.22
 * f_f * f_r = very small
 * => f_b = 1; f_f = 0.35; f_r = 0.22
 */

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

Simulator::Simulator(const Timer *timer, amun::CommandSimulator::RuleVersion ruleVersion) :
    m_timer(timer),
    m_time(0),
    m_lastSentStatusTime(0),
    m_timeScaling(1.),
    m_enabled(false),
    m_charge(false),
    m_visionDelay(35 * 1000 * 1000),
    m_visionProcessingTime(5 * 1000 * 1000),
    m_currentRuleVersion(ruleVersion)
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

    geometrySetDefault(&m_data->geometry, ruleVersion == amun::CommandSimulator::RULES2018);

    // add field and ball
    m_data->field = new SimField(m_data->dynamicsWorld, m_data->geometry);
    m_data->ball = new SimBall(&m_data->rng, m_data->dynamicsWorld, m_data->geometry.field_width(), m_data->geometry.field_height());
    m_data->flip = false;
    m_data->stddevBall = 0.0f;
    m_data->stddevRobot = 0.0f;
    m_data->stddevRobotPhi = 0.0f;

    // no robots after initialisation

    connect(timer, &Timer::scalingChanged, this, &Simulator::setScaling);
}

Simulator::~Simulator()
{
    resetVisionPackets();

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
    if (m_data->ball->isInvalid()) {
        delete m_data->ball;
        m_data->ball = new SimBall(&m_data->rng, m_data->dynamicsWorld, m_data->geometry.field_width(), m_data->geometry.field_height());
    }

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

void Simulator::fieldAddLine(SSL_GeometryFieldSize *field, std::string name, float x1, float y1, float x2, float y2) const
{
    SSL_FieldLineSegment * line = field->add_field_lines();
    line->set_name(name);
    Vector2f * p1 = line->mutable_p1();
    p1->set_x(x1);
    p1->set_y(y1);
    Vector2f * p2 = line->mutable_p2();
    p2->set_x(x2);
    p2->set_y(y2);
    line->set_thickness(m_data->geometry.line_width() * 1000.0f);
}

void Simulator::fieldAddCircularArc(SSL_GeometryFieldSize *field, std::string name, float x, float y, float radius, float a1, float a2) const
{
    SSL_FieldCircularArc * arc = field->add_field_arcs();
    arc->set_name(name);
    Vector2f * center = arc->mutable_center();
    center->set_x(x);
    center->set_y(y);
    arc->set_radius(radius);
    arc->set_a1(a1);
    arc->set_a2(a2);
    arc->set_thickness(m_data->geometry.line_width() * 1000.0f);
}

QByteArray Simulator::createVisionPacket()
{
    int numCameras;
    if (m_currentRuleVersion == amun::CommandSimulator::RULES2018) {
        numCameras = 8;
    } else {
        numCameras = 4;
    }

    // setup vision packet
    SSL_WrapperPacket packet;
    SSL_DetectionFrame *detection = packet.mutable_detection();
    detection->set_frame_number(0);
    detection->set_camera_id(0);
    detection->set_t_capture((m_time + m_visionDelay - m_visionProcessingTime)*1E-9);
    detection->set_t_sent((m_time + m_visionDelay)*1E-9);

    // get ball and robot position
    const float totalBoundaryWidth = m_data->geometry.boundary_width() + m_data->geometry.referee_width();
    int cameraId = m_data->ball->update(detection->add_balls(), m_data->stddevBall, numCameras, totalBoundaryWidth);
    if (cameraId >= 0) {
        // just move everything to the ball camera
        detection->set_camera_id(cameraId);
    } else {
        // ball not visible
        detection->clear_balls();
    }
    foreach (SimRobot *robot, m_data->robotsBlue) {
        robot->update(detection->add_robots_blue(), m_data->stddevRobot, m_data->stddevRobotPhi);
    }
    foreach (SimRobot *robot, m_data->robotsYellow) {
        robot->update(detection->add_robots_yellow(), m_data->stddevRobot, m_data->stddevRobotPhi);
    }

    // add field geometry
    SSL_GeometryData *geometry = packet.mutable_geometry();
    SSL_GeometryFieldSize *field = geometry->mutable_field();
    field->set_field_width(m_data->geometry.field_width() * 1000.0f);
    field->set_field_length(m_data->geometry.field_height() * 1000.0f);
    field->set_boundary_width(m_data->geometry.boundary_width() * 1000.0f);
    field->set_goal_width(m_data->geometry.goal_width() * 1000.0f);
    field->set_goal_depth(m_data->geometry.goal_depth() * 1000.0f);

    float fieldLengthHalf = m_data->geometry.field_height() * 1000.0f / 2.0f;
    float fieldWidthHalf = m_data->geometry.field_width() * 1000.0f / 2.0f;
    fieldAddLine(field, "TopTouchLine", -fieldLengthHalf, fieldWidthHalf, fieldLengthHalf, fieldWidthHalf);
    fieldAddLine(field, "BottomTouchLine", -fieldLengthHalf, -fieldWidthHalf, fieldLengthHalf, -fieldWidthHalf);
    fieldAddLine(field, "LeftGoalLine", -fieldLengthHalf, -fieldWidthHalf, -fieldLengthHalf, fieldWidthHalf);
    fieldAddLine(field, "RightGoalLine", fieldLengthHalf, -fieldWidthHalf, fieldLengthHalf, fieldWidthHalf);
    fieldAddLine(field, "HalfwayLine", 0, -fieldWidthHalf, 0, fieldWidthHalf);
    fieldAddLine(field, "CenterLine", -fieldLengthHalf, 0, fieldLengthHalf, 0);
    fieldAddCircularArc(field, "CenterCircle", 0, 0, m_data->geometry.center_circle_radius() * 1000.0f, 0, 2.0f * M_PI);

    if (m_currentRuleVersion == amun::CommandSimulator::RULES2018) {
        float defenseDistance = m_data->geometry.defense_height() * 1000.0f;
        float defensePos = -fieldLengthHalf + defenseDistance;
        float defenseWidthHalf = m_data->geometry.defense_width() * 1000.0f / 2.0f;
        fieldAddLine(field, "LeftPenaltyStretch", defensePos, -defenseWidthHalf, defensePos, defenseWidthHalf);
        fieldAddLine(field, "RightPenaltyStretch", -defensePos, -defenseWidthHalf, -defensePos, defenseWidthHalf);
        fieldAddLine(field, "LeftFieldLeftPenaltyStretch", -fieldLengthHalf, -defenseWidthHalf, defensePos, -defenseWidthHalf);
        fieldAddLine(field, "LeftFieldRightPenaltyStretch", -fieldLengthHalf, defenseWidthHalf, defensePos, defenseWidthHalf);
        fieldAddLine(field, "RightFieldRightPenaltyStretch", fieldLengthHalf, -defenseWidthHalf, -defensePos, -defenseWidthHalf);
        fieldAddLine(field, "RightFieldLeftPenaltyStretch", fieldLengthHalf, defenseWidthHalf, -defensePos, defenseWidthHalf);
    } else {
        float defenseDistance = m_data->geometry.defense_radius() * 1000.0f;
        float defensePos = -fieldLengthHalf + defenseDistance;
        float defenseStretchHalf = m_data->geometry.defense_stretch() * 1000.0f / 2.0f;
        fieldAddLine(field, "LeftPenaltyStretch", defensePos, -defenseStretchHalf, defensePos, defenseStretchHalf);
        fieldAddLine(field, "RightPenaltyStretch", -defensePos, -defenseStretchHalf, -defensePos, defenseStretchHalf);

        fieldAddCircularArc(field, "LeftFieldLeftPenaltyArc", -fieldLengthHalf, -defenseStretchHalf, defenseDistance, 0, 0.5f * M_PI);
        fieldAddCircularArc(field, "LeftFieldRightPenaltyArc", -fieldLengthHalf, defenseStretchHalf, defenseDistance, 1.5f * M_PI, 2.0f * M_PI);
        fieldAddCircularArc(field, "RightFieldLeftPenaltyArc", fieldLengthHalf, -defenseStretchHalf, defenseDistance, M_PI, 1.5f * M_PI);
        fieldAddCircularArc(field, "RightFieldRightPenaltyArc", fieldLengthHalf, defenseStretchHalf, defenseDistance, 0.5f * M_PI, M_PI);
    }

    for (int i = 0; i < numCameras; ++i) {
        // camera position calculation must match SimBall
        int signX = (i >= numCameras / 2) ? 1 : -1;
        int partsY = 2 * (i % (numCameras / 2)) - (numCameras / 2 - 1);

        const float cameraHalfAreaX = m_data->geometry.field_width() / 4;
        const float cameraHalfAreaY = m_data->geometry.field_height() / numCameras;
        const float cameraX = cameraHalfAreaX * signX;
        const float cameraY = cameraHalfAreaY * partsY;
        const float cameraZ = 4.f;

        SSL_GeometryCameraCalibration *calib = geometry->add_calib();
        calib->set_camera_id(i);
        // DUMMY VALUES
        calib->set_distortion(0.2);
        calib->set_focal_length(FOCAL_LENGTH);
        calib->set_principal_point_x(300);
        calib->set_principal_point_y(300);
        calib->set_q0(0.7);
        calib->set_q1(0.7);
        calib->set_q2(0.7);
        calib->set_q3(0.7);
        calib->set_tx(0);
        calib->set_ty(0);
        calib->set_tz(3500);

        calib->set_derived_camera_world_tx(cameraY * 1000);
        calib->set_derived_camera_world_ty(-cameraX * 1000);
        calib->set_derived_camera_world_tz(cameraZ * 1000);
    }

    // serialize "vision packet"
    QByteArray data;
    data.resize(packet.ByteSize());
    if (packet.SerializeToArray(data.data(), data.size())) {
        return data;
    }
    return QByteArray();
}

void Simulator::sendVisionPacket()
{
    QByteArray data = m_visionPackets.dequeue();
    emit gotPacket(data, m_timer->currentTime(), "simulator"); // send "vision packet" and assume instant receiving
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

void Simulator::handleRadioCommands(const QList<robot::RadioCommand> &commands, qint64 processingDelay)
{
    qint64 receiveTime = m_timer->currentTime() - processingDelay;
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

void Simulator::setScaling(double scaling)
{
    if (scaling <= 0 || !m_enabled) {
        m_trigger->stop();
        // clear pending vision packets
        resetVisionPackets();
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
