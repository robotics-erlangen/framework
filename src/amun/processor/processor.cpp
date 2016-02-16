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

#include "accelerator.h"
#include "controller.h"
#include "processor.h"
#include "referee.h"
#include "core/timer.h"
#include "tracking/tracker.h"
#include <cmath>
#include <QTimer>

struct Processor::Robot
{
    explicit Robot(const robot::Specs &specs) :
        controller(specs),
        accelerator(specs),
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
        delete strategy_command;
        strategy_command = NULL;
    }

    bool setStrategyCommand(const void *data, int size)
    {
        if (!strategy_command) {
            strategy_command = new robot::Command;
        }
        return strategy_command->ParseFromArray(data, size);
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

    Controller controller;
    Accelerator accelerator;
    robot::Command *strategy_command;
    robot::Command *manual_command;
};

/*!
 * \class Processor
 * \ingroup processor
 * \brief Thread with fixed period for tracking and motion control
 */

/*!
 * \brief Constructs a Processor
 * \param timer Timer to be used for time scaling
 */
Processor::Processor(const Timer *timer) :
    m_timer(timer),
    m_networkCommandTime(0),
    m_refereeInternalActive(false),
    m_simulatorEnabled(false),
    m_transceiverEnabled(false)
{
    // keep two separate referee states
    m_referee = new Referee(false);
    m_refereeInternal = new Referee(true);
    m_tracker = new Tracker;

    // start processing
    m_trigger = new QTimer(this);
    connect(m_trigger, SIGNAL(timeout()), SLOT(process()));
    m_trigger->setTimerType(Qt::PreciseTimer);
    m_trigger->start(10);
}

/*!
 * \brief Destroys the Processor
 */
Processor::~Processor()
{
    delete m_tracker;
    delete m_refereeInternal;
    delete m_referee;

    qDeleteAll(m_blueTeam.robots);
    qDeleteAll(m_yellowTeam.robots);
}

void Processor::process()
{
    const qint64 tracker_start = Timer::systemTime();

    const qint64 current_time = m_timer->currentTime();
    // the controller runs with 100 Hz -> 10ms ticks
    const qint64 tickDuration = 10 * 1000 * 1000;

    // run tracking
    m_tracker->process(current_time);
    Status status = m_tracker->worldState(current_time);
    // prediction which accounts for the strategy runtime
    Status strategyStatus = m_tracker->worldState(current_time + tickDuration);

    // add information, about whether the world state is from the simulator or not
    status->mutable_world_state()->set_is_simulated(m_simulatorEnabled);
    strategyStatus->mutable_world_state()->set_is_simulated(m_simulatorEnabled);

    // run referee
    Referee* activeReferee = (m_refereeInternalActive) ? m_refereeInternal : m_referee;
    activeReferee->process(status->world_state());
    status->mutable_game_state()->CopyFrom(activeReferee->gameState());
    strategyStatus->mutable_game_state()->CopyFrom(activeReferee->gameState());

    // add radio responses from robots and mixed team data
    injectExtraData(status);
    injectExtraData(strategyStatus);
    // remove responses after injecting to avoid sending them a second time
    m_responses.clear();
    m_mixedTeamInfo.Clear();
    m_mixedTeamInfoSet = false;

    // add input / commands from the user for the strategy
    injectUserControl(strategyStatus, true);
    injectUserControl(strategyStatus, false);
    // copy to other status message
    status->mutable_user_input_yellow()->CopyFrom(strategyStatus->user_input_yellow());
    status->mutable_user_input_blue()->CopyFrom(strategyStatus->user_input_blue());

    //publish world status
    emit sendStatus(status);
    emit sendStrategyStatus(strategyStatus);

    Status status_debug(new amun::Status);
    const qint64 controller_start = Timer::systemTime();
    // just ignore the referee for timing
    status_debug->mutable_timing()->set_tracking((controller_start - tracker_start) / 1E9);

    status_debug->mutable_debug()->set_source(amun::Controller);
    QList<robot::RadioCommand> radio_commands;

    // assume that current_time is still "now"
    const qint64 controllerTime = current_time + tickDuration;
    processTeam(m_blueTeam, true, status->world_state().blue(), radio_commands, status_debug, controllerTime);
    processTeam(m_yellowTeam, false, status->world_state().yellow(), radio_commands, status_debug, controllerTime);

    status_debug->mutable_timing()->set_controller((Timer::systemTime() - controller_start) / 1E9);
    emit sendStatus(status_debug);

    if (m_transceiverEnabled) {
        // the command is the target for controllerTime and should be applied by then
        m_tracker->queueRadioCommands(radio_commands, controllerTime);
        emit sendRadioCommands(radio_commands);
    }
}

const world::Robot* Processor::getWorldRobot(const RobotList &robots, uint id) {
    for (RobotList::const_iterator it = robots.begin(); it != robots.end(); ++it) {
        const world::Robot &robot = *it;
        if (robot.id() == id) {
            return &robot;
        }
    }
    // If no robot was found return null
    return NULL;
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

        if (robot->manual_command->network_controlled()
                && m_networkCommandTime + 200*1000*1000 > status->world_state().time()
                && m_networkCommand.contains(robot->controller.specs().id())) {

            const SSL_RadioProtocolCommand &cmd = m_networkCommand[robot->controller.specs().id()];

            robot->manual_command->set_v_f(cmd.velocity_x());
            robot->manual_command->set_v_s(-cmd.velocity_y());
            robot->manual_command->set_omega(cmd.velocity_r());
            if (cmd.has_flat_kick()) {
                robot->manual_command->set_kick_style(robot::Command::Linear);
                robot->manual_command->set_kick_power(cmd.flat_kick());
            } else if (cmd.has_chip_kick()) {
                robot->manual_command->set_kick_style(robot::Command::Chip);
                robot->manual_command->set_kick_power(cmd.chip_kick());
            }
            robot->manual_command->set_dribbler(cmd.dribbler_spin());
            robot->manual_command->set_direct(true);
        }

        if (!robot->manual_command->strategy_controlled()) {
            continue;
        }

        robot::RadioCommand *radio_command = userInput->add_radio_command();
        radio_command->set_generation(robot->controller.specs().generation());
        radio_command->set_id(robot->controller.specs().id());
        radio_command->set_is_blue(isBlue);
        radio_command->mutable_command()->CopyFrom(*robot->manual_command);
    }
}

void Processor::processTeam(Team &team, bool isBlue, const RobotList &robots, QList<robot::RadioCommand> &radio_commands, Status &status, qint64 time)
{
    foreach (Robot *robot, team.robots) {
        robot::RadioCommand *radio_command = status->add_radio_command();
        radio_command->set_generation(robot->controller.specs().generation());
        radio_command->set_id(robot->controller.specs().id());
        radio_command->set_is_blue(isBlue);

        robot::Command& command = *radio_command->mutable_command();

        if (robot->manual_command && !robot->manual_command->strategy_controlled()) {
            // use manual command, if available
            // this has precedence over any strategy command
            command.CopyFrom(*robot->manual_command);
            command.set_strategy_controlled(false);
        } else if (robot->strategy_command) {
            // copy strategy command
            command.CopyFrom(*robot->strategy_command);
            command.set_strategy_controlled(true);
        } else {
            // no command -> standby
            command.set_standby(true);
            command.set_strategy_controlled(false);
        }

        if (robot->manual_command && robot->manual_command->eject_sdcard()) {
            command.set_eject_sdcard(true);
        }

        // Get current robot
        const world::Robot* currentRobot = getWorldRobot(robots, robot->controller.specs().id());
        // only run controller if we know where the robot is
        if (currentRobot) {
            robot->controller.calculateCommand(*currentRobot, time, command, status->mutable_debug());
        }

        // Limit acceleration and velocities (in global coordinates)
        // if robot is invisible use local coordinates
        updateCommandVGlobal(currentRobot, command);
        robot->accelerator.limit(currentRobot, command, time, status->mutable_debug());
        updateCommandVLocal(currentRobot, command);

        // Prepare radio command
        radio_commands.append(*radio_command);
    }
}

// Transform local robot coordinates to global field coordinates
void Processor::updateCommandVGlobal(const world::Robot *robot, robot::Command &command) {
    float robot_phi = 0;
    if (robot) {
        // coordinate systems are x-y and s-f for the right-up axis
        // moving in x direction = moving in forward direction -> 90 degree cw
        robot_phi = robot->phi() - M_PI_2;
    }
    // rotate ccw
    command.set_v_x(std::cos(robot_phi) * command.v_s() - std::sin(robot_phi) * command.v_f());
    command.set_v_y(std::sin(robot_phi) * command.v_s() + std::cos(robot_phi) * command.v_f());
}

// Transform global field coordinates to local robot coordinates
void Processor::updateCommandVLocal(const world::Robot *robot, robot::Command &command) {
    float robot_phi = 0;
    if (robot) {
        robot_phi = robot->phi() - M_PI_2;
    }
    // rotate cw
    command.set_v_s(std::cos(-robot_phi) * command.v_x() - std::sin(-robot_phi) * command.v_y());
    command.set_v_f(std::sin(-robot_phi) * command.v_x() + std::cos(-robot_phi) * command.v_y());
}

void Processor::handleRefereePacket(const QByteArray &data, qint64 /*time*/)
{
    m_referee->handlePacket(data);
}

void Processor::handleVisionPacket(const QByteArray &data, qint64 time)
{
    m_tracker->queuePacket(data, time);
}

void Processor::handleNetworkCommand(const QByteArray &data, qint64 time)
{
    m_networkCommand.clear();
    m_networkCommandTime = time;
    SSL_RadioProtocolWrapper wrapper;
    wrapper.ParseFromArray(data.constData(), data.size());
    for (int i = 0; i < wrapper.command_size(); ++i) {
        const SSL_RadioProtocolCommand &cmd = wrapper.command(i);
        m_networkCommand[cmd.robot_id()] = cmd;
    }
}

void Processor::handleMixedTeamInfo(const QByteArray &data, qint64 time)
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

    if (command->has_set_team_blue()) {
        setTeam(command->set_team_blue(), m_blueTeam);
        teamsChanged = true;
    }

    if (command->has_set_team_yellow()) {
        setTeam(command->set_team_yellow(), m_yellowTeam);
        teamsChanged = true;
    }

    if (command->has_simulator() && command->simulator().has_enable()) {
        m_tracker->reset();
        m_simulatorEnabled = command->simulator().enable();
    }

    if (teamsChanged) {
        m_tracker->reset();
        sendTeams();
    }

    if (command->has_flip()) {
        m_tracker->setFlip(command->flip());
    }

    if (command->has_referee()) {
        if (command->referee().has_active()) {
            m_refereeInternalActive = command->referee().active();
        }

        if (command->referee().has_command()) {
            const std::string &c = command->referee().command();
            m_refereeInternal->handlePacket(QByteArray(c.data(), c.size()));
        }
    }

    if (command->has_control()) {
        handleControl(m_blueTeam, command->control());
        handleControl(m_yellowTeam, command->control());
    }

    if (command->has_tracking()) {
        m_tracker->handleCommand(command->tracking());
    }

    if (command->has_transceiver()) {
        const amun::CommandTransceiver &t = command->transceiver();
        if (t.has_enable()) {
            m_transceiverEnabled = t.enable();
        }
    }
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
void Processor::handleStrategyCommand(bool blue, uint generation, uint id, QByteArray data, qint64 time)
{
    Team &team = blue ? m_blueTeam : m_yellowTeam;
    Robot *robot = team.robots.value(qMakePair(generation, id));
    if (!robot) {
        // invalid id
        return;
    }

    // halt robot on invalid strategy command
    if (!robot->setStrategyCommand(data.data(), data.size())) {
        robot->clearStrategyCommand();
        robot->controller.clearInput();
        return;
    }

    if (robot->strategy_command->has_controller()) {
        robot->controller.setInput(robot->strategy_command->controller(), time);
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

void Processor::setScaling(float scaling)
{
    // update scaling as told
    if (scaling <= 0) {
        m_trigger->stop();
    } else {
        const int t = 10 / scaling;
        m_trigger->start(qMax(1, t));
    }
}
