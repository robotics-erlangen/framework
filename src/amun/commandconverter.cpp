/***************************************************************************
 *   Copyright 2021 Tobias Heineken                                        *
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

#include "commandconverter.h"
#include "core/timer.h"
#include "core/coordinates.h"
#include <cmath>

void CommandConverter::handleRadioCommands(const QList<robot::RadioCommand> &commands, qint64 processingStart) {
    for (bool blueTeam : {true, false}) {
        SSLSimRobotControl control{new sslsim::RobotControl};
        for (const robot::RadioCommand &robot : commands) {
            if (robot.is_blue() != blueTeam) {
                continue;
            }
            auto* robotCommand = control->add_robot_commands();
            robotCommand->set_id(robot.id());
            if (robot.command().kick_power() > 0 && m_charge) {
                robotCommand->set_kick_speed(robot.command().kick_power());
                if (robot.command().kick_style() == robot::Command::Chip) {
                    robotCommand->set_kick_angle(45);
                    robotCommand->set_kick_speed(coordinates::chipVelFromChipDistance(robot.command().kick_power()));
                }
            }
            if (robot.command().has_dribbler()) {
                robotCommand->set_dribbler_speed(robot.command().dribbler() * 150 * 60 * .5f / M_PI ); // convert from 1 - 0 to rpm, where 1 is 150 rad/s
            }
            if (robot.command().has_output1()) {
                auto* moveCommand  = robotCommand->mutable_move_command()->mutable_local_velocity();
                moveCommand->set_forward(robot.command().output1().v_f());
                moveCommand->set_left(-robot.command().output1().v_s());
                moveCommand->set_angular(robot.command().output1().omega());
            }
        }
        emit sendSSLSim(control, blueTeam, processingStart);
    }
}

void CommandConverter::handleCommand(Command command) {
    if (command->has_transceiver()) {
        const amun::CommandTransceiver &t = command->transceiver();
        if (t.has_charge()) {
            m_charge = t.charge();
        }
    }
}

void CommandConverter::handleSimulatorErrors(const QList<SSLSimError>& errors) {
    if (errors.size() == 0) return;
    Status errorStatus = Status::createArena();
    errorStatus->set_time(m_timer->currentTime());
    amun::DebugValues* dV = nullptr;
    for(const auto& e : errors) {
        std::string result = "Error within simulator: ";
        if (e->has_message()) {
            result += e->message();
        }
        if (e->has_code()) {
            result += "[" + e->code() + "]";
        }

        if(dV == nullptr) {
            dV = errorStatus->add_debug();
            dV->set_time(m_timer->currentTime());
        }

        auto log = dV->add_log();
        log->set_timestamp(m_timer->currentTime());
        log->set_text(result);
    }
    emit sendStatus(errorStatus);

}
