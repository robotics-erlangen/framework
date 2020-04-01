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
#include <QFileDialog>
#include <QFile>
#include <QTextStream>

typedef google::protobuf::RepeatedPtrField<world::Robot> RobotPtr;

static void writeRobots(QTextStream& situation, const RobotPtr& robots)
{
    for (RobotPtr::const_iterator iter = robots.begin(); iter != robots.end(); ++iter) {
        situation <<"\t\t\t\t\t{"<<endl;
        situation <<"\t\t\t\t\t\tid = "<<iter->id()<<","<<endl;
        situation <<"\t\t\t\t\t\tp_x = "<<iter->p_x()<<","<<endl;
        situation <<"\t\t\t\t\t\tp_y = "<<iter->p_y()<<","<<endl;
        situation <<"\t\t\t\t\t\tphi = "<<iter->phi()<<","<<endl;
        situation <<"\t\t\t\t\t\tposition = true,"<<endl;
        situation <<"\t\t\t\t\t\tv_x = "<<iter->v_x()<<","<<endl;
        situation <<"\t\t\t\t\t\tv_y = "<<iter->v_y()<<","<<endl;
        situation <<"\t\t\t\t\t\tomega = "<<iter->omega()<<endl;
        situation<<"\t\t\t\t\t},"<<endl;
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
        situation <<"require \"amun\""<<endl<<endl;
        situation <<"local frameCounter = 0"<<endl;
        situation <<"local function createSituation()"<<endl;
        situation <<"\tif frameCounter == 0 then"<<endl;
        situation <<"\t\tlocal command = {"<<endl;

        // simulator command containing the ball and robots
        situation <<"\t\t\tsimulator = {"<<endl;

        if (worldState.has_ball()) {
            situation <<"\t\t\t\tmove_ball = {"<<endl;
            situation <<"\t\t\t\t\tp_x = "<<worldState.ball().p_x()<<","<<endl;
            situation <<"\t\t\t\t\tp_y = "<<worldState.ball().p_y()<<","<<endl;
            situation <<"\t\t\t\t\tp_z = "<<worldState.ball().p_z()<<","<<endl;
            situation <<"\t\t\t\t\tposition = true,"<<endl;
            situation <<"\t\t\t\t\tv_x = "<<worldState.ball().v_x()<<","<<endl;
            situation <<"\t\t\t\t\tv_y = "<<worldState.ball().v_y()<<","<<endl;
            situation <<"\t\t\t\t\tv_z = "<<worldState.ball().v_z()<<endl;
            situation <<"\t\t\t\t},"<<endl; // move_ball
        }

        // robots
        if (worldState.yellow_size() > 0) {
            situation <<"\t\t\t\tmove_yellow = {"<<endl;
            writeRobots(situation, worldState.yellow());
            situation<<"\t\t\t\t},"<<endl; // move_yellow
        }
        if (worldState.blue_size() > 0) {
            situation <<"\t\t\t\tmove_blue = {"<<endl;
            writeRobots(situation, worldState.yellow());
            situation<<"\t\t\t\t},"<<endl; // move_yellow
        }

        situation <<"\t\t\t}"<<endl; // simulator
        situation <<"\t\t}"<<endl; // command
        situation <<"\t\tamun.sendCommand(command)"<<endl;

        // send referee command to set goalies, game stage etc.
        situation <<"\t\tlocal referee = {"<<endl;
        // required fields are initialised with some values, should not be important
        situation <<"\t\t\tpacket_timestamp = 0, command_counter = 0, command_timestamp = 0,"<<endl;
        if (gameState.has_state()) {
            situation <<"\t\t\tcommand = \""<<SSL_Referee::Command_Name(commandFromGameState(gameState.state())).c_str()<<"\","<<endl;
        }
        if (gameState.has_stage()) {
            situation <<"\t\t\tstage = \""<<SSL_Referee::Stage_Name(gameState.stage()).c_str()<<"\","<<endl;
        }

        // the other parts of the TeamInfo message are just ignored, they are not as important
        if (gameState.has_blue() && gameState.blue().has_goalie()) {
            situation <<"\t\t\tblue = { name = \"\", score = 0, red_cards = 0, yellow_cards = 0, timeouts = 0, timeout_time = 0, goalie = "<<gameState.blue().goalie()<<" },"<<endl;
        }
        if (gameState.has_yellow() && gameState.yellow().has_goalie()) {
            situation <<"\t\t\tyellow = { name = \"\", score = 0, red_cards = 0, yellow_cards = 0, timeouts = 0, timeout_time = 0, goalie = "<<gameState.yellow().goalie()<<" },"<<endl;
        }
        situation <<"\t\t}"<<endl; // referee
        situation <<"\t\tamun.sendRefereeCommand(referee)"<<endl;

        // remainder of the script to finish the function and create an entrypoint
        situation <<"\tend"<<endl; // if frameCounter == 0
        situation <<"\tframeCounter = frameCounter + 1"<<endl;
        situation <<"end"<<endl; // function createSituation
        situation <<endl;
        situation <<"return {name = \"Create\", entrypoints = {Situation = createSituation} }"<<endl;

        file.close();
    }
}
