#pragma once

#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>


#define POS_BITS 11
#define VEL_BITS 12
#define ACC_BITS 13
#define JERK_BITS 15

#define ANGLE_BITS 9
#define ANGLE_VEL_BITS 10
#define ANGLE_ACC_BITS 14
#define ANGLE_JERK_BITS 17

#define TRAJECTORY_PATH_ALPHA_BITS 15
#define TRAJECTORY_PATH_T_BITS 15
#define TRAJECTORY_PATH_ACC_BITS 12
#define TRAJECTORY_PATH_MAX_VEL_BITS 12
#define TRAJECTORY_PATH_SLOT_DOWN_TIME_BITS 9

#define TIME_OFFSET_BITS 8

#define SHOT_POWER_BITS 8
#define DRIBBLER_BITS 8

#define LOAD_TORQUE_BITS 8

#define MEASURED_POS_BITS 14
#define MEASURED_VEL_BITS 15
#define MEASURED_ANGLE_BITS 14
#define MEASURED_ANGLE_VEL_BITS 14


typedef enum {
    HALT = 0,
    TRAJECTORY_PATH = 1,
    GLOBAL_SPLINE = 2,
    LOCAL_SPLINE = 3,
} TrajectoryType2025;

typedef union {
    struct {
        uint8_t unused; // required by the C standard
    } __attribute__ ((packed)) halt;
    struct {
        int16_t start_pos_x:POS_BITS;
        int16_t start_pos_y:POS_BITS;
        int16_t start_phi:ANGLE_BITS;

        int16_t start_vel_x:VEL_BITS;
        int16_t start_vel_y:VEL_BITS;

        int16_t end_phi:ANGLE_BITS;

        int16_t end_vel_x:VEL_BITS;
        int16_t end_vel_y:VEL_BITS;

        int16_t alpha:TRAJECTORY_PATH_ALPHA_BITS;
        uint16_t t:TRAJECTORY_PATH_T_BITS;

        uint16_t acceleration:TRAJECTORY_PATH_ACC_BITS;
        uint16_t v_max:TRAJECTORY_PATH_MAX_VEL_BITS;

        uint16_t slow_down_time:TRAJECTORY_PATH_SLOT_DOWN_TIME_BITS;
        bool is_fast_endspeed:1;
    } __attribute__ ((packed)) trajectory_path;
    struct {
        int32_t x_pos:POS_BITS;
        int32_t x_vel:VEL_BITS;
        int32_t x_acc:ACC_BITS;
        int32_t x_jerk:JERK_BITS;

        int32_t y_pos:POS_BITS;
        int32_t y_vel:VEL_BITS;
        int32_t y_acc:ACC_BITS;
        int32_t y_jerk:JERK_BITS;

        int32_t phi_pos:ANGLE_BITS;
        int32_t phi_vel:ANGLE_VEL_BITS;
        int32_t phi_acc:ANGLE_ACC_BITS;
        int32_t phi_jerk:ANGLE_JERK_BITS;
    } __attribute__ ((packed)) spline;
} Trajectory2025;

/**
 * @brief Structure for robot control commands (without header)
 */
typedef struct {
    int8_t time_offset:TIME_OFFSET_BITS;

    int8_t dribbler:DRIBBLER_BITS;
    uint8_t shot_power:SHOT_POWER_BITS;
    bool is_chip:1;
    bool charge:1;
    bool force_kick:1;

    bool standby:1;
    bool eject_sd_card:1;

    bool has_detection:1;
    int16_t detection_pos_x:POS_BITS;
    int16_t detection_pos_y:POS_BITS;
    int16_t detection_phi:ANGLE_BITS;

    uint8_t unused:7;

    TrajectoryType2025 traj_type:4;
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

    uint8_t motor1_load_torque:LOAD_TORQUE_BITS;
    uint8_t motor2_load_torque:LOAD_TORQUE_BITS;
    uint8_t motor3_load_torque:LOAD_TORQUE_BITS;
    uint8_t motor4_load_torque:LOAD_TORQUE_BITS;
    uint8_t dribbler_load_torque:LOAD_TORQUE_BITS;

    uint16_t measured_pos_x:MEASURED_POS_BITS;
    uint16_t measured_pos_y:MEASURED_POS_BITS;
    uint16_t measured_phi:MEASURED_ANGLE_BITS;
    uint16_t measured_vel_x:MEASURED_VEL_BITS;
    uint16_t measured_vel_y:MEASURED_VEL_BITS;
    uint16_t measured_omega:MEASURED_ANGLE_VEL_BITS;

    bool power_enabled:1;
    bool ball_detected:1;
} __attribute__ ((packed)) RegularResponsePayload2025;

