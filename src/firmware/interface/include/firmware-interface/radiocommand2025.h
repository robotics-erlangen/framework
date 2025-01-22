#pragma once

#include "radiocommand2025regular.h"
#include "radiocommand2025datagram.h"
#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>


#define HBC_MAX_PACKET_SIZE 29


/**
 * @brief Common header for all radio packets.
 */
typedef struct {
    uint8_t counter:6; // Overflowing packet counter to determine packet loss
    uint8_t acknum:1; // The seqnum of the last recieved packet
    bool datagram:1;
} __attribute__ ((packed)) RadioPacketHeader2025;

/**
 * @brief Main structure for radio command.
 */
typedef struct {
    RadioPacketHeader2025 header;
    union {
        RegularCommandPayload2025 regular;
        DatagramCommandPayload2025 datagram;
    } payload;
} RadioCommand2025;

/**
 * @brief Main structure for radio response.
 */
typedef struct {
    RadioPacketHeader2025 header;
    union {
        RegularResponsePayload2025 regular;
        DatagramResponsePayload2025 datagram;
    } payload;
} RadioResponse2025;
