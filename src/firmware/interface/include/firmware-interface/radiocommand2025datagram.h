#pragma once

#include "radiocommand2025regular.h"
#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>


#define DATAGRAM_CHUNK_SIZE sizeof(RegularCommandPayload2025) - 1
#define MAX_CHUNKS_PER_DATAGRAM 20


typedef struct {
    float kcoupling_val1;
    float kcoupling_val2;
    float kcoupling_val3;
    float kcoupling_val4;
    float kcoupling_val5;
    float kforce_coupling1;
    float kforce_coupling2;
    float kforce_coupling3;
    float kforce_coupling4;
    float velocity_coupling_x_front;
    float velocity_coupling_x_rear;
    float velocity_coupling_y_front;
    float velocity_coupling_y_rear;
    float velocity_coupling_phi;
    uint8_t ir_param;
    float max_accel;
    float pfusch_faktor;
    float mass_factor;
} ConfigParamsDatagram;

typedef enum {
    READ_ID_COMMAND,
    READ_CONFIG_COMMAND,
    WRITE_CONFIG_COMMAND
} CommandDatagramType2025;

static uint8_t COMMAND_DATAGRAM_SIZES[3] = {
    0,                              // READ_ID_COMMAND
    0,                              // READ_CONFIG_COMMAND
    sizeof(ConfigParamsDatagram),   // WRITE_CONFIG_COMMAND
};

typedef enum {
    ID_RESPONSE,
    CONFIG_RESPONSE,
} ResponseDatagramType2025;

static uint8_t RESPONSE_DATAGRAM_SIZES[3] = {
    sizeof(uint8_t),                // ID_RESPONSE
    sizeof(ConfigParamsDatagram),   // CONFIG_RESPONSE
};

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

