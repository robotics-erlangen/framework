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

// macro from https://stackoverflow.com/a/3385694
#define STATIC_ASSERT(COND,MSG) typedef char static_assertion_##MSG[(COND)?1:-1]
// must match nrf24SetAddress-function in src/firmware/common/nrf.c
#define NRF_ADDRESS_SIZE 4

typedef struct
{
    uint8_t command;
} __attribute__ ((packed)) RadioResponseHeader;

// The command id includes both the robot generation and the data type
enum ResponseCommand {
    // RESPONSE_2012_DEFAULT = 0x01,
    RESPONSE_2014_DEFAULT = 0x02,
    RESPONSE_2018_DEFAULT = 0x03
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

// only frequencies between 2400 and 2525 can be used
// change frequencies here, channel is selected in the ra settings!
// flash robots AND transceiver after changes!
static const uint16_t transceiver_frequencies[16][2] = {
    // frequencies in MHz
    // nrf1 + nrf2, nrf3 + nrf4
    // receiver, transmitter
    { 2507, 2513 }, // Channel 0
    { 2508, 2514 }, // Channel 1
    { 2509, 2515 }, // Channel 2
    { 2510, 2516 }, // Channel 3
    { 2511, 2517 }, // Channel 4
    { 2512, 2518 }, // Channel 5
    { 2513, 2519 }, // Channel 6
    { 2514, 2520 }, // Channel 7
    { 2515, 2521 }, // Channel 8
    { 2516, 2522 }, // Channel 9
    { 2499, 2519 }, // Channel 10
    { 2525, 2499 }, // Channel 11
    { 2505, 2525 }, // Channel 12
    { 2506, 2512 }, // Channel 13
    { 2503, 2511 }, // Channel 14
    { 2504, 2510 }  // Channel 15
};

// Avoid 0xA? / 0x5? as the MSB (here: last byte in the array) of the address
// as the NRF might confuse this with the preamble
// Target for radio response from robot
static const uint8_t transceiver_address[] = { 0, 0, 0, 0 };
// Target for datagram packet from robot
static const uint8_t transceiver_datagram[] = { 0, 0, 0, 0 };
// Target for datagram packet sent to the robot
// the robot id is embedded in the first byte along with a robot generation tag
static const uint8_t robot_datagram[] = { 0, 0, 0, 0 };

STATIC_ASSERT(sizeof(transceiver_address) == NRF_ADDRESS_SIZE,transceiver_address_has_wrong_size);
STATIC_ASSERT(sizeof(transceiver_datagram) == NRF_ADDRESS_SIZE,transceiver_datagram_has_wrong_size);
STATIC_ASSERT(sizeof(robot_datagram) == NRF_ADDRESS_SIZE,robot_datagram_has_wrong_size);

#endif // COMMON_RADIOCOMMAND_H
