/***************************************************************************
 *   Copyright 2025 Paul Bergmann                                          *
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

#include "tracking/visionprocessingtime.h"

#include "core/timeconversion.h"
#include "gtest/gtest.h"
#include "protobuf/ssl_detection.pb.h"
#include <chrono>

using namespace std::chrono;
using namespace std::chrono_literals;

static SSL_DetectionFrame createDetectionFrame()
{
    SSL_DetectionFrame detectionFrame;

    detectionFrame.set_frame_number(0);
    detectionFrame.set_camera_id(0);

    return detectionFrame;
}

TEST(VisionProcessingTime, NormalGet) {
    auto frame = createDetectionFrame();
    VisionProcessingTime calculator;

    frame.set_t_capture(toVisionTime(5ms));
    frame.set_t_sent(toVisionTime(5ms + 10ms + 237us));

    const auto [t, msg] = calculator.get(frame, 0);
    EXPECT_EQ(t, 10ms + 237us);
    EXPECT_TRUE(msg == nullptr);
}

TEST(VisionProcessingTime, SlowFrames) {
    VisionProcessingTime calculator;

    auto frame = createDetectionFrame();
    frame.set_t_capture(toVisionTime(5ms));
    frame.set_t_sent(toVisionTime(5ms + 50ms));

    bool anyWarning = false;
    for (nanoseconds time = 0ns; time < 5s; time += 10ms) {
        const auto [_, msg] = calculator.get(frame, time.count());
        anyWarning |= msg != nullptr;
    }

    EXPECT_TRUE(anyWarning);
}
