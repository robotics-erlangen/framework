/***************************************************************************
 *   Copyright 2015 Alexander Danzer, 2020 Andreas Wendler                 *
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

#include "savesituation.h"
#include "protobuf/world.pb.h"
#include "protobuf/ssl_referee.h"
#include "core/vector.h"
#include "core/coordinates.h"
#include <QFileDialog>
#include <QFile>
#include <QTextStream>

typedef google::protobuf::RepeatedPtrField<world::Robot> RobotPtr;

static void writeRobots(QTextStream& situation, const RobotPtr& robots, bool is_blue)
{
    for (RobotPtr::const_iterator iter = robots.begin(); iter != robots.end(); ++iter) {
        situation <<"\t\t\t\t\t\t{"<<Qt::endl;
        situation <<"\t\t\t\t\t\t\tid = {"<<Qt::endl;
        situation <<"\t\t\t\t\t\t\t\tid = "<<iter->id()<<","<<Qt::endl;
        situation <<"\t\t\t\t\t\t\t\tteam = \"" << (is_blue ? "BLUE": "YELLOW")<<"\""<<Qt::endl;
        situation <<"\t\t\t\t\t\t\t},"<<Qt::endl;
        Vector amunPos, visPos;
        amunPos.x = iter->p_x();
        amunPos.y = iter->p_y();
        coordinates::toVision(amunPos, visPos);
        situation <<"\t\t\t\t\t\t\tx = "<<visPos.x<<","<<Qt::endl;
        situation <<"\t\t\t\t\t\t\ty = "<<visPos.y<<","<<Qt::endl;
        situation <<"\t\t\t\t\t\t\torientation = "<<coordinates::toVisionRotation(iter->phi())<<","<<Qt::endl;
        Vector visSpeed;
        coordinates::toVisionVelocity(*iter, visSpeed);
        situation <<"\t\t\t\t\t\t\tv_x = "<<visSpeed.x<<","<<Qt::endl;
        situation <<"\t\t\t\t\t\t\tv_y = "<<visSpeed.y<<","<<Qt::endl;
        situation <<"\t\t\t\t\t\t\tomega = "<<iter->omega()<<Qt::endl;
        situation<<"\t\t\t\t\t\t},"<<Qt::endl;
    }
}

void saveSituation(world::State worldState, amun::GameState gameState)
{

    QString filename = QFileDialog::getSaveFileName(NULL, "Save File...",
        QString(), "Lua files (*.lua)");

    if (!filename.endsWith(".lua")) {
        filename += ".lua";
    }
    QFile file(filename);
    if (file.open(QIODevice::WriteOnly)) {
        QTextStream situation(&file);

        // this creates a lua strategy that will re-create the situation with a SimulatorCommand when it is run

        // preamble
        situation <<"require \"amun\""<<Qt::endl<<Qt::endl;
        situation <<"local frameCounter = 0"<<Qt::endl;
        situation <<"local function createSituation()"<<Qt::endl;
        situation <<"\tif frameCounter == 0 then"<<Qt::endl;
        situation <<"\t\tlocal command = {"<<Qt::endl;

        // simulator command containing the ball and robots
        situation <<"\t\t\tsimulator = {"<<Qt::endl;
        situation <<"\t\t\t\tssl_control = {"<<Qt::endl;

        if (worldState.has_ball()) {
            situation <<"\t\t\t\t\tteleport_ball = {"<<Qt::endl;
            Vector amunPos, visPos;
            amunPos.x = worldState.ball().p_x();
            amunPos.y = worldState.ball().p_y();
            coordinates::toVision(amunPos, visPos);
            situation <<"\t\t\t\t\t\tx = "<<visPos.x<<","<<Qt::endl;
            situation <<"\t\t\t\t\t\ty = "<<visPos.y<<","<<Qt::endl;
            situation <<"\t\t\t\t\t\tz = "<<worldState.ball().p_z() * 1e3 <<","<<Qt::endl;
            situation <<"\t\t\t\t\t\tteleport_safely = true,"<<Qt::endl;
            Vector visSpeed;
            coordinates::toVisionVelocity(worldState.ball(), visSpeed);
            situation <<"\t\t\t\t\t\t\tvx = "<<visSpeed.x<<","<<Qt::endl;
            situation <<"\t\t\t\t\t\t\tvy = "<<visSpeed.y<<","<<Qt::endl;
            situation <<"\t\t\t\t\t\tvz = "<<worldState.ball().v_z() * 1e3 <<Qt::endl;
            situation <<"\t\t\t\t\t},"<<Qt::endl; // move_ball
        }

        situation << "\t\t\t\t\tteleport_robot = {" << Qt::endl;

        // robots
        if (worldState.yellow_size() > 0) {
            writeRobots(situation, worldState.yellow(), false);
        }
        if (worldState.blue_size() > 0) {
            writeRobots(situation, worldState.blue(), true);
        }

        situation << "\t\t\t\t\t},"<<Qt::endl; // teleport_robot
        situation <<"\t\t\t\t}"<<Qt::endl; // ssl_control
        situation <<"\t\t\t}"<<Qt::endl; // simulator
        situation <<"\t\t}"<<Qt::endl; // command
        situation <<"\t\tamun.sendCommand(command)"<<Qt::endl;

        // send referee command to set goalies, game stage etc.
        situation <<"\t\tlocal referee = {"<<Qt::endl;
        // required fields are initialised with some values, should not be important
        situation <<"\t\t\tpacket_timestamp = 0, command_counter = 0, command_timestamp = 0,"<<Qt::endl;
        if (gameState.has_state()) {
            situation <<"\t\t\tcommand = \""<<SSL_Referee::Command_Name(commandFromGameState(gameState.state())).c_str()<<"\","<<Qt::endl;
        }
        if (gameState.has_stage()) {
            situation <<"\t\t\tstage = \""<<SSL_Referee::Stage_Name(gameState.stage()).c_str()<<"\","<<Qt::endl;
        }

        // the other parts of the TeamInfo message are just ignored, they are not as important
        if (gameState.has_blue() && gameState.blue().has_goalie()) {
            situation <<"\t\t\tblue = { name = \"\", score = 0, red_cards = 0, yellow_cards = 0, timeouts = 0, timeout_time = 0, goalie = "<<gameState.blue().goalie()<<" },"<<Qt::endl;
        }
        if (gameState.has_yellow() && gameState.yellow().has_goalie()) {
            situation <<"\t\t\tyellow = { name = \"\", score = 0, red_cards = 0, yellow_cards = 0, timeouts = 0, timeout_time = 0, goalie = "<<gameState.yellow().goalie()<<" },"<<Qt::endl;
        }

        // include the goals_flipped (noted as !blueteamonpositivehalf)
        if (gameState.has_goals_flipped()) {
            situation <<"\t\t\tblueTeamOnPositiveHalf = " << (!gameState.goals_flipped() ? "true" : "false") << ","<<Qt::endl;
        }

        if (gameState.state() == amun::GameState_State_BallPlacementBlue || gameState.state() == amun::GameState_State_BallPlacementYellow) {
            auto visPos = gameState.designated_position();
            situation <<"\t\t\tdesignated_position = { x = " << visPos.x() << ", y = " << visPos.y() << " },"<<Qt::endl;
        }

        situation <<"\t\t}"<<Qt::endl; // referee
        situation <<"\t\tamun.sendRefereeCommand(referee)"<<Qt::endl;

        // remainder of the script to finish the function and create an entrypoint
        situation <<"\tend"<<Qt::endl; // if frameCounter == 0
        situation <<"\tframeCounter = frameCounter + 1"<<Qt::endl;
        situation <<"end"<<Qt::endl; // function createSituation
        situation <<Qt::endl;
        situation <<"return {name = \"Create\", entrypoints = {Situation = createSituation} }"<<Qt::endl;

        file.close();
    }
}
