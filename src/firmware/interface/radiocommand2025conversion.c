#include "firmware-interface/radiocommand2025conversion.h"
#include <math.h>

static int32_t min(int32_t a, int32_t b) {
    return (a < b) ? a : b;
}

static int32_t max(int32_t a, int32_t b) {
    return (a > b) ? a : b;
}

static int32_t map_to_interval(float x, float x_min, float x_max, int32_t y_min, int32_t y_max) {
    // min and max are inclusive

    x = fmax(fmin(x_max, x), x_min);
    int32_t y = round(y_min + (y_max - y_min) * (x - x_min) / (x_max - x_min));
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
    return fmax(fmin(x_max, x), x_min);
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
    cmd->time_offset = map_to_unsigned(common->time_offset, 0.0f, 1.0f, 8);

    cmd->shot_power = map_to_unsigned(common->shot_power, 0.0f, SHOT_POWER_MAX, 8);
    cmd->dribbler = map_to_unsigned(common->dribbler, 0.0f, DRIBBLER_MAX, 8);
    cmd->force_kick = common->force_kick;
    cmd->is_chip = common->is_chip;
    cmd->charge = common->charge;

    cmd->detection_pos_x = map_to_signed(common->detection.x, -POS_MAX, POS_MAX, 11);
    cmd->detection_pos_y = map_to_signed(common->detection.y, -POS_MAX, POS_MAX, 11);
    cmd->detection_phi = map_to_signed(common->detection.angle, -ANGLE_MAX, ANGLE_MAX, 9);
}

void read_common(RadioCommand2025Common *common, const RegularCommandPayload2025 *cmd) {
    common->standby = cmd->standby;
    common->eject_sd_card = cmd->eject_sd_card;
    common->time_offset = map_from_unsigned(cmd->time_offset, 8, 0.0f, TIME_OFFSET_MAX);

    common->shot_power = map_from_unsigned(cmd->shot_power, 8, 0.0f, SHOT_POWER_MAX);
    common->dribbler = map_from_unsigned(cmd->dribbler, 8, 0.0f, DRIBBLER_MAX);
    common->force_kick = cmd->force_kick;
    common->is_chip = cmd->is_chip;
    common->charge = cmd->charge;

    common->detection.x = map_from_signed(cmd->detection_pos_x, 11, -POS_MAX, POS_MAX);
    common->detection.y = map_from_signed(cmd->detection_pos_y, 11, -POS_MAX, POS_MAX);
    common->detection.angle = map_from_signed(cmd->detection_phi, 9, -ANGLE_MAX, ANGLE_MAX);
}

void write_trajectory_path(const RadioCommand2025TrajectoryPath *traj, RegularCommandPayload2025 *cmd) {
    cmd->traj_type = TRAJECTORY_PATH;

    cmd->traj.trajectory_path.start_pos_x = map_to_signed(traj->start_pos.x, -POS_MAX, POS_MAX, 10);
    cmd->traj.trajectory_path.start_pos_y = map_to_signed(traj->start_pos.y, -POS_MAX, POS_MAX, 10);
    cmd->traj.trajectory_path.start_phi = map_to_signed(traj->start_pos.angle, -ANGLE_MAX, ANGLE_MAX, 9);

    cmd->traj.trajectory_path.start_vel_x = map_to_signed(traj->start_vel.x, -VEL_MAX, VEL_MAX, 8);
    cmd->traj.trajectory_path.start_vel_y = map_to_signed(traj->start_vel.y, -VEL_MAX, VEL_MAX, 8);
    cmd->traj.trajectory_path.start_omega = map_to_signed(traj->start_vel.angle, -ANGLE_VEL_MAX, ANGLE_VEL_MAX, 10);

    cmd->traj.trajectory_path.end_vel_x = map_to_signed(traj->end_vel.x, -VEL_MAX, VEL_MAX, 8);
    cmd->traj.trajectory_path.end_vel_y = map_to_signed(traj->end_vel.y, -VEL_MAX, VEL_MAX, 8);
    cmd->traj.trajectory_path.end_omega = map_to_signed(traj->end_vel.angle, -ANGLE_VEL_MAX, ANGLE_VEL_MAX, 10);

    cmd->traj.trajectory_path.alpha = map_to_signed(traj->alpha, -ANGLE_MAX, ANGLE_MAX, 9);
    cmd->traj.trajectory_path.t = map_to_unsigned(traj->t, 0, TIME_MAX, 9);
    cmd->traj.trajectory_path.a_max = map_to_unsigned(traj->a_max, 0, ACC_MAX, 8);
    cmd->traj.trajectory_path.v_max = map_to_unsigned(traj->v_max, 0, VEL_MAX, 8);
}

bool read_trajectory_path(RadioCommand2025TrajectoryPath *traj, const RegularCommandPayload2025 *cmd) {
    if (cmd->traj_type != TRAJECTORY_PATH) {
        return false;
    }

    traj->start_pos.x = map_from_signed(cmd->traj.trajectory_path.start_pos_x, 10, -POS_MAX, POS_MAX);
    traj->start_pos.y = map_from_signed(cmd->traj.trajectory_path.start_pos_y, 10, -POS_MAX, POS_MAX);
    traj->start_pos.angle = map_from_signed(cmd->traj.trajectory_path.start_phi, 9, -ANGLE_MAX, ANGLE_MAX);

    traj->start_vel.x = map_from_signed(cmd->traj.trajectory_path.start_vel_x, 8, -VEL_MAX, VEL_MAX);
    traj->start_vel.y = map_from_signed(cmd->traj.trajectory_path.start_vel_y, 8, -VEL_MAX, VEL_MAX);
    traj->start_vel.angle = map_from_signed(cmd->traj.trajectory_path.start_omega, 10, -ANGLE_VEL_MAX, ANGLE_VEL_MAX);

    traj->end_vel.x = map_from_signed(cmd->traj.trajectory_path.end_vel_x, 8, -VEL_MAX, VEL_MAX);
    traj->end_vel.y = map_from_signed(cmd->traj.trajectory_path.end_vel_y, 8, -VEL_MAX, VEL_MAX);
    traj->end_vel.angle = map_from_signed(cmd->traj.trajectory_path.end_omega, 10, -ANGLE_VEL_MAX, ANGLE_VEL_MAX);

    traj->alpha = map_from_signed(cmd->traj.trajectory_path.alpha, 9, -ANGLE_MAX, ANGLE_MAX);
    traj->t = map_from_unsigned(cmd->traj.trajectory_path.t, 9, 0, TIME_MAX);
    traj->a_max = map_from_unsigned(cmd->traj.trajectory_path.a_max, 8, 0, ACC_MAX);
    traj->v_max = map_from_unsigned(cmd->traj.trajectory_path.v_max, 8, 0, VEL_MAX);
    return true;
}

void write_spline(const RadioCommand2025Spline *spline, RegularCommandPayload2025 *cmd) {
    cmd->traj_type = SPLINE;

    cmd->traj.spline.x_a_0 = map_to_signed(spline->a_0.x, -POS_MAX, POS_MAX, 11);
    cmd->traj.spline.y_a_0 = map_to_signed(spline->a_0.y, -POS_MAX, POS_MAX, 11);
    cmd->traj.spline.phi_a_0 = map_to_signed(spline->a_0.angle, -ANGLE_MAX, ANGLE_MAX, 11);

    cmd->traj.spline.x_a_1 = map_to_signed(spline->a_1.x, -VEL_MAX, VEL_MAX, 11);
    cmd->traj.spline.y_a_1 = map_to_signed(spline->a_1.y, -VEL_MAX, VEL_MAX, 11);
    cmd->traj.spline.phi_a_1 = map_to_signed(spline->a_1.angle, -ANGLE_VEL_MAX, ANGLE_VEL_MAX, 11);

    // the /2 and /6 is there for the following reason:
    // these are the second coefficient of the polynomial describing the robot position: a0 + a1*x + a2*x^2 + a3*x^3
    // differentiating twice to get the acceleration leads to: 2*a2 + 6*a3*x
    // differentiating another time to get the jeak leads to: 6*a3
    //
    // so even the acceleration the robot experiences is twice the value of the second coefficient,
    // so the range of the second coefficient must be half that of the acceleration
    // and the range of the third coefficient must be a sixth of the range of the jerk
    cmd->traj.spline.x_a_2 = map_to_signed(spline->a_2.x, -ACC_MAX / 2.0f, ACC_MAX / 2.0f, 11);
    cmd->traj.spline.y_a_2 = map_to_signed(spline->a_2.y, -ACC_MAX / 2.0f, ACC_MAX / 2.0f, 11);
    cmd->traj.spline.phi_a_2 = map_to_signed(spline->a_2.angle, -ANGLE_ACC_MAX / 2.0f, ANGLE_ACC_MAX / 2.0f, 12);

    cmd->traj.spline.x_a_3 = map_to_signed(spline->a_3.x, -JERK_MAX / 6.0f, JERK_MAX / 6.0f, 12);
    cmd->traj.spline.y_a_3 = map_to_signed(spline->a_3.y, -JERK_MAX / 6.0f, JERK_MAX / 6.0f, 12);
    cmd->traj.spline.phi_a_3 = map_to_signed(spline->a_3.angle, -ANGLE_JERK_MAX / 6.0f, ANGLE_JERK_MAX / 6.0f, 14);
}

bool read_spline(RadioCommand2025Spline *spline, const RegularCommandPayload2025 *cmd) {
    if (cmd->traj_type != SPLINE) {
        return false;
    }

    spline->a_0.x = map_from_signed(cmd->traj.spline.x_a_0, 11, -POS_MAX, POS_MAX);
    spline->a_0.y = map_from_signed(cmd->traj.spline.y_a_0, 11, -POS_MAX, POS_MAX);
    spline->a_0.angle = map_from_signed(cmd->traj.spline.phi_a_0, 11, -ANGLE_MAX, ANGLE_MAX);

    spline->a_1.x = map_from_signed(cmd->traj.spline.x_a_1, 11, -VEL_MAX, VEL_MAX);
    spline->a_1.y = map_from_signed(cmd->traj.spline.y_a_1, 11, -VEL_MAX, VEL_MAX);
    spline->a_1.angle = map_from_signed(cmd->traj.spline.phi_a_1, 11, -ANGLE_VEL_MAX, ANGLE_VEL_MAX);

    // the /2 and /6 is there for the following reason:
    // these are the second coefficient of the polynomial describing the robot position: a0 + a1*x + a2*x^2 + a3*x^3
    // differentiating twice to get the acceleration leads to: 2*a2 + 6*a3*x
    // differentiating another time to get the jeak leads to: 6*a3
    //
    // so even the acceleration the robot experiences is twice the value of the second coefficient,
    // so the range of the second coefficient must be half that of the acceleration
    // and the range of the third coefficient must be a sixth of the range of the jerk
    spline->a_2.x = map_from_signed(cmd->traj.spline.x_a_2, 11, -ACC_MAX / 2.0f, ACC_MAX / 2.0f);
    spline->a_2.y = map_from_signed(cmd->traj.spline.y_a_2, 11, -ACC_MAX / 2.0f, ACC_MAX / 2.0f);
    spline->a_2.angle = map_from_signed(cmd->traj.spline.phi_a_2, 12, -ANGLE_ACC_MAX / 2.0f, ANGLE_ACC_MAX / 2.0f);

    spline->a_3.x = map_from_signed(cmd->traj.spline.x_a_3, 12, -JERK_MAX / 6.0f, JERK_MAX / 6.0f);
    spline->a_3.y = map_from_signed(cmd->traj.spline.y_a_3, 12, -JERK_MAX / 6.0f, JERK_MAX / 6.0f);
    spline->a_3.angle = map_from_signed(cmd->traj.spline.phi_a_3, 14, -ANGLE_JERK_MAX / 6.0f, ANGLE_JERK_MAX / 6.0f);
    return true;
}
