#pragma once

#include "radiocommand2025.h"
#include <assert.h>
#include <math.h>


#define TIME_OFFSET_MAX 0.01f

#define SHOT_POWER_MAX 10.0f
#define DRIBBLER_MAX 1.0f

#define POS_MAX 8.0f
#define VEL_MAX 6.0f
#define ACC_MAX 15.0f
#define JERK_MAX 100.0f
#define ANGLE_MAX M_PI
#define ANGLE_VEL_MAX 15000.0f
#define ANGLE_ACC_MAX 15000.0f
#define ANGLE_JERK_MAX 400000.0f

#define TRAJECTORY_PATH_T_MAX 40.0f


typedef struct {
    float x;  // m, m/s, m/s^2, m/s^3
    float y;  // m, m/s, m/s^2, m/s^3
    float angle;  // rad, rad/s, rad/s^2, rad/s^3
} RadioCommand2025State;

typedef struct {
    float time_offset;
    bool standby;
    bool eject_sd_card;

    float shot_power;
    float dribbler;
    bool force_kick;
    bool is_chip;
    bool charge;

    RadioCommand2025State detection;
} RadioCommand2025Common;

typedef struct {
    RadioCommand2025State start_pos;
    RadioCommand2025State start_vel;
    RadioCommand2025State end_vel;

    float alpha;
    float t;
    float a_max;
    float v_max;
} RadioCommand2025TrajectoryPath;

typedef struct {
    RadioCommand2025State a_0;
    RadioCommand2025State a_1;
    RadioCommand2025State a_2;
    RadioCommand2025State a_3;
} RadioCommand2025Spline;


#ifdef __cplusplus
extern "C" {
#endif

void write_common(const RadioCommand2025Common *common, RegularCommandPayload2025 *cmd);
void read_common(RadioCommand2025Common *common, const RegularCommandPayload2025 *cmd);

void write_trajectory_path(const RadioCommand2025TrajectoryPath *traj, RegularCommandPayload2025 *cmd);
bool read_trajectory_path(RadioCommand2025TrajectoryPath *traj, const RegularCommandPayload2025 *cmd);

void write_spline(const RadioCommand2025Spline *spline, RegularCommandPayload2025 *cmd);
bool read_spline(RadioCommand2025Spline *spline, const RegularCommandPayload2025 *cmd);

#ifdef __cplusplus
}
#endif
