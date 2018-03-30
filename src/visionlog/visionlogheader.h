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

#ifndef VISIONLOGHEADER_H
#define VISIONLOGHEADER_H

#include "messagetype.h"

namespace VisionLog{

    struct FileHeader
    {
        char name[12]; // "SSL_LOG_FILE"
        int32_t version; // Default file format is version 1
    };

    extern const char* DEFAULT_FILE_HEADER_NAME;

    struct DataHeader
    {
        int64_t timestamp; // Timestamp in ns
        MessageType messageType; // Message type
        int32_t messageSize; // Size of protobuf message in bytes
    };

}

#endif //VISIONLOGHEADER_H
