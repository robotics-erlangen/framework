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

bool static randomBool(RNG &rng) {
    return rng.uniform() >= 0.5;
}

RadioCommand2025State static randomState(RNG &rng, float xyMax, float angleMax) {
    return {
        .x = rng.uniformFloat(-xyMax, xyMax),
        .y = rng.uniformFloat(-xyMax, xyMax),
        .angle = rng.uniformFloat(-angleMax, angleMax),
    };
}

RadioCommand2025Common static randomCommon(RNG &rng) {
    return {
        .time_offset = rng.uniformFloat(0, TIME_OFFSET_MAX),
        .standby = randomBool(rng),
        .eject_sd_card = randomBool(rng),

        .shot_power = rng.uniformFloat(0, SHOT_POWER_MAX),
        .dribbler = rng.uniformFloat(0, DRIBBLER_MAX),
        .force_kick = randomBool(rng),
        .is_chip = randomBool(rng),
        .charge = randomBool(rng),

        .detection = randomState(rng, POS_MAX, ANGLE_MAX),
    };
}

RadioCommand2025TrajectoryPath static randomTrajectoryPath(RNG &rng) {
    return {
        .start_pos = randomState(rng, POS_MAX, ANGLE_MAX),
        .start_vel = randomState(rng, VEL_MAX, ANGLE_VEL_MAX),
        .end_vel = randomState(rng, VEL_MAX, ANGLE_VEL_MAX),

        .alpha = rng.uniformFloat(-ANGLE_MAX, ANGLE_MAX),
        .t = rng.uniformFloat(0, TRAJECTORY_PATH_T_MAX),
        .a_max = rng.uniformFloat(0, ACC_MAX),
        .v_max = rng.uniformFloat(0, VEL_MAX),
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
            .x = acc.x / 2.0f,
            .y = acc.y / 2.0f,
            .angle = acc.angle / 2.0f,
        },
        .a_3 = { // 3! = 6
            .x = jerk.x / 6.0f,
            .y = jerk.y / 6.0f,
            .angle = jerk.angle / 6.0f,
        },
    };
}

static bool stateEq(const RadioCommand2025State &a, const RadioCommand2025State &b, float xyError, float angleError) {
    // setting the relative error to 0 disables it, only the absolute error is of interest here
    return approxEq(a.x, b.x, 0, xyError)
        && approxEq(a.y, b.y, 0, xyError)
        && approxEq(a.angle, b.angle, 0, angleError);
}

static std::ostream &operator<<(std::ostream &out, const RadioCommand2025State &a) {
    return out << "State { "
        << ".x=" << a.x << ", "
        << ".y=" << a.y << ", "
        << ".angle=" << a.angle << " }";
}

#define ASSERT_COMMON_EQ(a, b) ASSERT_PRED2(commonEq, a, b)
static bool commonEq(const RadioCommand2025Common &a, const RadioCommand2025Common &b) {
    return approxEq(a.time_offset, b.time_offset, 0, 1e-2)
        && a.standby == b.standby
        && a.eject_sd_card == b.eject_sd_card

        && approxEq(a.shot_power, b.shot_power, 0, 5e-2)
        && approxEq(a.dribbler, b.dribbler, 0, 5e-2)
        && a.force_kick == b.force_kick
        && a.is_chip == b.is_chip
        && a.charge == b.charge

        && stateEq(a.detection, b.detection, 1e-2, 2e-2);
}

static std::ostream &operator<<(std::ostream &out, const RadioCommand2025Common &a) {
    return out << "RadioCommand2025Common { "
        << ".time_offset=" << a.time_offset << ", "
        << ".standby=" << a.standby << ", "
        << ".eject_sd_card=" << a.eject_sd_card << ", "

        << ".shot_power=" << a.shot_power << ", "
        << ".dribbler=" << a.dribbler << ", "
        << ".force_kick=" << a.force_kick << ", "
        << ".is_chip=" << a.is_chip << ", "
        << ".charge=" << a.charge << ", "

        << ".detection=" << a.detection << " }";
}


#define ASSERT_TRAJECTORY_PATH_EQ(a, b) ASSERT_PRED2(trajectoryPathEq, a, b)
static bool trajectoryPathEq(const RadioCommand2025TrajectoryPath &a, const RadioCommand2025TrajectoryPath &b) {
    return stateEq(a.start_pos, b.start_pos, 1e-2, 1e-2)
        && stateEq(a.start_vel, b.start_vel, 1e-1, 15.0)
        && stateEq(a.end_vel, b.end_vel, 1e-1, 15.0)

        && approxEq(a.alpha, b.alpha, 0, 1e-2)
        && approxEq(a.t, b.t, 0, 1e-2)
        && approxEq(a.a_max, b.a_max, 0, 3e-2)
        && approxEq(a.v_max, b.v_max, 0, 2e-2);
}

static std::ostream &operator<<(std::ostream &out, const RadioCommand2025TrajectoryPath &a) {
    return out << "RadioCommand2025TrajectoryPath { "
        << ".start_pos=" << a.start_pos << ", "
        << ".start_vel=" << a.start_vel << ", "
        << ".end_vel=" << a.end_vel << ", "

        << ".alpha=" << a.alpha << ", "
        << ".t=" << a.t << ", "
        << ".a_max=" << a.a_max << ", "
        << ".v_max=" << a.v_max << " }";
}

#define ASSERT_SPLINE_EQ(a, b) ASSERT_PRED2(splineEq, a, b)
static bool splineEq(const RadioCommand2025Spline &a, const RadioCommand2025Spline &b) {
    return stateEq(a.a_0, b.a_0, 1e-2, 5e-2)
        && stateEq(a.a_1, b.a_1, 1e-2, 15)
        && stateEq(a.a_2, b.a_2, 1e-1, 2)
        && stateEq(a.a_3, b.a_3, 1e-1, 5);
}

static std::ostream &operator<<(std::ostream &out, const RadioCommand2025Spline &a) {
    return out << "RadioCommand2025TrajectoryPath { "
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

TEST(RadioCommand2025, ReadWriteTrajectoryPath) {
    for (uint32_t i = 0; i < NUM_TEST_ITERATIONS; i++) {
        RNG rng{i + 123};
        RegularCommandPayload2025 cmd;

        RadioCommand2025TrajectoryPath written = randomTrajectoryPath(rng);
        write_trajectory_path(&written, &cmd);

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
        ASSERT_FALSE(read_spline(&readSpline, &cmd));
        ASSERT_TRUE(read_trajectory_path(&readTrajectoryPath, &cmd));
        ASSERT_TRAJECTORY_PATH_EQ(writtenTrajectoryPath, readTrajectoryPath);

        read_common(&readCommon, &cmd);
        ASSERT_COMMON_EQ(writtenCommon, readCommon);

        write_spline(&writtenSpline, &cmd);
        ASSERT_FALSE(read_trajectory_path(&readTrajectoryPath, &cmd));
        ASSERT_TRUE(read_spline(&readSpline, &cmd));
        ASSERT_SPLINE_EQ(writtenSpline, readSpline);

        read_common(&readCommon, &cmd);
        ASSERT_COMMON_EQ(writtenCommon, readCommon);
    }
}
