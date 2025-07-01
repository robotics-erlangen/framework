#pragma once

#include "radiocommand2025.h"
#include <assert.h>

#define PI 3.14159265358979323846

#define TIME_OFFSET_MAX 0.01f

#define LINEAR_SHOT_SPEED_MAX 10.0f
#define CHIP_DISTANCE_MAX 5.0f
#define DRIBBLER_MAX 1.0f

#define POS_MAX 8.0f
#define VEL_MAX 6.0f
#define ACC_MAX 15.0f
#define JERK_MAX 100.0f
#define ANGLE_MAX PI
#define ANGLE_VEL_MAX 10 * 2 * PI
#define ANGLE_ACC_MAX 15000.0f
#define ANGLE_JERK_MAX 400000.0f

#define TRAJECTORY_PATH_T_MAX 40.0f
#define TRAJECTORY_PATH_SLOW_DOWN_TIME_MAX 1.0f

#define LOAD_TORQUE_MAX 10.0f


// if this vector is in the context of a local coordinate system,
// x is sideward, and y is forward
typedef struct {
    float x;  // or sideward
    float y;  // or forward
} RadioCommand2025Vector;

typedef struct {
    RadioCommand2025Vector coords;
    float angle;
} RadioCommand2025State;

typedef struct {
    float time_offset;  // [s], from -TIME_OFFSET_MAX to TIME_OFFSET_MAX, "radiosystem processing delay"
    bool standby;
    bool eject_sd_card;

    float dribbler;  // percent of max dribbler speed, from -DRIBBLER_MAX to DRIBBLER_MAX
    float shot_power;  // if shot_power == 0: disable kicker, else if is_chip is false: [m/s], from 0 to LINEAR_SHOT_SPEED_MAX, else: [m], from 0 to CHIP_DISTANCE_MAX
    bool is_chip;  // false: flat kick, true: chip
    bool charge;  // false: discharge kick capacitors, true: charge kick capacitors
    bool force_kick;  // false: kick on break beam detection, true: force kick right now

    bool has_detection; // true: robot was detected by the vision and detection contains it, false: robot wasn't detected by the vision
    RadioCommand2025State detection;  // [m] and [rad], current state of the robot, in global coordinates
} RadioCommand2025Common;

typedef struct {
    // in global coordinates
    RadioCommand2025State start_state;  // [m] and [rad]
    RadioCommand2025Vector start_vel;  // [m/s]
    float end_angle;  // [rad]
    RadioCommand2025Vector end_vel;  // [m/s]

    float alpha;  // [rad]
    float t;  // [s]
    float acceleration;  // [m/s^2]
    float v_max;  // [m/s]

    float slow_down_time;  // [s]
    bool is_fast_endspeed;
} RadioCommand2025TrajectoryPath;

typedef struct {
    // in global coordinates
    RadioCommand2025State pos;  // [m] and [rad]
    RadioCommand2025State vel;  // [m/s] and [rad/s]
    RadioCommand2025State acc;  // [m/s^2] and [rad/s^2]
    RadioCommand2025State jerk;  // [m/s^3] and [rad/s^3]
} RadioCommand2025Spline;

typedef enum {
    MOTOR_FR,
    MOTOR_FL,
    MOTOR_BR,
    MOTOR_BL,
    DRIBBLER,
    NUM_MOTORS, // must be the last member in the enum
} RadioCommand2025MotorIndex;

typedef struct {
    float battery;  // [%]
    float packet_loss;  // [%] calculated over the last 100 packets

    MotorStatusFlags2025 motor_status[NUM_MOTORS];
    KickerStatusFlags2025 kicker_status;
    IMUStatusFlags2025 imu_status;
    SDStatusFlags2025 sd_status;

    float motor_load_torque[NUM_MOTORS];  // [Nm]

    RadioCommand2025State measured_pos;  // [m] and [rad]
    RadioCommand2025State measured_vel;  // [m/s] and [rad/s]

    bool power_enabled;
    bool ball_detected;
} RadioCommand2025Response;


#ifdef __cplusplus
extern "C" {
#endif

void write_common(const RadioCommand2025Common *common, RegularCommandPayload2025 *cmd);
void read_common(RadioCommand2025Common *common, const RegularCommandPayload2025 *cmd);

void set_halt(RegularCommandPayload2025 *cmd);
bool is_halt(const RegularCommandPayload2025 *cmd);

void write_trajectory_path(const RadioCommand2025TrajectoryPath *traj, RegularCommandPayload2025 *cmd);
bool read_trajectory_path(RadioCommand2025TrajectoryPath *traj, const RegularCommandPayload2025 *cmd);

void write_spline(const RadioCommand2025Spline *spline, RegularCommandPayload2025 *cmd, const bool is_local);
bool read_spline(RadioCommand2025Spline *spline, const RegularCommandPayload2025 *cmd, const bool is_local);

void write_response(const RadioCommand2025Response *response, RegularResponsePayload2025 *payload);
void read_response(RadioCommand2025Response *response, const RegularResponsePayload2025 *payload);

#ifdef __cplusplus
}
#endif
