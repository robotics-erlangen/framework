#pragma once

#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>

#define DATAGRAM_CHUNK_SIZE sizeof(RegularCommandPayload2025) - 1
#define MAX_CHUNKS_PER_DATAGRAM 20

/*
 * =============
 * = DATAGRAMS =
 * =============
 */

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

/*
 * ===================
 * = Normal Protocol =
 * ===================
 */

#define HBC_MAX_PACKET_SIZE 29


/**
 * @brief Common header for all radio packets.
 */
typedef struct {
    uint8_t counter:6; // Overflowing packet counter to determine packet loss
    uint8_t acknum:1; // The seqnum of the last recieved packet
    bool datagram:1;
} __attribute__ ((packed)) RadioPacketHeader2025;

// ======== Command (PC -> Robot) - Start ========

typedef enum {
    TRAJECTORY_PATH = 0,
    SPLINE = 1,
} TrajectoryType2025;

typedef union {
    struct {
        int16_t start_pos_x:10;
        int16_t start_pos_y:10;
        int16_t start_phi:9;

        int16_t start_vel_x:8;
        int16_t start_vel_y:8;
        int16_t start_omega:10;

        int16_t end_pos_x:10;
        int16_t end_pos_y:10;
        int16_t end_phi:9;

        int16_t end_vel_x:8;
        int16_t end_vel_y:8;
        int16_t end_omega:10;

        int16_t alpha:9;
        uint16_t t:9;

        uint16_t a_max:8;
        uint16_t v_max:8;
    } __attribute__ ((packed)) trajectory_path;
    struct {
        int16_t x_a_0:11;
        int16_t x_a_1:11;
        int16_t x_a_2:11;
        int16_t x_a_3:12;

        int16_t y_a_0:11;
        int16_t y_a_1:11;
        int16_t y_a_2:11;
        int16_t y_a_3:12;

        int16_t phi_a_0:11;
        int16_t phi_a_1:11;
        int16_t phi_a_2:12;
        int16_t phi_a_3:14;
    } __attribute__ ((packed)) spline;
} Trajectory2025;

/**
 * @brief Structure for robot control commands (without header)
 */
typedef struct {
    // TODO figure out what this does
    uint8_t time_offset:8; // TODO: 7 bit would be enough

    bool standby:1;
    bool eject_sd_card:1;
    uint8_t unused:6;

    uint8_t shot_power:8;
    uint8_t dribbler:8;
    bool force_kick:1;
    bool is_chip:1;
    bool charge:1;

    int16_t detection_pos_x:11;
    int16_t detection_pos_y:11;
    int16_t detection_phi:9;

    TrajectoryType2025 traj_type:6;
    Trajectory2025 traj;
} __attribute__ ((packed)) RegularCommandPayload2025;

typedef struct {
    uint8_t seqnum:1;                           // Alternating sequence number. Used to deduplicate packets on the recieving side (Can happen when the ack is lost)
    CommandDatagramType2025 datatagram_type:7;  // TODO: Comment this
    uint8_t data_chunk[DATAGRAM_CHUNK_SIZE];
} __attribute__ ((packed)) DatagramCommandPayload2025;

typedef struct {
    RadioPacketHeader2025 header;
    union {
        RegularCommandPayload2025 regular;
        DatagramCommandPayload2025 datagram;
    } payload;
} RadioCommand2025;

// ========= Command (PC -> Robot) - END ==========

// ======== Response (Robot -> PC) - START ========

typedef struct {
    bool error:1;
    bool overheated:1;
    bool encoder_error:1;
    uint8_t unused:5;
} __attribute__ ((packed)) MotorStatusFlags2025;

typedef struct {
    bool error:1;
    bool break_beam_error:1;
    uint8_t unused:6;
} __attribute__ ((packed)) KickerStatusFlags2025;

typedef struct {
    bool error:1;
    uint8_t unused:7;
} __attribute__ ((packed)) IMUStatusFlags2025;

typedef struct {
    bool error:1;
    bool mounted:1;
    bool full:1;
    uint8_t unused:5;
} __attribute__ ((packed)) SDStatusFlags2025;

/**
 * @brief Structure for status response from robot.
 */
typedef struct {
    uint8_t battery;
    uint8_t packet_loss;

    MotorStatusFlags2025 motor1_status;
    MotorStatusFlags2025 motor2_status;
    MotorStatusFlags2025 motor3_status;
    MotorStatusFlags2025 motor4_status;
    MotorStatusFlags2025 dribbler_status;
    KickerStatusFlags2025 kicker_status;
    IMUStatusFlags2025 imu_status;
    SDStatusFlags2025 sd_status;

    uint8_t main_board_id;
    uint8_t kicker_board_id;

    uint8_t motor1_load_torque;
    uint8_t motor2_load_torque;
    uint8_t motor3_load_torque;
    uint8_t motor4_load_torque;
    uint8_t dribbler_load_torque;

    uint16_t measured_pos_x:14;
    uint16_t measured_pos_y:14;
    uint16_t measured_phi:14;
    uint16_t measured_vel_x:14;
    uint16_t measured_vel_y:14;
    uint16_t measured_omega:14;

    bool power_enabled:1;
    bool ball_detected:1;
} __attribute__ ((packed)) RegularResponsePayload2025;

typedef struct {
    uint8_t seqnum:1;                   // Alternating sequence number. Used to deduplicate packets on the recieving side (Can happen when the ack is lost)
    ResponseDatagramType2025 datatagram_type:7; // TODO: Comment this
    uint8_t data_chunk[DATAGRAM_CHUNK_SIZE];
} __attribute__ ((packed)) DatagramResponsePayload2025;

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

// =========== Response (Robot -> PC) - END ===========
