/***************************************************************************
 *   Copyright 2020 Tobias Heineken, Andreas Wendler                       *
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

#include "visionconverter.h"
#include "visionlog/visionlogwriter.h"
#include "protobuf/ssl_referee.h"

QString VisionExtractor::extractVision(StatusSource& source, const QString& saveFileLocation)
{
    VisionLogWriter logfileOut(saveFileLocation);

    if (!logfileOut.isOpen()) {
        return QString("Error opening file %1 for writing").arg(saveFileLocation);
    }

    SSLRefereeExtractor extractor(source.readStatus(0)->time());
    for(int i = 0; i < source.packetCount(); ++i){
        Status current = source.readStatus(i);

        if (current->has_world_state()) {
            for (const auto &frame : current->world_state().vision_frames()) {
                logfileOut.addVisionPacket(frame, current->time());
            }
        }

        if (current->has_game_state()) {
            const auto &gameState = current->game_state();
            const SSL_Referee refereePacket = extractor.convertGameState(gameState, current->time());
            logfileOut.addRefereePacket(refereePacket, current->time());
        }
    }

    return "";
}
