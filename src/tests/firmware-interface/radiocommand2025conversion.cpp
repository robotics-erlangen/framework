/***************************************************************************
 *   Copyright 2025 Christoph Schmidtmeier                                 *
 *   Robotics Erlangen e.V.                                                *
 *   http://www.robotics-erlangen.de/                                      *
 *   info@robotics-erlangen.de                                             *
 *                                                                         *
 *   This program is free software: you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation, either version 3 of the License, or     *
 *   any later version.                                                    *
 *                                                                         *
 *   This program is distributed in the hope that it will be useful,       *
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
 *   GNU General Public License for more details.                          *
 *                                                                         *
 *   You should have received a copy of the GNU General Public License     *
 *   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
 ***************************************************************************/

#include "gtest/gtest.h"
#include "core/rng.h"
#include "util.h"
#include "firmware-interface/radiocommand2025conversion.h"


// the maximum absolute error is half the resolution plus a little extra for floating point inaccuracies
#define ABS_ERROR(min, max, bits) (RESOLUTION(min, max, bits) / 2 * 1.005f)
#define RESOLUTION(min, max, bits) (((max) - (min)) / (1 << (bits)))


bool static randomBool(RNG &rng) {
    return rng.uniform() >= 0.5;
}

RadioCommand2025Vector static randomVector(RNG &rng, float max) {
    return {
        .x = rng.uniformFloat(-max, max),
        .y = rng.uniformFloat(-max, max),
    };
}

RadioCommand2025State static randomState(RNG &rng, float xyMax, float angleMax) {
    return {
        .coords = randomVector(rng, xyMax),
        .angle = rng.uniformFloat(-angleMax, angleMax),
    };
}

RadioCommand2025Common static randomCommon(RNG &rng) {
    const bool is_chip = randomBool(rng);
    float shot_power;
    if (is_chip) {
        shot_power = rng.uniformFloat(0, CHIP_DISTANCE_MAX);
    } else {
        shot_power = rng.uniformFloat(0, LINEAR_SHOT_SPEED_MAX);
    }
    return {
        .time_offset = rng.uniformFloat(0, TIME_OFFSET_MAX),
        .standby = randomBool(rng),
        .eject_sd_card = randomBool(rng),

        .dribbler = rng.uniformFloat(-DRIBBLER_MAX, DRIBBLER_MAX),
        .shot_power = shot_power,
        .is_chip = is_chip,
        .charge = randomBool(rng),
        .force_kick = randomBool(rng),

        .detection = randomState(rng, POS_MAX, ANGLE_MAX),
    };
}

RadioCommand2025TrajectoryPath static randomTrajectoryPath(RNG &rng) {
    return {
        .start_state = randomState(rng, POS_MAX, ANGLE_MAX),
        .start_vel = randomVector(rng, VEL_MAX),
        .end_angle = rng.uniformFloat(-ANGLE_MAX, ANGLE_MAX),
        .end_vel = randomVector(rng, VEL_MAX),

        .alpha = rng.uniformFloat(-ANGLE_MAX, ANGLE_MAX),
        .t = rng.uniformFloat(0, TRAJECTORY_PATH_T_MAX),
        .acceleration = rng.uniformFloat(0, ACC_MAX),
        .v_max = rng.uniformFloat(0, VEL_MAX),

        .slow_down_time = rng.uniformFloat(0, TRAJECTORY_PATH_SLOT_DOWN_TIME_MAX),
        .is_fast_endspeed = randomBool(rng),
    };
}

RadioCommand2025Spline static randomSpline(RNG &rng) {
    RadioCommand2025State pos = randomState(rng, POS_MAX, ANGLE_MAX);
    RadioCommand2025State vel = randomState(rng, VEL_MAX, ANGLE_VEL_MAX);
    RadioCommand2025State acc = randomState(rng, ACC_MAX, ANGLE_ACC_MAX);
    RadioCommand2025State jerk = randomState(rng, JERK_MAX, ANGLE_JERK_MAX);

    return {
        .a_0 = pos, // 0! = 1
        .a_1 = vel, // 1! = 1
        .a_2 = { // 2! = 2
            .coords = {
                .x = acc.coords.x / 2.0f,
                .y = acc.coords.y / 2.0f,
            },
            .angle = acc.angle / 2.0f,
        },
        .a_3 = { // 3! = 6
            .coords = {
                .x = jerk.coords.x / 6.0f,
                .y = jerk.coords.y / 6.0f,
            },
            .angle = jerk.angle / 6.0f,
        },
    };
}

static bool vectorEq(const RadioCommand2025Vector &a, const RadioCommand2025Vector &b, float error) {
    // setting the relative error to 0 disables it, only the absolute error is of interest here
    return approxEq(a.x, b.x, 0, error)
        && approxEq(a.y, b.y, 0, error);
}

static std::ostream &operator<<(std::ostream &out, const RadioCommand2025Vector &a) {
    return out << "Vector(" << a.x << ", " << a.y << ")";
}

static bool stateEq(const RadioCommand2025State &a, const RadioCommand2025State &b, float xyError, float angleError) {
    // setting the relative error to 0 disables it, only the absolute error is of interest here
    return vectorEq(a.coords, b.coords, xyError)
        && approxEq(a.angle, b.angle, 0, angleError);
}

static std::ostream &operator<<(std::ostream &out, const RadioCommand2025State &a) {
    return out << "State { "
        << ".coords=" << a.coords << ", "
        << ".angle=" << a.angle << " }";
}

#define ASSERT_COMMON_EQ(a, b) ASSERT_PRED2(commonEq, a, b)
static bool commonEq(const RadioCommand2025Common &a, const RadioCommand2025Common &b) {
    return approxEq(a.time_offset, b.time_offset, 0, ABS_ERROR(-TIME_OFFSET_MAX, TIME_OFFSET_MAX, TIME_OFFSET_BITS))
        && a.standby == b.standby
        && a.eject_sd_card == b.eject_sd_card

        && approxEq(a.dribbler, b.dribbler, 0, ABS_ERROR(-DRIBBLER_MAX, DRIBBLER_MAX, DRIBBLER_BITS))
        && approxEq(a.shot_power, b.shot_power, 0, ABS_ERROR(0, a.is_chip ? CHIP_DISTANCE_MAX : LINEAR_SHOT_SPEED_MAX, SHOT_POWER_BITS))
        && a.is_chip == b.is_chip
        && a.charge == b.charge
        && a.force_kick == b.force_kick

        && stateEq(a.detection, b.detection, ABS_ERROR(-POS_MAX, POS_MAX, POS_BITS), ABS_ERROR(-ANGLE_MAX, ANGLE_MAX, ANGLE_BITS));
}

static std::ostream &operator<<(std::ostream &out, const RadioCommand2025Common &a) {
    return out << "RadioCommand2025Common { "
        << ".time_offset=" << a.time_offset << ", "
        << ".standby=" << a.standby << ", "
        << ".eject_sd_card=" << a.eject_sd_card << ", "

        << ".dribbler=" << a.dribbler << ", "
        << ".shot_power=" << a.shot_power << ", "
        << ".is_chip=" << a.is_chip << ", "
        << ".charge=" << a.charge << ", "
        << ".force_kick=" << a.force_kick << ", "

        << ".detection=" << a.detection << " }";
}


#define ASSERT_TRAJECTORY_PATH_EQ(a, b) ASSERT_PRED2(trajectoryPathEq, a, b)
static bool trajectoryPathEq(const RadioCommand2025TrajectoryPath &a, const RadioCommand2025TrajectoryPath &b) {
    return stateEq(a.start_state, b.start_state, ABS_ERROR(-POS_MAX, POS_MAX, POS_BITS), ABS_ERROR(-ANGLE_MAX, ANGLE_MAX, ANGLE_BITS))
        && vectorEq(a.start_vel, b.start_vel, ABS_ERROR(-VEL_MAX, VEL_MAX, VEL_BITS))
        && approxEq(a.end_angle, b.end_angle, 0, ABS_ERROR(-ANGLE_MAX, ANGLE_MAX, ANGLE_BITS))
        && vectorEq(a.end_vel, b.end_vel, ABS_ERROR(-VEL_MAX, VEL_MAX, VEL_BITS))

        && approxEq(a.alpha, b.alpha, 0, ABS_ERROR(-ANGLE_MAX, ANGLE_MAX, TRAJECTORY_PATH_ALPHA_BITS))
        && approxEq(a.t, b.t, 0, ABS_ERROR(0, TRAJECTORY_PATH_T_MAX, TRAJECTORY_PATH_T_BITS))
        && approxEq(a.acceleration, b.acceleration, 0, ABS_ERROR(0, ACC_MAX, TRAJECTORY_PATH_ACC_BITS))
        && approxEq(a.v_max, b.v_max, 0, ABS_ERROR(0, VEL_MAX, TRAJECTORY_PATH_MAX_VEL_BITS))

        && approxEq(a.slow_down_time, b.slow_down_time, 0, ABS_ERROR(0, TRAJECTORY_PATH_SLOT_DOWN_TIME_MAX, TRAJECTORY_PATH_SLOT_DOWN_TIME_BITS))
        && a.is_fast_endspeed == b.is_fast_endspeed;
}

static std::ostream &operator<<(std::ostream &out, const RadioCommand2025TrajectoryPath &a) {
    return out << "RadioCommand2025TrajectoryPath { "
        << ".start_state=" << a.start_state << ", "
        << ".start_vel=" << a.start_vel << ", "
        << ".end_angle=" << a.end_angle << ", "
        << ".end_vel=" << a.end_vel << ", "

        << ".alpha=" << a.alpha << ", "
        << ".t=" << a.t << ", "
        << ".acceleration=" << a.acceleration << ", "
        << ".v_max=" << a.v_max << ", "

        << ".slow_down_time=" << a.slow_down_time << ", "
        << ".is_fast_endspeed=" << a.is_fast_endspeed << " }";
}

#define ASSERT_SPLINE_EQ(a, b) ASSERT_PRED2(splineEq, a, b)
static bool splineEq(const RadioCommand2025Spline &a, const RadioCommand2025Spline &b) {
    return stateEq(a.a_0, b.a_0, ABS_ERROR(-POS_MAX, POS_MAX, POS_BITS), ABS_ERROR(-ANGLE_MAX, ANGLE_MAX, ANGLE_BITS))
        && stateEq(a.a_1, b.a_1, ABS_ERROR(-VEL_MAX, VEL_MAX, VEL_BITS), ABS_ERROR(-ANGLE_VEL_MAX, ANGLE_VEL_MAX, ANGLE_VEL_BITS))
        && stateEq(a.a_2, b.a_2, ABS_ERROR(0, ACC_MAX, ACC_BITS), ABS_ERROR(0, ANGLE_ACC_MAX, ANGLE_ACC_BITS))
        && stateEq(a.a_3, b.a_3, ABS_ERROR(0, JERK_MAX, JERK_BITS), ABS_ERROR(0, ANGLE_JERK_MAX, ANGLE_JERK_BITS));
}

static std::ostream &operator<<(std::ostream &out, const RadioCommand2025Spline &a) {
    return out << "RadioCommand2025Spline { "
        << ".a_0=" << a.a_0 << ", "
        << ".a_1=" << a.a_1 << ", "
        << ".a_2=" << a.a_2 << ", "
        << ".a_3=" << a.a_3 << " }";
}


#define NUM_TEST_ITERATIONS 10000

TEST(RadioCommand2025, ReadWriteCommon) {
    for (uint32_t i = 0; i < NUM_TEST_ITERATIONS; i++) {
        RNG rng{i + 123};
        RegularCommandPayload2025 cmd;

        RadioCommand2025Common written = randomCommon(rng);
        write_common(&written, &cmd);

        RadioCommand2025Common read;
        read_common(&read, &cmd);
        ASSERT_COMMON_EQ(written, read);
    }
}

TEST(RadioCommand2025, SetHalt) {
    RegularCommandPayload2025 cmd;
    RadioCommand2025Spline ignoredSpline;
    RadioCommand2025TrajectoryPath ignoredTrajectoryPath;

    set_halt(&cmd);

    ASSERT_TRUE(is_halt(&cmd));
    ASSERT_FALSE(read_spline(&ignoredSpline, &cmd));
    ASSERT_FALSE(read_trajectory_path(&ignoredTrajectoryPath, &cmd));
}

TEST(RadioCommand2025, ReadWriteTrajectoryPath) {
    for (uint32_t i = 0; i < NUM_TEST_ITERATIONS; i++) {
        RNG rng{i + 123};
        RegularCommandPayload2025 cmd;

        RadioCommand2025TrajectoryPath written = randomTrajectoryPath(rng);
        write_trajectory_path(&written, &cmd);

        ASSERT_FALSE(is_halt(&cmd));

        RadioCommand2025Spline ignored;
        ASSERT_FALSE(read_spline(&ignored, &cmd));

        RadioCommand2025TrajectoryPath read;
        ASSERT_TRUE(read_trajectory_path(&read, &cmd));
        ASSERT_TRAJECTORY_PATH_EQ(written, read);
    }
}

TEST(RadioCommand2025, ReadWriteSpline) {
    for (uint32_t i = 0; i < NUM_TEST_ITERATIONS; i++) {
        RNG rng{i + 123};
        RegularCommandPayload2025 cmd;

        RadioCommand2025Spline written = randomSpline(rng);
        write_spline(&written, &cmd);

        ASSERT_FALSE(is_halt(&cmd));

        RadioCommand2025TrajectoryPath ignored;
        ASSERT_FALSE(read_trajectory_path(&ignored, &cmd));

        RadioCommand2025Spline read;
        ASSERT_TRUE(read_spline(&read, &cmd));
        ASSERT_SPLINE_EQ(written, read);
    }
}

TEST(RadioCommand2025, ReadWriteCombined) {
    for (uint32_t i = 0; i < NUM_TEST_ITERATIONS; i++) {
        RNG rng{i + 123};
        RegularCommandPayload2025 cmd;

        RadioCommand2025Common writtenCommon = randomCommon(rng);
        RadioCommand2025TrajectoryPath writtenTrajectoryPath = randomTrajectoryPath(rng);
        RadioCommand2025Spline writtenSpline = randomSpline(rng);

        RadioCommand2025Common readCommon;
        RadioCommand2025TrajectoryPath readTrajectoryPath;
        RadioCommand2025Spline readSpline;

        write_common(&writtenCommon, &cmd);
        read_common(&readCommon, &cmd);
        ASSERT_COMMON_EQ(writtenCommon, readCommon);

        write_trajectory_path(&writtenTrajectoryPath, &cmd);
        ASSERT_FALSE(is_halt(&cmd));
        ASSERT_FALSE(read_spline(&readSpline, &cmd));
        ASSERT_TRUE(read_trajectory_path(&readTrajectoryPath, &cmd));
        ASSERT_TRAJECTORY_PATH_EQ(writtenTrajectoryPath, readTrajectoryPath);

        read_common(&readCommon, &cmd);
        ASSERT_COMMON_EQ(writtenCommon, readCommon);

        write_spline(&writtenSpline, &cmd);
        ASSERT_FALSE(is_halt(&cmd));
        ASSERT_FALSE(read_trajectory_path(&readTrajectoryPath, &cmd));
        ASSERT_TRUE(read_spline(&readSpline, &cmd));
        ASSERT_SPLINE_EQ(writtenSpline, readSpline);

        read_common(&readCommon, &cmd);
        ASSERT_COMMON_EQ(writtenCommon, readCommon);

        set_halt(&cmd);
        ASSERT_FALSE(read_spline(&readSpline, &cmd));
        ASSERT_FALSE(read_trajectory_path(&readTrajectoryPath, &cmd));
        ASSERT_TRUE(is_halt(&cmd));

        read_common(&readCommon, &cmd);
        ASSERT_COMMON_EQ(writtenCommon, readCommon);
    }
}
