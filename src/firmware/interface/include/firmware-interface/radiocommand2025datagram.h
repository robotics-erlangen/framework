#pragma once

#include "radiocommand2025regular.h"
#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>


#define DATAGRAM_CHUNK_SIZE (sizeof(RegularCommandPayload2025) - 1)
#define MAX_CHUNKS_PER_DATAGRAM 20

/*
 * =======================================================================================
 * = IMPORTANT: Any changes here must also update the datagram sizes array in datagram.c =
 * =======================================================================================
 */

typedef struct {
    uint8_t data[100];
} __attribute__ ((packed)) EchoDatagram;

typedef struct {
    uint32_t main[3];
    uint32_t kicker[3];
    uint32_t dribbler[3];
    uint32_t motor_fl[3];
    uint32_t motor_fr[3];
    uint32_t motor_bl[3];
    uint32_t motor_br[3];
} __attribute__ ((packed)) BoardIdsResponseDatagram;

typedef struct {
    uint8_t datetime_str[19];
    uint32_t kicker_id[3];
    float linear[3];
    float chip[3];
} __attribute__ ((packed)) WriteKickCalibrationCommandDatagram;

typedef enum {
    ECHO_COMMAND,
    READ_ROBOT_ID_COMMAND,
    READ_BOARD_IDS_COMMAND,
    TOGGLE_KICK_CALIBRATION_COMMAND,
    WRITE_KICK_CALIBRATION_COMMAND
} CommandDatagramType2025;

typedef enum {
    ECHO_RESPONSE,
    ROBOT_ID_RESPONSE,
    BOARD_IDS_RESPONSE
} ResponseDatagramType2025;

typedef struct {
    uint8_t seqnum:1; // Alternating sequence number. Used to deduplicate packets on the recieving side (Can happen when the ack is lost)
    CommandDatagramType2025 datatagram_type:7; // The type of data in data_chunk
    uint8_t data_chunk[DATAGRAM_CHUNK_SIZE];
} __attribute__ ((packed)) DatagramCommandPayload2025;

typedef struct {
    uint8_t seqnum:1; // Alternating sequence number. Used to deduplicate packets on the recieving side (Can happen when the ack is lost)
    ResponseDatagramType2025 datatagram_type:7; // The type of data in data_chunk
    uint8_t data_chunk[DATAGRAM_CHUNK_SIZE];
} __attribute__ ((packed)) DatagramResponsePayload2025;
