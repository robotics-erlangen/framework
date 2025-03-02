#include "firmware-interface/radiocommand2025conversion.h"
#include "firmware-interface/radiocommand2025regular.h"
#include <math.h>

static int32_t min(int32_t a, int32_t b) {
    return (a < b) ? a : b;
}

static int32_t max(int32_t a, int32_t b) {
    return (a > b) ? a : b;
}

static float normalize_angle(float angle) {
    // normalizes to [-pi, pi)

    while (angle < -ANGLE_MAX) {
        angle += 2 * ANGLE_MAX;
    }
    while (angle >= ANGLE_MAX) {
        angle -= 2 * ANGLE_MAX;
    }
    return angle;
}

static int32_t map_to_interval(float x, float x_min, float x_max, int32_t y_min, int32_t y_max) {
    // min and max are inclusive

    x = fmaxf(fminf(x_max, x), x_min);
    int32_t y = roundf(y_min + (y_max - y_min) * (x - x_min) / (x_max - x_min));
    return max(min(y_max, y), y_min);
}

static int32_t map_to_signed(float x, float x_min, float x_max, uint32_t bits) {
    int32_t y_max = (1 << (bits - 1)) - 1;
    int32_t y_min = -(1 << (bits - 1));
    return map_to_interval(x, x_min, x_max, y_min, y_max);
}

static int32_t map_to_unsigned(float x, float x_min, float x_max, uint32_t bits) {
    int32_t y_max = (1 << bits) - 1;
    int32_t y_min = 0;
    return map_to_interval(x, x_min, x_max, y_min, y_max);
}

static float map_from_interval(int32_t y, int32_t y_min, int32_t y_max, float x_min, float x_max) {
    // min and max are inclusive

    y = max(min(y_max, y), y_min);
    float x = x_min + (x_max - x_min) * (float)(y - y_min) / (float)(y_max - y_min);
    return fmaxf(fminf(x_max, x), x_min);
}

static float map_from_signed(int32_t y, uint32_t bits, float x_min, float x_max) {
    int32_t y_max = (1 << (bits - 1)) - 1;
    int32_t y_min = -(1 << (bits - 1));
    return map_from_interval(y, y_min, y_max, x_min, x_max);
}

static float map_from_unsigned(int32_t y, uint32_t bits, float x_min, float x_max) {
    int32_t y_max = (1 << bits) - 1;
    int32_t y_min = 0;
    return map_from_interval(y, y_min, y_max, x_min, x_max);
}

void write_common(const RadioCommand2025Common *common, RegularCommandPayload2025 *cmd) {
    cmd->standby = common->standby;
    cmd->eject_sd_card = common->eject_sd_card;
    cmd->time_offset = map_to_signed(common->time_offset, -TIME_OFFSET_MAX, TIME_OFFSET_MAX, TIME_OFFSET_BITS);

    cmd->dribbler = map_to_signed(common->dribbler, -DRIBBLER_MAX, DRIBBLER_MAX, DRIBBLER_BITS);
    cmd->shot_power = map_to_unsigned(common->shot_power, 0.0f, SHOT_POWER_MAX, SHOT_POWER_BITS);
    cmd->is_chip = common->is_chip;
    cmd->charge = common->charge;
    cmd->force_kick = common->force_kick;

    cmd->detection_pos_x = map_to_signed(common->detection.coords.x, -POS_MAX, POS_MAX, POS_BITS);
    cmd->detection_pos_y = map_to_signed(common->detection.coords.y, -POS_MAX, POS_MAX, POS_BITS);
    cmd->detection_phi = map_to_signed(normalize_angle(common->detection.angle), -ANGLE_MAX, ANGLE_MAX, ANGLE_BITS);
}

void read_common(RadioCommand2025Common *common, const RegularCommandPayload2025 *cmd) {
    common->standby = cmd->standby;
    common->eject_sd_card = cmd->eject_sd_card;
    common->time_offset = map_from_signed(cmd->time_offset, TIME_OFFSET_BITS, -TIME_OFFSET_MAX, TIME_OFFSET_MAX);

    common->dribbler = map_from_signed(cmd->dribbler, DRIBBLER_BITS, -DRIBBLER_MAX, DRIBBLER_MAX);
    common->shot_power = map_from_unsigned(cmd->shot_power, SHOT_POWER_BITS, 0.0f, SHOT_POWER_MAX);
    common->is_chip = cmd->is_chip;
    common->charge = cmd->charge;
    common->force_kick = cmd->force_kick;

    common->detection.coords.x = map_from_signed(cmd->detection_pos_x, POS_BITS, -POS_MAX, POS_MAX);
    common->detection.coords.y = map_from_signed(cmd->detection_pos_y, POS_BITS, -POS_MAX, POS_MAX);
    common->detection.angle = map_from_signed(cmd->detection_phi, ANGLE_BITS, -ANGLE_MAX, ANGLE_MAX);
}

void write_trajectory_path(const RadioCommand2025TrajectoryPath *traj, RegularCommandPayload2025 *cmd) {
    cmd->traj_type = TRAJECTORY_PATH;

    cmd->traj.trajectory_path.start_pos_x = map_to_signed(traj->start_state.coords.x, -POS_MAX, POS_MAX, POS_BITS);
    cmd->traj.trajectory_path.start_pos_y = map_to_signed(traj->start_state.coords.y, -POS_MAX, POS_MAX, POS_BITS);
    cmd->traj.trajectory_path.start_phi = map_to_signed(normalize_angle(traj->start_state.angle), -ANGLE_MAX, ANGLE_MAX, ANGLE_BITS);

    cmd->traj.trajectory_path.start_vel_x = map_to_signed(traj->start_vel.x, -VEL_MAX, VEL_MAX, VEL_BITS);
    cmd->traj.trajectory_path.start_vel_y = map_to_signed(traj->start_vel.y, -VEL_MAX, VEL_MAX, VEL_BITS);

    cmd->traj.trajectory_path.end_phi = map_to_signed(traj->end_angle, -ANGLE_MAX, ANGLE_MAX, ANGLE_BITS);

    cmd->traj.trajectory_path.end_vel_x = map_to_signed(traj->end_vel.x, -VEL_MAX, VEL_MAX, VEL_BITS);
    cmd->traj.trajectory_path.end_vel_y = map_to_signed(traj->end_vel.y, -VEL_MAX, VEL_MAX, VEL_BITS);

    cmd->traj.trajectory_path.alpha = map_to_signed(normalize_angle(traj->alpha), -ANGLE_MAX, ANGLE_MAX, TRAJECTORY_PATH_ALPHA_BITS);
    cmd->traj.trajectory_path.t = map_to_unsigned(traj->t, 0, TRAJECTORY_PATH_T_MAX, TRAJECTORY_PATH_T_BITS);
    cmd->traj.trajectory_path.acceleration = map_to_unsigned(traj->acceleration, 0, ACC_MAX, TRAJECTORY_PATH_ACC_BITS);
    cmd->traj.trajectory_path.v_max = map_to_unsigned(traj->v_max, 0, VEL_MAX, TRAJECTORY_PATH_MAX_VEL_BITS);

    cmd->traj.trajectory_path.slow_down_time = map_to_unsigned(traj->slow_down_time, 0, TRAJECTORY_PATH_SLOT_DOWN_TIME_MAX, TRAJECTORY_PATH_SLOT_DOWN_TIME_BITS);
    cmd->traj.trajectory_path.is_fast_endspeed = traj->is_fast_endspeed;
}

bool read_trajectory_path(RadioCommand2025TrajectoryPath *traj, const RegularCommandPayload2025 *cmd) {
    if (cmd->traj_type != TRAJECTORY_PATH) {
        return false;
    }

    traj->start_state.coords.x = map_from_signed(cmd->traj.trajectory_path.start_pos_x, POS_BITS, -POS_MAX, POS_MAX);
    traj->start_state.coords.y = map_from_signed(cmd->traj.trajectory_path.start_pos_y, POS_BITS, -POS_MAX, POS_MAX);
    traj->start_state.angle = map_from_signed(cmd->traj.trajectory_path.start_phi, ANGLE_BITS, -ANGLE_MAX, ANGLE_MAX);

    traj->start_vel.x = map_from_signed(cmd->traj.trajectory_path.start_vel_x, VEL_BITS, -VEL_MAX, VEL_MAX);
    traj->start_vel.y = map_from_signed(cmd->traj.trajectory_path.start_vel_y, VEL_BITS, -VEL_MAX, VEL_MAX);

    traj->end_angle = map_from_signed(cmd->traj.trajectory_path.end_phi, ANGLE_BITS, -ANGLE_MAX, ANGLE_MAX);

    traj->end_vel.x = map_from_signed(cmd->traj.trajectory_path.end_vel_x, VEL_BITS, -VEL_MAX, VEL_MAX);
    traj->end_vel.y = map_from_signed(cmd->traj.trajectory_path.end_vel_y, VEL_BITS, -VEL_MAX, VEL_MAX);

    traj->alpha = map_from_signed(cmd->traj.trajectory_path.alpha, TRAJECTORY_PATH_ALPHA_BITS, -ANGLE_MAX, ANGLE_MAX);
    traj->t = map_from_unsigned(cmd->traj.trajectory_path.t, TRAJECTORY_PATH_T_BITS, 0, TRAJECTORY_PATH_T_MAX);
    traj->acceleration = map_from_unsigned(cmd->traj.trajectory_path.acceleration, TRAJECTORY_PATH_ACC_BITS, 0, ACC_MAX);
    traj->v_max = map_from_unsigned(cmd->traj.trajectory_path.v_max, TRAJECTORY_PATH_MAX_VEL_BITS, 0, VEL_MAX);

    traj->slow_down_time = map_from_unsigned(cmd->traj.trajectory_path.slow_down_time, TRAJECTORY_PATH_SLOT_DOWN_TIME_BITS, 0, TRAJECTORY_PATH_SLOT_DOWN_TIME_MAX);
    traj->is_fast_endspeed = cmd->traj.trajectory_path.is_fast_endspeed;
    return true;
}

void write_spline(const RadioCommand2025Spline *spline, RegularCommandPayload2025 *cmd) {
    cmd->traj_type = SPLINE;

    cmd->traj.spline.x_a_0 = map_to_signed(spline->a_0.coords.x, -POS_MAX, POS_MAX, POS_BITS);
    cmd->traj.spline.y_a_0 = map_to_signed(spline->a_0.coords.y, -POS_MAX, POS_MAX, POS_BITS);
    cmd->traj.spline.phi_a_0 = map_to_signed(normalize_angle(spline->a_0.angle), -ANGLE_MAX, ANGLE_MAX, ANGLE_BITS);

    cmd->traj.spline.x_a_1 = map_to_signed(spline->a_1.coords.x, -VEL_MAX, VEL_MAX, VEL_BITS);
    cmd->traj.spline.y_a_1 = map_to_signed(spline->a_1.coords.y, -VEL_MAX, VEL_MAX, VEL_BITS);
    cmd->traj.spline.phi_a_1 = map_to_signed(spline->a_1.angle, -ANGLE_VEL_MAX, ANGLE_VEL_MAX, ANGLE_VEL_BITS);

    // the /2 and /6 is there for the following reason:
    // these are the second coefficient of the polynomial describing the robot position: a0 + a1*x + a2*x^2 + a3*x^3
    // differentiating twice to get the acceleration leads to: 2*a2 + 6*a3*x
    // differentiating another time to get the jeak leads to: 6*a3
    //
    // so even the acceleration the robot experiences is twice the value of the second coefficient,
    // so the range of the second coefficient must be half that of the acceleration
    // and the range of the third coefficient must be a sixth of the range of the jerk
    cmd->traj.spline.x_a_2 = map_to_signed(spline->a_2.coords.x, -ACC_MAX / 2.0f, ACC_MAX / 2.0f, ACC_BITS);
    cmd->traj.spline.y_a_2 = map_to_signed(spline->a_2.coords.y, -ACC_MAX / 2.0f, ACC_MAX / 2.0f, ACC_BITS);
    cmd->traj.spline.phi_a_2 = map_to_signed(spline->a_2.angle, -ANGLE_ACC_MAX / 2.0f, ANGLE_ACC_MAX / 2.0f, ANGLE_ACC_BITS);

    cmd->traj.spline.x_a_3 = map_to_signed(spline->a_3.coords.x, -JERK_MAX / 6.0f, JERK_MAX / 6.0f, JERK_BITS);
    cmd->traj.spline.y_a_3 = map_to_signed(spline->a_3.coords.y, -JERK_MAX / 6.0f, JERK_MAX / 6.0f, JERK_BITS);
    cmd->traj.spline.phi_a_3 = map_to_signed(spline->a_3.angle, -ANGLE_JERK_MAX / 6.0f, ANGLE_JERK_MAX / 6.0f, ANGLE_JERK_BITS);
}

bool read_spline(RadioCommand2025Spline *spline, const RegularCommandPayload2025 *cmd) {
    if (cmd->traj_type != SPLINE) {
        return false;
    }

    spline->a_0.coords.x = map_from_signed(cmd->traj.spline.x_a_0, POS_BITS, -POS_MAX, POS_MAX);
    spline->a_0.coords.y = map_from_signed(cmd->traj.spline.y_a_0, POS_BITS, -POS_MAX, POS_MAX);
    spline->a_0.angle = map_from_signed(cmd->traj.spline.phi_a_0, ANGLE_BITS, -ANGLE_MAX, ANGLE_MAX);

    spline->a_1.coords.x = map_from_signed(cmd->traj.spline.x_a_1, VEL_BITS, -VEL_MAX, VEL_MAX);
    spline->a_1.coords.y = map_from_signed(cmd->traj.spline.y_a_1, VEL_BITS, -VEL_MAX, VEL_MAX);
    spline->a_1.angle = map_from_signed(cmd->traj.spline.phi_a_1, ANGLE_VEL_BITS, -ANGLE_VEL_MAX, ANGLE_VEL_MAX);

    // the /2 and /6 is there for the following reason:
    // these are the second coefficient of the polynomial describing the robot position: a0 + a1*x + a2*x^2 + a3*x^3
    // differentiating twice to get the acceleration leads to: 2*a2 + 6*a3*x
    // differentiating another time to get the jeak leads to: 6*a3
    //
    // so even the acceleration the robot experiences is twice the value of the second coefficient,
    // so the range of the second coefficient must be half that of the acceleration
    // and the range of the third coefficient must be a sixth of the range of the jerk
    spline->a_2.coords.x = map_from_signed(cmd->traj.spline.x_a_2, ACC_BITS, -ACC_MAX / 2.0f, ACC_MAX / 2.0f);
    spline->a_2.coords.y = map_from_signed(cmd->traj.spline.y_a_2, ACC_BITS, -ACC_MAX / 2.0f, ACC_MAX / 2.0f);
    spline->a_2.angle = map_from_signed(cmd->traj.spline.phi_a_2, ANGLE_ACC_BITS, -ANGLE_ACC_MAX / 2.0f, ANGLE_ACC_MAX / 2.0f);

    spline->a_3.coords.x = map_from_signed(cmd->traj.spline.x_a_3, JERK_BITS, -JERK_MAX / 6.0f, JERK_MAX / 6.0f);
    spline->a_3.coords.y = map_from_signed(cmd->traj.spline.y_a_3, JERK_BITS, -JERK_MAX / 6.0f, JERK_MAX / 6.0f);
    spline->a_3.angle = map_from_signed(cmd->traj.spline.phi_a_3, ANGLE_JERK_BITS, -ANGLE_JERK_MAX / 6.0f, ANGLE_JERK_MAX / 6.0f);
    return true;
}
