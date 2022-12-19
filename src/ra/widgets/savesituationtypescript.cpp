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

#include "savesituation.h"
#include "protobuf/world.pb.h"
#include "google/protobuf/util/json_util.h"
#include <QFileDialog>
#include <QFile>
#include <QRegExp>
#include <QTextStream>

static QString formatJson(QString input, QMap<QString, QString> enumReplacements)
{
    if (input.startsWith("{")) {
        input.prepend("\t\t");
    }
    input.replace("\n ", "\n\t\t\t");
    input.replace("\n{", "\n\t\t{");
    input.replace("\n}", "\n\t\t}");
    for (int i = 0;i<10;i++) {
        input.replace("\t ", "\t\t");
    }
    if (input.endsWith("\n")) {
        input.chop(1);
    }
    // the json converter takes 64 bit integers and expresses them as a string,
    // as they can not be perfectly represented as a double
    // Therefore, this codes finds these cases and converts it properly, possibly loosing some precision in the number
    input.replace(QRegExp("\\\"([0-9]+)\\\""), "\\1");

    for (const auto &rep : enumReplacements.keys()) {
        input.replace(QRegExp(rep + "\\\": \\\"([A-Z_a-z0-9]+)\\\""), rep + "\": " + enumReplacements[rep] + ".\\1");
    }
    return input;
}

void saveSituationTypescript(TrackingFrom useTrackingFrom, world::State worldState, amun::GameState gameState,
                             const world::Geometry &geometry, const QHash<uint, robot::Specs> &blueRobots,
                             const QHash<uint, robot::Specs> &yellowRobots)
{

    QString filename = QFileDialog::getSaveFileName(NULL, "Save File...",
        QString(), "Typescript files (*.ts)");

    if (!filename.endsWith(".ts")) {
        filename += ".ts";
    }
    QFile file(filename);
    if (!file.open(QIODevice::WriteOnly)) {
        return;
    }

    // get rid of some unwanted fields that will only pollute the file and are not necessary for the strategy
    // this is the same as in js_amun getWorldState
    worldState.clear_vision_frames();
    worldState.clear_simple_tracking_blue();
    worldState.clear_simple_tracking_yellow();
    worldState.clear_radio_response();
    worldState.clear_reality();

    gameState.clear_game_event_2019();

    google::protobuf::util::JsonPrintOptions printOptions;
    printOptions.add_whitespace = true;
    printOptions.always_print_primitive_fields = false;
    printOptions.preserve_proto_field_names = true; // use snake case not camel case
    printOptions.always_print_enums_as_ints = false;

    std::string worldJson, gameStateJson, geomtryJson;
    google::protobuf::util::MessageToJsonString(worldState, &worldJson, printOptions);
    google::protobuf::util::MessageToJsonString(gameState, &gameStateJson, printOptions);
    google::protobuf::util::MessageToJsonString(geometry, &geomtryJson, printOptions);

    QTextStream situation(&file);
    situation <<"import * as pb from \"base/protobuf\";\n\n";
    situation <<"export const partialAmun: any = {\n";
    situation <<"\tgetWorldState(): pb.world.State {\n\t\treturn "<<formatJson(QString::fromStdString(worldJson),
                                                                         {{"world_source", "pb.world.WorldSource"}})<<";\n\t},\n\n";

    QString formattedGeometry = formatJson(QString::fromStdString(geomtryJson),
                                           {{"type", "pb.world.Geometry.GeometryType"}, {"division", "pb.world.Geometry.Division"}});
    situation <<"\tgetGeometry(): pb.world.Geometry {\n\t\treturn "<<formattedGeometry<<";\n\t},\n\n";

    situation <<"\tisBlue(): boolean { return "<<(useTrackingFrom == TrackingFrom::BLUE ? "true" : "false")<<"; },\n\n";

    QString formattedGameState = formatJson(QString::fromStdString(gameStateJson),
                                            {{"stage", "pb.SSL_Referee.Stage"}, {"state", "pb.amun.GameState.State"}});
    situation <<"\tgetGameState(): pb.amun.GameState {\n\t\treturn "<<formattedGameState<<";\n\t},\n\n";

    const auto robots = useTrackingFrom == TrackingFrom::BLUE ? blueRobots : yellowRobots;
    situation <<"\tgetTeam(): pb.robot.Team {\n\t\treturn { robot: [";
    bool first = true;
    for (const robot::Specs &robot : robots) {
        std::string robotString;
        google::protobuf::util::MessageToJsonString(robot, &robotString, printOptions);
        QString formattedString = formatJson(QString::fromStdString(robotString), {{"type", "pb.robot.Specs.GenerationType"}});
        if (first) {
            formattedString.remove(0, 2);
            first = false;
        }
        situation << formattedString <<",\n";
    }

    situation<<"\t\t] };\n\t},\n";
    situation <<"};\n";
}
