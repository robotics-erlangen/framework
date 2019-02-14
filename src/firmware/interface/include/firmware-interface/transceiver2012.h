/***************************************************************************
 *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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

#define TRANSCEIVER_MIN_PROTOCOL_VERSION 5
#define TRANSCEIVER_PROTOCOL_VERSION 5

enum TransceiverCommand {
    COMMAND_INIT = 0x00, // initial request
    // commands sent to the transceiver
    COMMAND_PING = 0x01, // ping with hostprovided data
    COMMAND_STATUS = 0x02, // request info about dropped packets
    COMMAND_SET_FREQUENCY = 0x10,
    COMMAND_SEND_NRF24 = 0x11,
    COMMAND_SEND_NRF24_DATA = 0x12, // reliable transmission, message may be up to 253 bytes large
    // replies from the transceiver
    COMMAND_INIT_REPLY = 0x80, // return used protocol version
    COMMAND_PING_REPLY = 0x81, // echo for ping
    COMMAND_STATUS_REPLY = 0x82, // return dropped packets count
    COMMAND_REPLY_FROM_ROBOT = 0x90, // wraps a received reply
    COMMAND_SEND_NRF24_DATA_FAILED = 0x91, // returns header, if ACKed send failed
    COMMAND_DATAGRAM_RECEIVED = 0x92
};

typedef struct
{
    uint8_t command;
    uint8_t size; // size of the following data
} __attribute__ ((packed)) TransceiverCommandPacket;

// used for COMMAND_INIT and COMMAND_INIT_REPLY
typedef struct
{
    uint16_t protocolVersion;
} __attribute__ ((packed)) TransceiverInitPacket;

// used for COMMAND_STATUS_REPLY
typedef struct
{
    uint32_t droppedPackets;
} __attribute__ ((packed)) TransceiverStatusPacket;

// used for COMMAND_SET_FREQUENCY
typedef struct
{
    uint8_t channel;
} __attribute__ ((packed)) TransceiverSetFrequencyPacket;

// used for COMMAND_SEND_NRF24
typedef struct
{
    // always transfer full 5 byte addresses, the nrf will ignore
    // the excess bytes if shorter addresses are configured
    uint8_t address[5];
    uint8_t expectedResponseSize;
} __attribute__ ((packed)) TransceiverSendNRF24Packet;

// used for COMMAND_SEND_NRF24_DATA, COMMAND_SEND_NRF24_DATA_FAILED and COMMAND_DATAGRAM_RECEIVED
typedef struct
{
    uint8_t robotId;
    uint8_t messageId;
} __attribute__ ((packed)) TransceiverSendNRF24DataPacket;

// used for COMMAND_REPLY_FROM_ROBOT
typedef struct
{
    uint8_t size; // size of the following data
    uint8_t command;
} __attribute__ ((packed)) TransceiverResponsePacket;

#endif // TRANSCEIVER2012_H
