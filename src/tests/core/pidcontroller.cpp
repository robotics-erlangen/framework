/***************************************************************************
 *   Copyright 2026 Christoph Schmidtmeier                                 *
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
#include <vector>

#include "core/pidcontroller.h"
#include "core/vector.h"
#include "util.h"

template<typename T>
struct Update {
    T error;
    float timeDiff;

    float apply_to(PIDController<T> &pid) const {
        return pid.update(error, timeDiff);
    }
};

TEST(PIDController, testP) {
    const float timeDiff = 0.1;
    const int numIter = 300;

    PIDController<float> pid{0.8, 0, 0};
    float state = 0;
    float target = 0;

    for (int i = 0; i < numIter; i++) {
        state += pid.update(target - state, timeDiff) * timeDiff;
    }
    target = 1;
    for (int i = 0; i < numIter; i++) {
        state += pid.update(target - state, timeDiff) * timeDiff;
    }
    for (int i = 0; i < numIter; i++) {
        ASSERT_APPROX_EQ(state, target, 1e-3, 1e-3);
        state += pid.update(target - state, timeDiff) * timeDiff;
    }
}

TEST(PIDController, testPI) {
    const float timeDiff = 0.1;
    const int numIter = 300;

    PIDController<float> pid{0.4, 1.2, 0};
    float state = 0;
    float target = 0;

    for (int i = 0; i < numIter; i++) {
        state += pid.update(target - state, timeDiff) * timeDiff;
    }
    target = 1;
    for (int i = 0; i < numIter; i++) {
        state += pid.update(target - state, timeDiff) * timeDiff;
    }
    for (int i = 0; i < numIter; i++) {
        ASSERT_APPROX_EQ(state, target, 1e-3, 1e-3);
        state += pid.update(target - state, timeDiff) * timeDiff;
    }
}

TEST(PIDController, testPID) {
    const float timeDiff = 0.1;
    const int numIter = 300;

    PIDController<float> pid{0.6, 1.2, 0.1};
    float state = 0;
    float target = 0;

    for (int i = 0; i < numIter; i++) {
        state += pid.update(target - state, timeDiff) * timeDiff;
    }
    target = 1;
    for (int i = 0; i < numIter; i++) {
        state += pid.update(target - state, timeDiff) * timeDiff;
    }
    for (int i = 0; i < numIter; i++) {
        ASSERT_APPROX_EQ(state, target, 1e-3, 1e-3);
        state += pid.update(target - state, timeDiff) * timeDiff;
    }
}

TEST(PIDController, reset) {
    PIDController<float> pid1{0.5, 1, 0.1};
    PIDController<float> pid2{0.5, 1, 0.1};

    pid1.update(1, 0.01);
    pid1.update(2, 0.01);
    pid1.update(1, 0.01);
    pid1.reset();

    const std::vector<Update<float>> updates{{
        {0.1, 0.01},
        {0.2, 0.01},
        {0.1, 0.01},
        {0.1, 0.01},
        {0.0, 0.01},
        {0.1, 0.01},
        {0.1, 0.01},
        {0.2, 0.01},
        {0.3, 0.01},
        {0.3, 0.01},
        {0.3, 0.01},
    }};

    for (const Update<float> &update : updates) {
        ASSERT_APPROX_EQ(update.apply_to(pid1), update.apply_to(pid2), 1e-6, 1e-6);
    }
}

TEST(PIDController, vectorAsState) {
    const float timeDiff = 0.1;
    const int numIter = 300;

    PIDController<Vector> pid{0.6, 1.2, 0.1};
    Vector state{0, 0};
    Vector target{0, 1};

    for (int i = 0; i < numIter; i++) {
        state += pid.update(target - state, timeDiff) * timeDiff;
    }
    target = {1, 1};
    for (int i = 0; i < numIter; i++) {
        state += pid.update(target - state, timeDiff) * timeDiff;
    }
    for (int i = 0; i < numIter; i++) {
        ASSERT_VECTOR_APPROX_EQ(state, target, 1e-3, 1e-3);
        state += pid.update(target - state, timeDiff) * timeDiff;
    }
}

