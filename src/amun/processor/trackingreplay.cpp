/***************************************************************************
 *   Copyright 2021 Andreas Wendler                                        *
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

#include "trackingreplay.h"
#include "core/timer.h"
#include "core/configuration.h"

static const QString SENDER_NAME_FOR_REFEREE = "TrackingReplay";

TrackingReplay::TrackingReplay(Timer *timer) :
    m_timer(timer),
    m_replayProcessor(timer, true),
    m_refereeExtractor(timer->currentTime()),
    m_statusCache(2000)
{
    connect(&m_replayProcessor, &Processor::sendStatus, this, &TrackingReplay::ammendStatus);

    // disable the internal game controller and just use the referee packets from the log
    Command command(new amun::Command);
    command->mutable_referee()->set_active(false);

    // default ball model with the values used in the tracking before the global ball model was used
    // necessary for correct tracking replay of older logs
    world::BallModel ballModel;
    loadConfiguration("field-properties/simulator", &ballModel, false);
    ballModel.set_slow_deceleration(0.4f);
    ballModel.set_z_damping(0.55f);
    ballModel.set_xy_damping(0.7f);
    command->mutable_tracking()->mutable_ball_model()->CopyFrom(ballModel);

    m_replayProcessor.handleCommand(command);
}

void TrackingReplay::ammendStatus(const Status &status)
{
    status->set_time(m_timer->currentTime());
    if (!m_lastTrackingReplayGameState.isNull()) {
        // add game state information since the replay processor does not have the required data
        status->mutable_game_state()->CopyFrom(m_lastTrackingReplayGameState->game_state());
    }
    // yes, I also do not want to use smart pointers like this
    m_statusCache.insert(m_currentPacketString, new Status(status));
    emit gotStatus(status);
}

void TrackingReplay::handleStatus(const Status &status)
{
    const auto previousTime = m_timer->currentTime();
    m_timer->setTime(status->time(), 0);

    // the time does not uniquely identify a status packet, therefore use its full string as identifier
    // performance is not really a concern here, therefore serializing and hashing string is acceptable
    const QString identifier = QString::fromStdString(status->SerializeAsString());
    Status *cached = m_statusCache.object(identifier);
    if (cached != nullptr) {
        emit gotStatus(Status(*cached));
        return;
    }
    // since ammendStatus is called synchrenously, this is fine if a bit inelegant
    m_currentPacketString = identifier;

    if (status->has_game_state()) {
        m_lastTrackingReplayGameState = status;
    }
    if (previousTime > status->time()) {
        m_replayProcessor.resetTracking();
    }
    if (status->has_team_blue()) {
        Command command(new amun::Command);
        command->mutable_set_team_blue()->CopyFrom(status->team_blue());
        m_replayProcessor.handleCommand(command);
    }
    if (status->has_team_yellow()) {
        Command command(new amun::Command);
        command->mutable_set_team_yellow()->CopyFrom(status->team_yellow());
        m_replayProcessor.handleCommand(command);
    }
    if (status->has_geometry() && status->geometry().has_ball_model()) {
        Command command(new amun::Command);
        command->mutable_tracking()->mutable_ball_model()->CopyFrom(status->geometry().ball_model());
        m_replayProcessor.handleCommand(command);
    }

    // referee commands (mostly for which side is on which half)
    if (status->has_game_state()) {
        const SSL_Referee referee = m_refereeExtractor.convertGameState(status->game_state(), status->time());
        QByteArray data(referee.ByteSize(), 0);
        if (referee.SerializeToArray(data.data(), data.size())) {
            m_replayProcessor.handleRefereePacket(data, status->time(), SENDER_NAME_FOR_REFEREE);
        }
    }

    // radio commands
    {
        QMap<qint64, QList<RobotCommandInfo>> yellowRobotCommands, blueRobotCommands;
        auto time = m_timer->currentTime();
        for (const auto& command : status->radio_command()) {
            RobotCommandInfo info;
            info.generation = command.generation();
            info.robotId = command.id();
            info.command.reset(new robot::Command(command.command()));
            qint64 commandTime = command.has_command_time() ? command.command_time() : time;
            if (command.is_blue()) {
                blueRobotCommands[commandTime].append(info);
            } else {
                yellowRobotCommands[commandTime].append(info);
            }
        }
        for (qint64 time : yellowRobotCommands.keys()) {
            m_replayProcessor.handleStrategyCommands(false, yellowRobotCommands[time], time);
        }
        for (qint64 time : blueRobotCommands.keys()) {
            m_replayProcessor.handleStrategyCommands(true, blueRobotCommands[time], time);
        }
    }

    if (status->has_world_state()) {
        if (status->world_state().has_system_delay()) {
            Command command(new amun::Command);
            command->mutable_tracking()->set_system_delay(status->world_state().system_delay());
            m_replayProcessor.handleCommand(command);
        }
        for (int i = 0;i<status->world_state().vision_frames_size();i++) {
            auto vision = status->world_state().vision_frames(i);
            QByteArray visionData(vision.ByteSize(), 0);
            if (vision.SerializeToArray(visionData.data(), visionData.size())) {
                auto time = status->world_state().time();
                if (i < status->world_state().vision_frame_times_size()) {
                    time = status->world_state().vision_frame_times(i);
                }
                m_replayProcessor.handleVisionPacket(visionData, time, "replay");
            }
        }
        for (const auto &truth : status->world_state().reality()) {
            QByteArray simulatorData(truth.ByteSize(), 0);
            if (truth.SerializeToArray(simulatorData.data(), simulatorData.size())) {
                m_replayProcessor.handleSimulatorExtraVision(simulatorData);
            }
        }
        m_replayProcessor.process(status->world_state().time());
    }
}
