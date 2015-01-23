/***************************************************************************
 *   Copyright 2014 Michael Eischer, Philipp Nordhus                       *
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

#ifndef TRANSCEIVER2012_H
#define TRANSCEIVER2012_H

enum TransceiverCommand {
    // commands sent to the transceiver
    COMMAND_SEND_NRF24 = 0x01,
    COMMAND_SET_FREQUENCY = 0x10,
    // replies from the transceiver
    COMMAND_TRANSCEIVER_STATUS = 0x80, // just text
    COMMAND_REPLY_FROM_ROBOT = 0x81 // wraps a received reply
};

typedef struct
{
    uint8_t command;
    uint8_t size; // size of the following data
    union {
        struct {
            uint8_t address[5];
            uint8_t expectedResponseSize;
        };
        struct {
            uint8_t channel;
            uint8_t primary:1;
        };
    };
} __attribute__ ((packed)) TransceiverCommandPacket;

typedef struct
{
    uint8_t size; // size of the following data
    uint8_t command;
} __attribute__ ((packed)) TransceiverResponsePacket;

#endif // TRANSCEIVER2012_H
