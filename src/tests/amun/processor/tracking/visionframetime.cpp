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

#include "tracking/visionframetime.h"

#include "gtest/gtest.h"
#include "protobuf/ssl_detection.pb.h"
#include <QtGlobal>
#include <chrono>

using namespace std::chrono;
using namespace std::chrono_literals;

static SSL_DetectionFrame createDetectionFrame(quint32 frame_number, nanoseconds t_capture_camera, int camera_id = 0)
{
    SSL_DetectionFrame detectionFrame;

    detectionFrame.set_frame_number(frame_number);
    // Just set any t_capture and t_sent value
    detectionFrame.set_t_capture(0);
    detectionFrame.set_t_sent(0);

    detectionFrame.set_t_capture_camera(duration_cast<duration<double>>(t_capture_camera).count());

    detectionFrame.set_camera_id(camera_id);

    return detectionFrame;
}

TEST(VisionFrameTime, createDetectionFrame) {
    auto frame = createDetectionFrame(1, 17s + 123ms + 456us + 789ns);

    EXPECT_EQ(frame.frame_number(), 1);
    EXPECT_EQ(frame.t_capture(), 0);
    EXPECT_EQ(frame.t_sent(), 0);
    ASSERT_TRUE(frame.has_t_capture_camera());
    EXPECT_EQ(frame.t_capture_camera(), 17.123456789);
    EXPECT_EQ(frame.camera_id(), 0);
}

TEST(VisionFrameTime, SimpleUpdate) {
    VisionFrameTime estimator;

    const nanoseconds START_TIME = 20s;

    estimator.update(createDetectionFrame(1, START_TIME));
    estimator.update(createDetectionFrame(2, START_TIME + 14300us));
    EXPECT_EQ(estimator.get(0), 14300us);
    estimator.update(createDetectionFrame(2, START_TIME + 14300us + 14500us));
    EXPECT_EQ(estimator.get(0), 14500us);
}

TEST(VisionFrameTime, UpdateFromThePast) {
    VisionFrameTime estimator;

    const nanoseconds START_TIME = 20s;

    estimator.update(createDetectionFrame(1, START_TIME));
    estimator.update(createDetectionFrame(2, START_TIME + 14300us));
    EXPECT_EQ(estimator.get(0), 14300us);

    // Packet from the past
    estimator.update(createDetectionFrame(4, START_TIME));
    EXPECT_EQ(estimator.get(0), 14300us);
}

TEST(VisionFrameTime, ImprobableUpdate) {
    VisionFrameTime estimator;

    const nanoseconds START_TIME = 20s;

    estimator.update(createDetectionFrame(1, START_TIME));
    estimator.update(createDetectionFrame(2, START_TIME + 14300us));
    EXPECT_EQ(estimator.get(0), 14300us);

    // Packet with a large delta probably means a packet loss. We should ignore
    // it, as the frame time is pretty constant normally.
    estimator.update(createDetectionFrame(4, START_TIME + 1s));
    EXPECT_EQ(estimator.get(0), 14300us);
}
