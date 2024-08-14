#pragma once

#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>

// Constants defining limits for various radio command parameters
static const uint8_t RADIOCOMMAND2024_DRIBBLER_MAX = 100;
static const uint8_t RADIOCOMMAND2024_KICK_MAX = 255;
static const float RADIOCOMMAND2024_LINEAR_MAX = 10;
static const float RADIOCOMMAND2024_CHIP_MAX = 5;
static const int16_t RADIOCOMMAND2024_V_MAX = 32767;
static const int16_t RADIOCOMMAND2024_OMEGA_MAX = 32767;
static const int16_t RADIOCOMMAND2024_DELTA_V_MAX = 127;
static const int16_t RADIOCOMMAND2024_DELTA_OMEGA_MAX = 127;
static const int16_t RADIOCOMMAND2024_INVALID_SPEED = 0x8000;

// =========== Both directions - Start ===========

typedef enum {
    PACKET_TYPE_SPAM = 0,   // UDP-style packet for normal robot operation
    PACKET_TYPE_SAFE = 1    // Acknowledged TCP-style packet for one-off packets
} RadioPacketType2024;

/**
 * @brief Common header for all radio packets.
 */
typedef struct {
    uint8_t counter:6;      // Overflowing packet counter to determine packet loss
    uint8_t acknum:1;       // The seqnum of the last recieved packet
    RadioPacketType2024 packet_type:1;
} __attribute__ ((packed)) RadioPacketHeader2024;

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
} ConfigParams;

// ============ Both directions - End ============
// ======== Command (PC -> Robot) - Start ========

/**
 * @brief Structure for robot control commands (without header)
 */
typedef struct {
    bool chip:1;            // 0: Flat kick, 1: Chip
    bool charge:1;          // 0: Discharge kick/chip capacitors, 1: Charge kick/chip capacitors
    bool force_kick:1;      // 0: Kick on ir detection, 1: Force kick now
    bool eject_sdcard:1;    // 0: nothing, 1: eject SD card
    bool standby:1;         // 0: active, 1: standby //! seems useless to me?
    uint8_t unused:3;
    int8_t dribbler;        // -100 to 100, percentage of max speed
    uint8_t shot_power;     // 0: Disable kicker, 1-255: Enable kicker with set power. Conversion from value to shot distance in meters: max_chip_dist=5; max_flat_dist=10; if chip { shot_power / 255 * max_chip_dist } else { shot_power / 255 * max_flat_dist }
    int16_t obs_v_x;        // Current sideways velocity in mm/s
    int16_t obs_v_y;        // Current forward velocity in mm/s
    int16_t obs_omega;      // Current angular velocity in mrad/s
    int16_t v_x;            // x velocity in mm/s
    int16_t v_y;            // y velocity in mm/s
    int16_t omega;          // Angular velocity in mrad/s
    int8_t delta1_v_x;      // First delta for x velocity in mm/s
    int8_t delta1_v_y;      // First delta for y velocity in mm/s
    int8_t delta1_omega;    // First delta for angular velocity in 5 mrad/s
    int8_t delta2_v_x;      // Second delta for x velocity in mm/s
    int8_t delta2_v_y;      // Second delta for y velocity in mm/s
    int8_t delta2_omega;    // Second delta for angular velocity in 5 mrad/s
    int8_t time_offset;     // Radiosystem processing delay. Unit: 1/10 ms = 100 microseconds (Only needs 7 bits to contain the max needed range of 10ms)
} __attribute__ ((packed)) ControlPayload2024;

/**
 * @brief Enumeration of command types that arrive in acknowledged packets.
 */
typedef enum {
    READ_ID_COMMAND,
    READ_CONFIG_COMMAND,
    WRITE_CONFIG_COMMAND
} SafeCommandType2024;

/**
 * @brief Structure for acknowledged command payload.
 */
typedef struct {
    uint8_t seqnum:1;                   // Alternating sequence number. Used to deduplicate packets on the recieving side (Can happen when the ack is lost)
    SafeCommandType2024 data_type:7;    // Which union variant is used
    union {
        ConfigParams config;
        // PLACEHOLDER: no READ_CONFIG_COMMAND params are here because the cmd contains no data
    } data;
} __attribute__ ((packed)) SafeCommandPayload2024;

/**
 * @brief Main structure for radio command. (PC -> Robot)
 */
typedef struct {
    RadioPacketHeader2024 header;
    union {
        ControlPayload2024 control_payload;
        SafeCommandPayload2024 safe_payload;
    } payload;
} RadioCommand2024;

// ========= Command (PC -> Robot) - END ==========
// ======== Response (Robot -> PC) - START ========

/**
 * @brief Structure for status response from robot.
 */
typedef struct {
    uint8_t ball_detected:1;
    uint8_t cap_charged:1;
    uint8_t packet_loss:7;          // Packet loss in percent
    uint8_t battery:7;              // Battery level in percent
    // Error state
    uint8_t motor_1_error:1;
    uint8_t motor_2_error:1;
    uint8_t motor_3_error:1;
    uint8_t motor_4_error:1;
    uint8_t dribler_error:1;
    uint8_t kicker_error:1;
    uint8_t kicker_break_beam_error:1;
    uint8_t motor_encoder_error:1;
    uint8_t main_sensor_error:1;
    uint8_t temperature:7;          // Temperature in degrees Celsius
    // Measured velocity
    int16_t v_x;                    // Sideways velocity in mm/s
    int16_t v_y;                    // Forward velocity in mm/s
    int16_t omega;                  // Angular velocity in mrad/s
} __attribute__ ((packed)) FeedbackResponsePayload2024;

/**
 * @brief Enumeration of acknowledged response types.
 */
typedef enum {
    ID_RESPONSE,
    CONFIG_RESPONSE
} SafeResponseType2024;

/**
 * @brief Structure for acknowledged response payload.
 */
typedef struct {
    uint8_t seqnum:1;                   // Alternating sequence number. Used to deduplicate packets on the recieving side (Can happen when the ack is lost)
    SafeResponseType2024 data_type:7;   // Which union variant to use
    union {
        uint8_t id;
        ConfigParams config;
    } data;
} __attribute__ ((packed)) SafeResponsePayload2024;

/**
 * @brief Main structure for radio response.
 */
typedef struct {
    RadioPacketHeader2024 header;
    union {
        FeedbackResponsePayload2024 feedback_payload;
        SafeResponsePayload2024 safe_payload;
    } payload;
} RadioResponse2024;

// =========== Response (Robot -> PC) - END ===========
