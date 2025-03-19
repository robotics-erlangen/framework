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

#include "core/percamera.h"

#include "gtest/gtest.h"
#include "protobuf/ssl_vision/ssl_detection.pb.h"
#include <QtGlobal>
#include <cstdint>

struct WithConstructor {
    int x = 5;
};

TEST(PerCamera, At) {
    PerCamera<WithConstructor> perCamera;

    for (uint32_t i = 0; i < PerCamera<WithConstructor>::MAX_CAMERAS; i++) {
        EXPECT_EQ(perCamera.at(i).x, 5);
    }

    perCamera.at(0).x = 10;
    EXPECT_EQ(perCamera.at(0).x, 10);
}

TEST(PerCamera, OperatorInt) {
    PerCamera<WithConstructor> perCamera;

    for (uint32_t i = 0; i < PerCamera<WithConstructor>::MAX_CAMERAS; i++) {
        EXPECT_EQ(perCamera[i].x, 5);
    }

    perCamera[0].x = 10;
    EXPECT_EQ(perCamera[0].x, 10);
}

static SSL_DetectionFrame detectionFrame(uint32_t camera_id) {
    SSL_DetectionFrame frame;
    frame.set_camera_id(camera_id);
    return frame;
}

TEST(PerCamera, OperatorDetectionFrame) {
    PerCamera<WithConstructor> perCamera;

    for (uint32_t i = 0; i < PerCamera<WithConstructor>::MAX_CAMERAS; i++) {
        EXPECT_EQ(perCamera[detectionFrame(i)].x, 5);
    }

    perCamera[detectionFrame(0)].x = 10;
    EXPECT_EQ(perCamera[detectionFrame(0)].x, 10);
}
