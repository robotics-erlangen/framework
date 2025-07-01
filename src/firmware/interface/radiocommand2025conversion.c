#include "firmware-interface/radiocommand2025conversion.h"
#include "firmware-interface/radiocommand2025regular.h"
#include <math.h>


#define EPSILON (1e-8)


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

    // To just slightly tip the rounding towards +inf, we add EPSILON.
    // That way, when mapping 0 from a symmetric interval [-a, a] to a N bit signed integer interval,
    // 0 is mapped to 0 instead of -1. Because otherwise the call below would result in roundf(-.5f),
    // which equals -1.
    int32_t y = roundf(y_min + (y_max - y_min) * (x - x_min) / (x_max - x_min) + EPSILON);
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
    cmd->shot_power = map_to_unsigned(common->shot_power, 0.0f, common->is_chip ? CHIP_DISTANCE_MAX : LINEAR_SHOT_SPEED_MAX, SHOT_POWER_BITS);
    cmd->is_chip = common->is_chip;
    cmd->charge = common->charge;
    cmd->force_kick = common->force_kick;

    cmd->has_detection = common->has_detection;
    if (common->has_detection) {
        cmd->detection_pos_x = map_to_signed(common->detection.coords.x, -POS_MAX, POS_MAX, POS_BITS);
        cmd->detection_pos_y = map_to_signed(common->detection.coords.y, -POS_MAX, POS_MAX, POS_BITS);
        cmd->detection_phi = map_to_signed(normalize_angle(common->detection.angle), -ANGLE_MAX, ANGLE_MAX, ANGLE_BITS);
    } else {
        cmd->detection_pos_x = 0;
        cmd->detection_pos_y = 0;
        cmd->detection_phi = 0;
    }
}

void read_common(RadioCommand2025Common *common, const RegularCommandPayload2025 *cmd) {
    common->standby = cmd->standby;
    common->eject_sd_card = cmd->eject_sd_card;
    common->time_offset = map_from_signed(cmd->time_offset, TIME_OFFSET_BITS, -TIME_OFFSET_MAX, TIME_OFFSET_MAX);

    common->dribbler = map_from_signed(cmd->dribbler, DRIBBLER_BITS, -DRIBBLER_MAX, DRIBBLER_MAX);
    common->shot_power = map_from_unsigned(cmd->shot_power, SHOT_POWER_BITS, 0.0f, cmd->is_chip ? CHIP_DISTANCE_MAX : LINEAR_SHOT_SPEED_MAX);
    common->is_chip = cmd->is_chip;
    common->charge = cmd->charge;
    common->force_kick = cmd->force_kick;

    common->has_detection = cmd->has_detection;
    if (cmd->has_detection) {
        common->detection.coords.x = map_from_signed(cmd->detection_pos_x, POS_BITS, -POS_MAX, POS_MAX);
        common->detection.coords.y = map_from_signed(cmd->detection_pos_y, POS_BITS, -POS_MAX, POS_MAX);
        common->detection.angle = map_from_signed(cmd->detection_phi, ANGLE_BITS, -ANGLE_MAX, ANGLE_MAX);
    } else {
        common->detection.coords.x = NAN;
        common->detection.coords.y = NAN;
        common->detection.angle = NAN;
    }
}

void set_halt(RegularCommandPayload2025 *cmd) {
    cmd->traj_type = HALT;
    cmd->traj.halt.unused = 0;
}

bool is_halt(const RegularCommandPayload2025 *cmd) {
    return cmd->traj_type == HALT;
}

void write_trajectory_path(const RadioCommand2025TrajectoryPath *traj, RegularCommandPayload2025 *cmd) {
    cmd->traj_type = TRAJECTORY_PATH;

    cmd->traj.trajectory_path.start_pos_x = map_to_signed(traj->start_state.coords.x, -POS_MAX, POS_MAX, POS_BITS);
    cmd->traj.trajectory_path.start_pos_y = map_to_signed(traj->start_state.coords.y, -POS_MAX, POS_MAX, POS_BITS);
    cmd->traj.trajectory_path.start_phi = map_to_signed(normalize_angle(traj->start_state.angle), -ANGLE_MAX, ANGLE_MAX, ANGLE_BITS);

    cmd->traj.trajectory_path.start_vel_x = map_to_signed(traj->start_vel.x, -VEL_MAX, VEL_MAX, VEL_BITS);
    cmd->traj.trajectory_path.start_vel_y = map_to_signed(traj->start_vel.y, -VEL_MAX, VEL_MAX, VEL_BITS);

    cmd->traj.trajectory_path.end_phi = map_to_signed(normalize_angle(traj->end_angle), -ANGLE_MAX, ANGLE_MAX, ANGLE_BITS);

    cmd->traj.trajectory_path.end_vel_x = map_to_signed(traj->end_vel.x, -VEL_MAX, VEL_MAX, VEL_BITS);
    cmd->traj.trajectory_path.end_vel_y = map_to_signed(traj->end_vel.y, -VEL_MAX, VEL_MAX, VEL_BITS);

    cmd->traj.trajectory_path.alpha = map_to_signed(normalize_angle(traj->alpha), -ANGLE_MAX, ANGLE_MAX, TRAJECTORY_PATH_ALPHA_BITS);
    cmd->traj.trajectory_path.t = map_to_unsigned(traj->t, 0, TRAJECTORY_PATH_T_MAX, TRAJECTORY_PATH_T_BITS);
    cmd->traj.trajectory_path.acceleration = map_to_unsigned(traj->acceleration, 0, ACC_MAX, TRAJECTORY_PATH_ACC_BITS);
    cmd->traj.trajectory_path.v_max = map_to_unsigned(traj->v_max, 0, VEL_MAX, TRAJECTORY_PATH_MAX_VEL_BITS);

    cmd->traj.trajectory_path.slow_down_time = map_to_unsigned(traj->slow_down_time, 0, TRAJECTORY_PATH_SLOW_DOWN_TIME_MAX, TRAJECTORY_PATH_SLOW_DOWN_TIME_BITS);
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

    traj->slow_down_time = map_from_unsigned(cmd->traj.trajectory_path.slow_down_time, TRAJECTORY_PATH_SLOW_DOWN_TIME_BITS, 0, TRAJECTORY_PATH_SLOW_DOWN_TIME_MAX);
    traj->is_fast_endspeed = cmd->traj.trajectory_path.is_fast_endspeed;
    return true;
}

void write_spline(const RadioCommand2025Spline *spline, RegularCommandPayload2025 *cmd, const bool is_local) {
    cmd->traj_type = is_local ? LOCAL_SPLINE : GLOBAL_SPLINE;

    cmd->traj.spline.x_pos = map_to_signed(spline->pos.coords.x, -POS_MAX, POS_MAX, POS_BITS);
    cmd->traj.spline.y_pos = map_to_signed(spline->pos.coords.y, -POS_MAX, POS_MAX, POS_BITS);
    cmd->traj.spline.phi_pos = map_to_signed(normalize_angle(spline->pos.angle), -ANGLE_MAX, ANGLE_MAX, ANGLE_BITS);

    cmd->traj.spline.x_vel = map_to_signed(spline->vel.coords.x, -VEL_MAX, VEL_MAX, VEL_BITS);
    cmd->traj.spline.y_vel = map_to_signed(spline->vel.coords.y, -VEL_MAX, VEL_MAX, VEL_BITS);
    cmd->traj.spline.phi_vel = map_to_signed(spline->vel.angle, -ANGLE_VEL_MAX, ANGLE_VEL_MAX, ANGLE_VEL_BITS);

    cmd->traj.spline.x_acc = map_to_signed(spline->acc.coords.x, -ACC_MAX, ACC_MAX, ACC_BITS);
    cmd->traj.spline.y_acc = map_to_signed(spline->acc.coords.y, -ACC_MAX, ACC_MAX, ACC_BITS);
    cmd->traj.spline.phi_acc = map_to_signed(spline->acc.angle, -ANGLE_ACC_MAX, ANGLE_ACC_MAX, ANGLE_ACC_BITS);

    cmd->traj.spline.x_jerk = map_to_signed(spline->jerk.coords.x, -JERK_MAX, JERK_MAX, JERK_BITS);
    cmd->traj.spline.y_jerk = map_to_signed(spline->jerk.coords.y, -JERK_MAX, JERK_MAX, JERK_BITS);
    cmd->traj.spline.phi_jerk = map_to_signed(spline->jerk.angle, -ANGLE_JERK_MAX, ANGLE_JERK_MAX, ANGLE_JERK_BITS);
}

bool read_spline(RadioCommand2025Spline *spline, const RegularCommandPayload2025 *cmd, const bool is_local) {
    if (cmd->traj_type != (is_local ? LOCAL_SPLINE : GLOBAL_SPLINE)) {
        return false;
    }

    spline->pos.coords.x = map_from_signed(cmd->traj.spline.x_pos, POS_BITS, -POS_MAX, POS_MAX);
    spline->pos.coords.y = map_from_signed(cmd->traj.spline.y_pos, POS_BITS, -POS_MAX, POS_MAX);
    spline->pos.angle = map_from_signed(cmd->traj.spline.phi_pos, ANGLE_BITS, -ANGLE_MAX, ANGLE_MAX);

    spline->vel.coords.x = map_from_signed(cmd->traj.spline.x_vel, VEL_BITS, -VEL_MAX, VEL_MAX);
    spline->vel.coords.y = map_from_signed(cmd->traj.spline.y_vel, VEL_BITS, -VEL_MAX, VEL_MAX);
    spline->vel.angle = map_from_signed(cmd->traj.spline.phi_vel, ANGLE_VEL_BITS, -ANGLE_VEL_MAX, ANGLE_VEL_MAX);

    spline->acc.coords.x = map_from_signed(cmd->traj.spline.x_acc, ACC_BITS, -ACC_MAX, ACC_MAX);
    spline->acc.coords.y = map_from_signed(cmd->traj.spline.y_acc, ACC_BITS, -ACC_MAX, ACC_MAX);
    spline->acc.angle = map_from_signed(cmd->traj.spline.phi_acc, ANGLE_ACC_BITS, -ANGLE_ACC_MAX, ANGLE_ACC_MAX);

    spline->jerk.coords.x = map_from_signed(cmd->traj.spline.x_jerk, JERK_BITS, -JERK_MAX, JERK_MAX);
    spline->jerk.coords.y = map_from_signed(cmd->traj.spline.y_jerk, JERK_BITS, -JERK_MAX, JERK_MAX);
    spline->jerk.angle = map_from_signed(cmd->traj.spline.phi_jerk, ANGLE_JERK_BITS, -ANGLE_JERK_MAX, ANGLE_JERK_MAX);
    return true;
}

void write_response(const RadioCommand2025Response *response, RegularResponsePayload2025 *payload) {
    payload->battery = map_to_unsigned(response->battery, 0.0f, 1.0f, BATTERY_BITS);
    payload->packet_loss = map_to_unsigned(response->packet_loss, 0.0f, 1.0f, PACKET_LOSS_BITS);

    payload->motor0_status = response->motor_status[MOTOR_FR];
    payload->motor1_status = response->motor_status[MOTOR_FL];
    payload->motor2_status = response->motor_status[MOTOR_BR];
    payload->motor3_status = response->motor_status[MOTOR_BL];
    payload->dribbler_status = response->motor_status[DRIBBLER];
    payload->kicker_status = response->kicker_status;
    payload->imu_status = response->imu_status;
    payload->sd_status = response->sd_status;

    payload->motor0_load_torque = map_to_signed(response->motor_load_torque[MOTOR_FR], -LOAD_TORQUE_MAX, LOAD_TORQUE_MAX, LOAD_TORQUE_BITS);
    payload->motor1_load_torque = map_to_signed(response->motor_load_torque[MOTOR_FL], -LOAD_TORQUE_MAX, LOAD_TORQUE_MAX, LOAD_TORQUE_BITS);
    payload->motor2_load_torque = map_to_signed(response->motor_load_torque[MOTOR_BR], -LOAD_TORQUE_MAX, LOAD_TORQUE_MAX, LOAD_TORQUE_BITS);
    payload->motor3_load_torque = map_to_signed(response->motor_load_torque[MOTOR_BL], -LOAD_TORQUE_MAX, LOAD_TORQUE_MAX, LOAD_TORQUE_BITS);
    payload->dribbler_load_torque = map_to_signed(response->motor_load_torque[DRIBBLER], -LOAD_TORQUE_MAX, LOAD_TORQUE_MAX, LOAD_TORQUE_BITS);

    payload->measured_pos_x = map_to_signed(response->measured_pos.coords.x, -POS_MAX, POS_MAX, MEASURED_POS_BITS);
    payload->measured_pos_y = map_to_signed(response->measured_pos.coords.y, -POS_MAX, POS_MAX, MEASURED_POS_BITS);
    payload->measured_phi = map_to_signed(response->measured_pos.angle, -ANGLE_MAX, ANGLE_MAX, MEASURED_ANGLE_BITS);
    payload->measured_vel_x = map_to_signed(response->measured_vel.coords.x, -VEL_MAX, VEL_MAX, MEASURED_VEL_BITS);
    payload->measured_vel_y = map_to_signed(response->measured_vel.coords.y, -VEL_MAX, VEL_MAX, MEASURED_VEL_BITS);
    payload->measured_omega = map_to_signed(response->measured_vel.angle, -ANGLE_VEL_MAX, ANGLE_VEL_MAX, MEASURED_ANGLE_VEL_BITS);

    payload->power_enabled = response->power_enabled;
    payload->ball_detected = response->ball_detected;
}

void read_response(RadioCommand2025Response *response, const RegularResponsePayload2025 *payload) {
    response->battery = map_from_unsigned(payload->battery, BATTERY_BITS, 0.0f, 1.0f);
    response->packet_loss = map_from_unsigned(payload->packet_loss, PACKET_LOSS_BITS, 0.0f, 1.0f);

    response->motor_status[MOTOR_FR] = payload->motor0_status;
    response->motor_status[MOTOR_FL] = payload->motor1_status;
    response->motor_status[MOTOR_BR] = payload->motor2_status;
    response->motor_status[MOTOR_BL] = payload->motor3_status;
    response->motor_status[DRIBBLER] = payload->dribbler_status;
    response->kicker_status = payload->kicker_status;
    response->imu_status = payload->imu_status;
    response->sd_status = payload->sd_status;

    response->motor_load_torque[MOTOR_FR] = map_from_signed(payload->motor0_load_torque, LOAD_TORQUE_BITS, -LOAD_TORQUE_MAX, LOAD_TORQUE_MAX);
    response->motor_load_torque[MOTOR_FL] = map_from_signed(payload->motor1_load_torque, LOAD_TORQUE_BITS, -LOAD_TORQUE_MAX, LOAD_TORQUE_MAX);
    response->motor_load_torque[MOTOR_BR] = map_from_signed(payload->motor2_load_torque, LOAD_TORQUE_BITS, -LOAD_TORQUE_MAX, LOAD_TORQUE_MAX);
    response->motor_load_torque[MOTOR_BL] = map_from_signed(payload->motor3_load_torque, LOAD_TORQUE_BITS, -LOAD_TORQUE_MAX, LOAD_TORQUE_MAX);
    response->motor_load_torque[DRIBBLER] = map_from_signed(payload->dribbler_load_torque, LOAD_TORQUE_BITS, -LOAD_TORQUE_MAX, LOAD_TORQUE_MAX);

    response->measured_pos.coords.x = map_from_signed(payload->measured_pos_x, MEASURED_POS_BITS, -POS_MAX, POS_MAX);
    response->measured_pos.coords.y = map_from_signed(payload->measured_pos_y, MEASURED_POS_BITS, -POS_MAX, POS_MAX);
    response->measured_pos.angle = map_from_signed(payload->measured_phi, MEASURED_ANGLE_BITS, -ANGLE_MAX, ANGLE_MAX);
    response->measured_vel.coords.x = map_from_signed(payload->measured_vel_x, MEASURED_VEL_BITS, -VEL_MAX, VEL_MAX);
    response->measured_vel.coords.y = map_from_signed(payload->measured_vel_y, MEASURED_VEL_BITS, -VEL_MAX, VEL_MAX);
    response->measured_vel.angle = map_from_signed(payload->measured_omega, MEASURED_ANGLE_VEL_BITS, -ANGLE_VEL_MAX, ANGLE_VEL_MAX);

    response->power_enabled = payload->power_enabled;
    response->ball_detected = payload->ball_detected;
}
