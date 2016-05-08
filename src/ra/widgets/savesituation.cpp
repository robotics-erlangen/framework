/***************************************************************************
 *   Copyright 2015 Alexander Danzer                                       *
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
#include <QFileDialog>
#include <QFile>
#include <QTextStream>

typedef google::protobuf::RepeatedPtrField<world::Robot> RobotPtr;

void writeRobots(QTextStream& situation, const RobotPtr& robots){
    for(RobotPtr::const_iterator iter = robots.begin(); iter != robots.end(); ++iter){
        situation << "\t\t[" << iter->id() << "] = {\n\t\t\tpos = Vector("
                  << iter->p_x() << "," << iter->p_y() << "),\n\t\t\tdir = Vector.fromAngle("
                  << iter->phi() << "),\n\t\t\tspeed = Vector(" << iter->v_x() << ","
                  << iter->v_y() << "),\n\t\t\tangularSpeed = Vector.fromAngle("
                  << iter->omega() << ")\n\t\t},\n";
    }
}

void saveSituation(const world::State &worldState, const amun::GameState& gameState){
    QString filename = QFileDialog::getSaveFileName(NULL, "Save File...",
        QString(), "Lua files (*.lua)");
    if(!filename.endsWith(".lua")){
        filename += ".lua";
    }
    QFile file(filename);
    if(file.open(QIODevice::WriteOnly)){
        QTextStream situation(&file);
        situation << "local situation = {\n";
        if(gameState.has_state()){
            situation << "\trefereeState = \"" <<  gameState.State_Name(gameState.state()).c_str() << "\",\n";
        }
        if(gameState.has_stage()){
            situation << "\tgameStage = \"" << SSL_Referee::Stage_Name(gameState.stage()).c_str() << "\",\n";
        }
        if(worldState.has_ball()){
            situation << "\tball = { pos = Vector(" << worldState.ball().p_x()
                      << ',' << worldState.ball().p_y() << "), speed = Vector(" << worldState.ball().v_x()
                      << ',' << worldState.ball().v_y() << ") },\n";
        }
        if(gameState.blue().has_goalie()){
            situation << "\tblueGoalie = " << gameState.blue().goalie() << ",\n";
        }
        if(worldState.blue_size() > 0){
            situation << "\tblueRobots = {\n";
            writeRobots(situation, worldState.blue());
            situation << "\t},\n";
        }
        if(gameState.yellow().has_goalie()){
            situation << "\tyellowGoalie = " << gameState.yellow().goalie() << ",\n";
        }
        if(worldState.yellow_size() > 0){
            situation << "\tyellowRobots = {\n";
            writeRobots(situation, worldState.yellow());
            situation << "\t},\n";
        }
        situation <<  "}\n\nreturn situation\n";
        file.close();
    }
}
