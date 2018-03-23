/***************************************************************************
 *   Copyright 2015 Michael Eischer                                        *
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

#ifndef COMMON_RADIOCOMMAND_H
#define COMMON_RADIOCOMMAND_H

#include <stdint.h>

typedef struct
{
    uint8_t command;
} __attribute__ ((packed)) RadioResponseHeader;

// The command id includes both the robot generation and the data type
enum ResponseCommand {
    RESPONSE_2012_DEFAULT = 0x01,
    RESPONSE_2014_DEFAULT = 0x02
};

// Radiodatagrams are merged into a data stream
// A new message is however bound to datagram boundaries
// Followed by message chunk
// Sent to channel 1 on robot / transceiver
typedef struct {
    uint8_t robotId:8; // robot id, only set by robot, high 4 bits are generation
    uint8_t isAck:1; // acks packet with counter that was sent to id
    uint8_t counter:3;
     // = 0, if continuation of message, otherwise count of datagrams the message is split into
    uint8_t datagramCount:4; // allows 15*30=450 bytes as message size
} __attribute__ ((packed)) RadioDatagramHdr;

static const uint8_t transceiver_address[] = { 0x33, 0xC0, 0xFF, 0xEE, 0xD7 };

static const uint8_t transceiver_datagram[] = { 0x54, 0xC0, 0xFF, 0xEE, 0xB5 };
// id from datagram is used as last byte
static const uint8_t robot_datagram[] = { 0x00, 0xC0, 0xFF, 0xEE, 0x55 };

#endif // COMMON_RADIOCOMMAND_H
