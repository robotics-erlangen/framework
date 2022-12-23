/***************************************************************************
 *   Copyright 2015 Michael Bleier, Michael Eischer, Jan Kallwies,         *
 *       Philipp Nordhus                                                   *
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

#include "commandevaluator.h"
#include "coordinatehelper.h"
#include "processor.h"
#include "referee.h"
#include "core/timer.h"
#include "core/configuration.h"
#include "gamecontroller/internalgamecontroller.h"
#include "tracking/tracker.h"
#include "config/config.h"
#include <cmath>
#include <QTimer>
#include <QFile>
#include <google/protobuf/text_format.h>

struct Processor::Robot
{
    explicit Robot(const robot::Specs &specs) :
        generation(specs.generation()),
        id(specs.id()),
        controller(specs),
        strategy_command(NULL),
        manual_command(NULL)
    {

    }

    ~Robot()
    {
        clearManualCommand();
    }

    void clearStrategyCommand()
    {
        strategy_command.clear();
    }

    bool setStrategyCommand(const RobotCommand &command)
    {
        if (!command->IsInitialized()) {
            return false;
        }
        strategy_command = command;
        return true;
    }

    void clearManualCommand()
    {
        delete manual_command;
        manual_command = NULL;
    }

    void setManualCommand(const robot::Command &command)
    {
        if (!manual_command) {
            manual_command = new robot::Command;
        }
        manual_command->CopyFrom(command);
    }

    void mergeIntoCommand(robot::Command& command) {
        if (manual_command && !manual_command->strategy_controlled()) {
            // use manual command, if available
            // this has precedence over any strategy command
            command.CopyFrom(*manual_command);
            command.set_strategy_controlled(false);
        } else if (!strategy_command.isNull()) {
            // copy strategy command
            command.CopyFrom(*strategy_command);
            command.set_strategy_controlled(true);
        } else {
            // no command -> standby
            command.set_standby(true);
            command.set_strategy_controlled(false);
        }

        if (manual_command && manual_command->eject_sdcard()) {
            command.set_eject_sdcard(true);
        }
    }

    const quint32 generation;
    const quint32 id;
    CommandEvaluator controller;
    RobotCommand strategy_command;
    robot::Command *manual_command;
};

/*!
 * \class Processor
 * \ingroup processor
 * \brief Thread with fixed period for tracking and motion control
 */

const int Processor::FREQUENCY(100);

/*!
 * \brief Constructs a Processor
 * \param timer Timer to be used for time scaling
 */
Processor::Processor(const Timer *timer, bool isReplay) :
    m_timer(timer),
    m_tracker(new Tracker(false, false)),
    m_speedTracker(new Tracker(true, true)),
    m_simpleTracker(new Tracker(false, false)),
    m_mixedTeamInfoSet(false),
    m_refereeInternalActive(isReplay),
    m_lastFlipped(false),
    m_gameController(new InternalGameController(timer)),
    m_transceiverEnabled(isReplay),
    m_saveBallModel(!isReplay)
{
    // keep two separate referee states
    m_referee = new Referee();
    m_refereeInternal = new Referee();

    m_gameControllerThread = new QThread(this);
    m_gameControllerThread->setObjectName("game controller thread");
    m_gameController->moveToThread(m_gameControllerThread);
    connect(m_gameControllerThread, &QThread::finished, m_gameController, &InternalGameController::deleteLater);
    m_gameControllerThread->start();

    connect(m_gameController, &InternalGameController::sendStatus, this, &Processor::sendStatus);
    connect(m_gameController, &InternalGameController::gotPacketForReferee, m_refereeInternal, &Referee::handlePacket);
    connect(this, &Processor::sendStatus, m_gameController, &InternalGameController::handleStatus);
    connect(this, &Processor::setFlipped, m_gameController, &InternalGameController::setFlip);

    /* Connect only the m_referee (not m_refereeInternal) as host changes are
     * only relevant for external game controllers.
     */
    connect(m_referee, &Referee::refereeHostChanged, this, &Processor::refereeHostChanged);

    // start processing
    m_trigger = new QTimer(this);
    connect(m_trigger, SIGNAL(timeout()), SLOT(process()));
    m_trigger->setTimerType(Qt::PreciseTimer);
    if (!isReplay) {
        m_trigger->start(1000/FREQUENCY);
    }

    connect(timer, &Timer::scalingChanged, this, &Processor::setScaling);

    loadConfiguration("division-dimensions", &m_divisionDimensions, false);

    loadConfiguration(ballModelConfigFile(m_simulatorEnabled), &m_ballModel, false);
    m_ballModelUpdated = true;
}

/*!
 * \brief Destroys the Processor
 */
Processor::~Processor()
{
    m_gameControllerThread->quit();
    m_gameControllerThread->wait();

    delete m_refereeInternal;
    delete m_referee;

    qDeleteAll(m_blueTeam.robots);
    qDeleteAll(m_yellowTeam.robots);
}

Status Processor::assembleStatus(qint64 time, bool resetRaw)
{
    if (m_ballModelUpdated) {
        // TODO: handle geometry entirely in processor?
        m_tracker->setGeometryUpdated();
    }
    Status status = m_tracker->worldState(time, resetRaw);
    Status simplePredictionStatus = m_simpleTracker->worldState(time, resetRaw);
    status->mutable_world_state()->mutable_simple_tracking_blue()->CopyFrom(simplePredictionStatus->world_state().blue());
    status->mutable_world_state()->mutable_simple_tracking_yellow()->CopyFrom(simplePredictionStatus->world_state().yellow());
    if (simplePredictionStatus->world_state().has_ball()) {
        status->mutable_world_state()->mutable_simple_tracking_ball()->CopyFrom(simplePredictionStatus->world_state().ball());
    }
    if (!m_extraVision.empty()) {
        for(const QByteArray& data : m_extraVision) {
            status->mutable_world_state()->add_reality()->ParseFromArray(data.data(), data.size());
        }
        if (resetRaw) {
            m_extraVision.clear();
        }
    }

    if (status->has_geometry()) {
        world::Geometry* geometry = status->mutable_geometry();

        geometry->mutable_ball_model()->CopyFrom(m_ballModel);
        m_ballModelUpdated = false;

        if (std::abs(m_divisionDimensions.field_height_b() - geometry->field_height()) <= m_divisionDimensions.field_height_b()*0.1 && std::abs(m_divisionDimensions.field_width_b() - geometry->field_width()) <= m_divisionDimensions.field_width_b()*0.1) {
            geometry->set_division(world::Geometry_Division_B);
        } else {
            if (std::abs(m_divisionDimensions.field_height_a() - geometry->field_height()) > m_divisionDimensions.field_height_a()*0.1 && std::abs(m_divisionDimensions.field_width_a() - geometry->field_width()) <= m_divisionDimensions.field_width_a()*0.1) {
                std::cerr << "Error, field size doesn't match either division. Dimensions in config/division-dimensions.txt are:\nDivision A: width:"<< m_divisionDimensions.field_width_a() << " height: " << m_divisionDimensions.field_height_a() << "\nDivision B: width:" << m_divisionDimensions.field_width_b() << " height: " << m_divisionDimensions.field_height_b() << "\nDefaulting to division A rules." << std::endl;
            }
            geometry->set_division(world::Geometry_Division_A);
        }
    }

    return status;
}

world::WorldSource Processor::currentWorldSource() const
{
    if (!m_simulatorEnabled) {
        return world::WorldSource::REAL_LIFE;
    } else if (m_internalSimulatorEnabled) {
        return world::WorldSource::INTERNAL_SIMULATION;
    } else {
        return world::WorldSource::EXTERNAL_SIMULATION;
    }
}

QString Processor::ballModelConfigFile(bool isSimulator)
{
    if (isSimulator) {
        return "field-properties/simulator";
    } else{
        return "field-properties/field";
    }
}

void Processor::process(qint64 overwriteTime)
{
    const qint64 tracker_start = Timer::systemTime();

    const qint64 current_time = overwriteTime == -1 ? m_timer->currentTime() : overwriteTime;
    // the controller runs with 100 Hz -> 10ms ticks
    const qint64 tickDuration = 1000 * 1000 * 1000 / FREQUENCY;

    // run tracking
    m_tracker->process(current_time);
    m_speedTracker->process(current_time);
    m_simpleTracker->process(current_time);
    Status status = assembleStatus(current_time, false);
    Status radioStatus = m_speedTracker->worldState(current_time, false);

    // add information, about whether the world state is from the simulator or not
    status->mutable_world_state()->set_is_simulated(m_simulatorEnabled);
    status->mutable_world_state()->set_world_source(currentWorldSource());

    // run referee
    Referee* activeReferee = (m_refereeInternalActive) ? m_refereeInternal : m_referee;
    activeReferee->process(status->world_state());
    if (activeReferee->getFlipped() != m_lastFlipped) {
        m_lastFlipped = activeReferee->getFlipped();
        m_tracker->setFlip(m_lastFlipped);
        m_speedTracker->setFlip(m_lastFlipped);
        m_simpleTracker->setFlip(m_lastFlipped);
        emit setFlipped(m_lastFlipped);
    }
    status->mutable_game_state()->CopyFrom(activeReferee->gameState());
    status->mutable_game_state()->set_is_real_game_running(m_referee->isGameRunning());

    // add radio responses from robots and mixed team data
    injectExtraData(status);

    // add input / commands from the user for the strategy
    injectUserControl(status, true);
    injectUserControl(status, false);

    const qint64 controller_start = Timer::systemTime();
    // just ignore the referee for timing
    status->mutable_timing()->set_tracking((controller_start - tracker_start) * 1E-9f);

    amun::DebugValues *debug = status->add_debug();
    debug->set_source(amun::Controller);
    QList<robot::RadioCommand> radio_commands_prio;

    {
        QList<robot::RadioCommand> radio_commands;

        // assume that current_time is still "now"
        const qint64 controllerTime = current_time + tickDuration;
        processTeam(m_blueTeam, true, status->world_state().blue(), radio_commands_prio, radio_commands,
                    status, controllerTime, radioStatus->world_state().blue(), debug);
        processTeam(m_yellowTeam, false, status->world_state().yellow(), radio_commands_prio, radio_commands,
                    status, controllerTime, radioStatus->world_state().yellow(), debug);

        radio_commands_prio.append(radio_commands);
    }

    if (m_transceiverEnabled) {
        // the command is active starting from now
        m_tracker->queueRadioCommands(radio_commands_prio, current_time+1);
    }

    // prediction which accounts for the strategy runtime
    // depends on the just created radio command
    Status strategyStatus = assembleStatus(current_time + tickDuration, true);
    strategyStatus->mutable_world_state()->set_is_simulated(m_simulatorEnabled);
    strategyStatus->mutable_world_state()->set_world_source(currentWorldSource());
    strategyStatus->mutable_game_state()->CopyFrom(activeReferee->gameState());
    injectExtraData(strategyStatus);
    // remove responses after injecting to avoid sending them a second time
    m_responses.clear();
    m_mixedTeamInfo.Clear();
    m_mixedTeamInfoSet = false;
    // copy to other status message
    strategyStatus->mutable_user_input_yellow()->CopyFrom(status->user_input_yellow());
    strategyStatus->mutable_user_input_blue()->CopyFrom(status->user_input_blue());
    emit sendStrategyStatus(strategyStatus);

    // publish world state and timing information
    status->mutable_timing()->set_controller((Timer::systemTime() - controller_start) * 1E-9f);
    emit sendStatus(status);

    if (m_transceiverEnabled) {
        emit sendRadioCommands(radio_commands_prio, current_time);
    }

    m_tracker->finishProcessing();
}

const world::Robot* Processor::getWorldRobot(const RobotList &robots, uint id) {
    for (RobotList::const_iterator it = robots.begin(); it != robots.end(); ++it) {
        const world::Robot &robot = *it;
        if (robot.id() == id) {
            return &robot;
        }
    }
    // If no robot was found return null
    return nullptr;
}

void Processor::injectExtraData(Status &status)
{
    // just copy every response
    foreach (const robot::RadioResponse &response, m_responses) {
        robot::RadioResponse *rr = status->mutable_world_state()->add_radio_response();
        rr->CopyFrom(response);
    }
    if (m_mixedTeamInfoSet) {
        *(status->mutable_world_state()->mutable_mixed_team_info()) = m_mixedTeamInfo;
    }
}

void Processor::injectUserControl(Status &status, bool isBlue)
{
    // copy movement commands from input devices
    Team &team = isBlue ? m_blueTeam : m_yellowTeam;
    amun::UserInput *userInput = isBlue ? status->mutable_user_input_blue() : status->mutable_user_input_yellow();

    foreach (Robot *robot, team.robots) {
        if (!robot->manual_command) {
            continue;
        }

        if (!robot->manual_command->strategy_controlled()) {
            continue;
        }

        robot::RadioCommand *radio_command = userInput->add_radio_command();
        radio_command->set_generation(robot->generation);
        radio_command->set_id(robot->id);
        radio_command->set_is_blue(isBlue);
        radio_command->mutable_command()->CopyFrom(*robot->manual_command);
        radio_command->set_command_time(robot->controller.startTime());
    }
}

void Processor::processTeam(Team &team, bool isBlue, const RobotList &robots, QList<robot::RadioCommand> &radio_commands_prio,
                            QList<robot::RadioCommand> &radio_commands, Status &status, qint64 time, const RobotList &radioRobots,
                            amun::DebugValues *debug)
{
    foreach (Robot *robot, team.robots) {
        robot::RadioCommand *radio_command = status->add_radio_command();
        radio_command->set_generation(robot->generation);
        radio_command->set_id(robot->id);
        radio_command->set_is_blue(isBlue);
        radio_command->set_command_time(robot->controller.startTime());

        robot::Command& command = *radio_command->mutable_command();
        robot->mergeIntoCommand(command);

        // Get current robot
        const world::Robot* currentRobot = getWorldRobot(robots, robot->id);
        robot->controller.calculateCommand(currentRobot, time, command, debug);

        injectRawSpeedIfAvailable(radio_command, radioRobots, currentRobot);

        // Prepare radio command
        // prioritize radio commands of robots with active commands
        if (robot->controller.hasInput()) {
            radio_commands_prio.append(*radio_command);
        } else {
            radio_commands.append(*radio_command);
        }
    }
}

void Processor::injectRawSpeedIfAvailable(robot::RadioCommand *radioCommand, const RobotList &radioRobots, const world::Robot* currentRobot) {
    robot::Command& command = *radioCommand->mutable_command();
    const world::Robot* currentRadioRobot = getWorldRobot(radioRobots, radioCommand->id());
    if (currentRadioRobot && currentRobot) {
        float robot_phi = currentRobot->phi() - M_PI_2;
        GlobalSpeed currentPos(currentRadioRobot->v_x(), currentRadioRobot->v_y(), currentRadioRobot->omega());
        LocalSpeed localPos = currentPos.toLocal(robot_phi);

        command.set_cur_v_s(localPos.v_s);
        command.set_cur_v_f(localPos.v_f);
        command.set_cur_omega(localPos.omega);
    }
}

void Processor::handleRefereePacket(const QByteArray &data, qint64 /*time*/, QString sender)
{
    m_referee->handlePacket(data, sender);
    // ensure that tournament mode works even if the simulator is stopped
    if (m_referee->isGameRunning() && m_simulatorEnabled && !m_trigger->isActive()) {
        Status status = Status(new amun::Status);
        status->mutable_game_state()->set_is_real_game_running(true);
        emit sendStatus(status);
    }
}

void Processor::handleVisionPacket(const QByteArray &data, qint64 time, QString sender)
{
    m_tracker->queuePacket(data, time, sender);
    m_speedTracker->queuePacket(data, time, sender);
    m_simpleTracker->queuePacket(data, time, sender);
}

void Processor::handleSimulatorExtraVision(const QByteArray &data)
{
    m_extraVision.append(data);
}

void Processor::handleMixedTeamInfo(const QByteArray &data, qint64)
{
    m_mixedTeamInfo.Clear();
    m_mixedTeamInfoSet = true;
    m_mixedTeamInfo.ParseFromArray(data.constData(), data.size());
}

void Processor::handleRadioResponses(const QList<robot::RadioResponse> &responses)
{
    // radio responses may arrive in multiple chunks between two
    // processor iterations
    m_responses.append(responses);
}

void Processor::setTeam(const robot::Team &t, Team &team)
{
    qDeleteAll(team.robots);
    team.robots.clear();
    team.team = t;

    for (int i = 0; i < t.robot_size(); i++) {
        const robot::Specs &specs = t.robot(i);

        Robot *robot = new Robot(specs);
        team.robots.insert(qMakePair(specs.generation(), specs.id()), robot);
    }
}

void Processor::handleCommand(const Command &command)
{
    bool teamsChanged = false;
    bool simulatorEnabledBefore = m_simulatorEnabled;

    if (command->has_set_team_blue()) {
        setTeam(command->set_team_blue(), m_blueTeam);
        teamsChanged = true;
    }

    if (command->has_set_team_yellow()) {
        setTeam(command->set_team_yellow(), m_yellowTeam);
        teamsChanged = true;
    }

    if (command->has_simulator() && command->simulator().has_enable()) {
        resetTracking();
        m_internalSimulatorEnabled = command->simulator().enable();
        m_simulatorEnabled = m_internalSimulatorEnabled || m_externalSimulatorEnabled;
    }

    if (teamsChanged) {
        resetTracking();
        sendTeams();
    }

    if (command->has_referee()) {
        const amun::CommandReferee &refereeCommand = command->referee();
        if (refereeCommand.has_active()) {
            m_refereeInternalActive = refereeCommand.active();
        }
    }

    if (command->has_control()) {
        handleControl(m_blueTeam, command->control());
        handleControl(m_yellowTeam, command->control());
    }

    if (command->has_tracking()) {
        const qint64 currentTime = m_timer->currentTime();
        m_tracker->handleCommand(command->tracking(), currentTime);
        m_speedTracker->handleCommand(command->tracking(), currentTime);
        m_simpleTracker->handleCommand(command->tracking(), currentTime);
    }

    if (command->has_transceiver()) {
        const amun::CommandTransceiver &t = command->transceiver();
        if (t.has_enable()) {
            m_transceiverEnabled = t.enable();
        }

        if (t.has_use_network()) {
            m_externalSimulatorEnabled = t.use_network();
            m_simulatorEnabled = m_internalSimulatorEnabled || m_externalSimulatorEnabled;
        }
    }

    if (command->has_tracking() && command->tracking().has_ball_model()) {
        m_ballModel.CopyFrom(command->tracking().ball_model());
        if (m_saveBallModel) {
            saveConfiguration(ballModelConfigFile(m_simulatorEnabled), &m_ballModel);
        }
        m_ballModelUpdated = true;
    }
    if (simulatorEnabledBefore != m_simulatorEnabled) {
        loadConfiguration(ballModelConfigFile(m_simulatorEnabled), &m_ballModel, false);
        m_ballModelUpdated = true;
    }
    if (m_ballModelUpdated) {
        m_tracker->setBallModel(m_ballModel);
        m_speedTracker->setBallModel(m_ballModel);
        m_simpleTracker->setBallModel(m_ballModel);
    }
}

void Processor::resetTracking()
{
    m_tracker->reset();
    m_speedTracker->reset();
    m_simpleTracker->reset();
}

void Processor::handleControl(Team &team, const amun::CommandControl &control)
{
    // clear all previously set commands
    foreach (Robot *robot, team.robots) {
        robot->clearManualCommand();
    }

    for (int i = 0; i < control.commands_size(); i++) {
        const robot::RadioCommand &c = control.commands(i);
        Robot *robot = team.robots.value(qMakePair(c.generation(), c.id()));
        if (robot) {
            robot->setManualCommand(c.command());
        }
    }
}

// blue is actually redundant, but this ensures that only the right strategy can control a robot
void Processor::handleStrategyCommands(bool blue, const QList<RobotCommandInfo> &commands, qint64 time)
{
    for (const RobotCommandInfo &command : commands) {
        Team &team = blue ? m_blueTeam : m_yellowTeam;
        Robot *robot = team.robots.value(qMakePair(command.generation, command.robotId));
        if (!robot) {
            // invalid id
            return;
        }

        // halt robot on invalid strategy command
        if (!robot->setStrategyCommand(command.command)) {
            robot->clearStrategyCommand();
            robot->controller.clearInput();
            return;
        }

        if (robot->strategy_command->has_controller()) {
            robot->controller.setInput(robot->strategy_command->controller(), time);
        }
    }
}

void Processor::handleStrategyHalt(bool blue)
{
    // stop every robot, used after strategy crash
    Team &team = blue ? m_blueTeam : m_yellowTeam;

    foreach (Robot *robot, team.robots) {
        robot->clearStrategyCommand();
        robot->controller.clearInput();
    }
}

void Processor::sendTeams()
{
    // notify everyone about team changes
    Status status(new amun::Status);
    status->mutable_team_blue()->CopyFrom(m_blueTeam.team);
    status->mutable_team_yellow()->CopyFrom(m_yellowTeam.team);
    emit sendStatus(status);
}

void Processor::setScaling(double scaling)
{
    // update scaling as told
    if (scaling <= 0) {
        m_trigger->stop();
    } else {
        const int t = 10 / scaling;
        m_trigger->start(qMax(1, t));
    }
}
