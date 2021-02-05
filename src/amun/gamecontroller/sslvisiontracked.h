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

#pragma once

#include <string>
#include "protobuf/ssl_vision_wrapper_tracked.pb.h"
#include "protobuf/world.pb.h"

class SSLVisionTracked
{
public:
    SSLVisionTracked();

    void createTrackedFrame(const world::State &state, gameController::TrackerWrapperPacket *packet);

private:
    std::string m_uuid;
    int m_trackedFrameCounter = 0;

    static constexpr int UUID_LENGTH = 32;
    static constexpr const char* SOURCE_NAME = "ER-FORCE";
};
