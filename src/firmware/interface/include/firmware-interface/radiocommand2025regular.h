#pragma once

#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>


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
    int8_t time_offset:8; // Radiosystem processing delay. Unit: 1/10 ms = 100 microseconds (Only needs 7 bits to contain the max needed range of 10ms)

    bool standby:1; // 0: active, 1: standby
    bool eject_sd_card:1; // 0: nothing, 1: eject SD card
    uint8_t unused:6;

    uint8_t shot_power:8; // 0: Disable kicker, 1-255: Enable kicker with set power. Conversion from value to shot distance in meters: max_chip_dist=5; max_flat_dist=10; if chip { shot_power / 255 * max_chip_dist } else { shot_power / 255 * max_flat_dist }
    uint8_t dribbler:8; // -100 to 100, percentage of max speed
    bool force_kick:1; // 0: Kick on ir detection, 1: Force kick now
    bool is_chip:1; // 0: Flat kick, 1: Chip
    bool charge:1; // 0: Discharge kick/chip capacitors, 1: Charge kick/chip capacitors

    int16_t detection_pos_x:11; // Current x position, as detected by the vision
    int16_t detection_pos_y:11; // Current y position, as detected by the vision
    int16_t detection_phi:9; // Current angular velocity in mrad/s, as detected by the vision

    TrajectoryType2025 traj_type:6;
    Trajectory2025 traj;
} __attribute__ ((packed)) RegularCommandPayload2025;

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
 * @brief Structure for status response from robot (without header)
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

