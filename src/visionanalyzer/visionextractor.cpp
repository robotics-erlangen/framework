/***************************************************************************
 *   Copyright 2018 Tobias Heineken                                        *
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

#include <clocale>
#include <QCoreApplication>
#include <QCommandLineParser>

#include "logfile/logfilereader.h"
#include "visionlog/visionlogwriter.h"

int main(int argc, char* argv[])
{
    QCoreApplication app(argc, argv);
    app.setApplicationName("Vision Extractor");
    app.setOrganizationName("ER-Force");

    std::setlocale(LC_NUMERIC, "C");

    QCommandLineParser parser;
    parser.setApplicationDescription("Extracts a vision log from the ER-Force log format");
    parser.addHelpOption();
    parser.addPositionalArgument("source", "The log file to read");

    QCommandLineOption outputDirOption(QStringList() << "o" << "output",
                                       "Location to output the resulting log file",
                                       "outputFile", "va_out.log");
    parser.addOption(outputDirOption);
    parser.process(app);

    int argCount = parser.positionalArguments().size();
    if (argCount < 1) {
        parser.showHelp(1);
        app.exit(1);
    }

    LogFileReader logfileIn;
    logfileIn.open(parser.positionalArguments().first());

    VisionLogWriter logfileOut(parser.value(outputDirOption));

    amun::GameState::State lastState = amun::GameState::Halt;
    qint64 gameStateChangeTime = logfileIn.readStatus(0)->time();
    quint32 refereeCounter = 0;
    SSL_Referee::Command lastCommand = SSL_Referee::HALT;

    for(int i = 0; i < logfileIn.packetCount(); ++i){
        Status current = logfileIn.readStatus(i);

        if (current->has_world_state()) {
            for (const auto &frame : current->world_state().vision_frames()) {
                logfileOut.addVisionPacket(frame, current->time());
            }
        }

        if (current->has_game_state()) {
            const auto &gameState = current->game_state();
            SSL_Referee refereePacket;
            refereePacket.set_packet_timestamp((quint64)current->time());
            refereePacket.set_stage(gameState.stage());
            if (gameState.has_stage_time_left()) {
                refereePacket.set_stage_time_left(gameState.stage_time_left());
            }
            if (gameState.state() != lastState) {
                lastState = gameState.state();
                gameStateChangeTime = current->time();
                refereeCounter++;

                switch (gameState.state()) {
                case amun::GameState::Halt: lastCommand = SSL_Referee::HALT; break;
                case amun::GameState::Stop: lastCommand = SSL_Referee::STOP; break;
                case amun::GameState::GameForce: lastCommand = SSL_Referee::FORCE_START; break;
                case amun::GameState::KickoffYellowPrepare: lastCommand = SSL_Referee::PREPARE_KICKOFF_YELLOW; break;
                case amun::GameState::KickoffYellow: lastCommand = SSL_Referee::NORMAL_START; break;
                case amun::GameState::PenaltyYellowPrepare: lastCommand = SSL_Referee::PREPARE_PENALTY_YELLOW; break;
                case amun::GameState::PenaltyYellow: lastCommand = SSL_Referee::NORMAL_START; break;
                case amun::GameState::DirectYellow: lastCommand = SSL_Referee::DIRECT_FREE_YELLOW; break;
                case amun::GameState::IndirectYellow: lastCommand = SSL_Referee::INDIRECT_FREE_YELLOW; break;
                case amun::GameState::BallPlacementYellow: lastCommand = SSL_Referee::BALL_PLACEMENT_YELLOW; break;
                case amun::GameState::KickoffBluePrepare: lastCommand = SSL_Referee::PREPARE_PENALTY_BLUE; break;
                case amun::GameState::KickoffBlue: lastCommand = SSL_Referee::NORMAL_START; break;
                case amun::GameState::PenaltyBluePrepare: lastCommand = SSL_Referee::PREPARE_PENALTY_BLUE; break;
                case amun::GameState::PenaltyBlue: lastCommand = SSL_Referee::NORMAL_START; break;
                case amun::GameState::DirectBlue: lastCommand = SSL_Referee::DIRECT_FREE_BLUE; break;
                case amun::GameState::IndirectBlue: lastCommand = SSL_Referee::INDIRECT_FREE_BLUE; break;
                case amun::GameState::BallPlacementBlue: lastCommand = SSL_Referee::BALL_PLACEMENT_BLUE; break;
                case amun::GameState::TimeoutYellow: lastCommand = SSL_Referee::TIMEOUT_YELLOW; break;
                case amun::GameState::TimeoutBlue: lastCommand = SSL_Referee::TIMEOUT_BLUE; break;
                default: break;
                }
            }
            refereePacket.set_command(lastCommand);
            refereePacket.set_command_counter(refereeCounter);
            refereePacket.set_command_timestamp((quint64)gameStateChangeTime);
            refereePacket.mutable_yellow()->CopyFrom(gameState.yellow());
            refereePacket.mutable_blue()->CopyFrom(gameState.blue());
            if (gameState.has_designated_position()) {
                refereePacket.mutable_designated_position()->CopyFrom(gameState.designated_position());
            }
            if (gameState.has_goals_flipped()) {
                refereePacket.set_blueteamonpositivehalf(!gameState.goals_flipped());
            }
            if (gameState.has_game_event()) {
                refereePacket.mutable_gameevent()->CopyFrom(gameState.game_event());
            }
            logfileOut.addRefereePacket(refereePacket, current->time());
        }
    }
}
