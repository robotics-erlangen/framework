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

#include "tracking/worldparameters.h"

#include "gtest/gtest.h"
#include "protobuf/command.h"
#include "protobuf/debug.pb.h"
#include "protobuf/geometry.h"

#include <QObject>
#include <cstdint>
#include <google/protobuf/util/message_differencer.h>

namespace {
WorldParameters instance() {
    return WorldParameters { true, true };
}

amun::DebugValues emptyDebugValues() {
    amun::DebugValues debug;
    debug.set_source(amun::DebugSource::Tracking);
    EXPECT_TRUE(debug.IsInitialized());
    return debug;
}

SSL_GeometryData defaultGeometry() {
    world::Geometry worldGeometry;
    geometrySetDefault(&worldGeometry);

    SSL_GeometryData sslGeometry;
    convertToSSlGeometry(worldGeometry, sslGeometry.mutable_field());

    EXPECT_TRUE(sslGeometry.IsInitialized());
    return sslGeometry;
}

SSL_GeometryCameraCalibration someCameraCalibration(uint32_t cameraId) {
    SSL_GeometryCameraCalibration calib;

    calib.set_camera_id(cameraId);
    calib.set_camera_id(0);
    calib.set_focal_length(1.0f);
    calib.set_principal_point_x(2.0f);
    calib.set_principal_point_y(3.0f);
    calib.set_distortion(4.0f);
    calib.set_q0(5.0f);
    calib.set_q1(6.0f);
    calib.set_q2(7.0f);
    calib.set_q3(8.0f);
    calib.set_tx(9.0f);
    calib.set_ty(10.0f);
    calib.set_tz(11.0f);

    EXPECT_TRUE(calib.IsInitialized());
    return calib;
}
}

TEST(WorldParameters, CheckEmptyThenNot) {
    WorldParameters wp = instance();

    // Simulate the end of the last frame
    wp.clearDebugData();
    wp.finishProcessing();

    // We received nothing, so geometry and errors should be empty
    EXPECT_FALSE(wp.getGeometryUpdate().has_value());

    auto debugValues = emptyDebugValues();

    wp.injectDebugValues(42, &debugValues);
    EXPECT_EQ(debugValues.value_size(), 0);
    EXPECT_EQ(debugValues.visualization_size(), 0);
    EXPECT_EQ(debugValues.log_size(), 0);
    EXPECT_EQ(debugValues.plot_size(), 0);
    EXPECT_EQ(debugValues.robot_size(), 0);
    EXPECT_FALSE(debugValues.has_debugger_output());

    // End of frame
    wp.clearDebugData();
    wp.finishProcessing();

    // Now we receive a geometry update
    SSL_GeometryData geometry = defaultGeometry();
    wp.handleVisionGeometry(geometry, "192.168.178.1");

    EXPECT_TRUE(wp.getGeometryUpdate().has_value());
    // Even if called multiple times in a frame
    EXPECT_TRUE(wp.getGeometryUpdate().has_value());

    // End of frame
    wp.clearDebugData();
    wp.finishProcessing();

    EXPECT_FALSE(wp.getGeometryUpdate().has_value());
}

TEST(WorldParameters, MultipleCameraSendersWarning) {
    WorldParameters wp = instance();

    auto debugValuesBefore = emptyDebugValues();
    wp.injectDebugValues(42, &debugValuesBefore);
    EXPECT_EQ(debugValuesBefore.log_size(), 0);

    SSL_GeometryData geometry = defaultGeometry();
    geometry.add_calib()->CopyFrom(someCameraCalibration(0));

    wp.handleVisionGeometry(geometry, "192.168.178.1");
    wp.handleVisionGeometry(geometry, "172.16.0.1");

    auto debugValuesAfter = emptyDebugValues();
    wp.injectDebugValues(42, &debugValuesAfter);
    // Explictly check the warning is added to the log since this is what we
    // are most likely to notice in the UI
    EXPECT_GT(debugValuesAfter.log_size(), 0);
}

TEST(WorldParameters, CameraUpdatedSignaled) {
    const QString SENDER { "192.168.179.1" };

    WorldParameters wp = instance();

    SSL_GeometryData geometry = defaultGeometry();
    geometry.add_calib()->CopyFrom(someCameraCalibration(0));

    bool signalReceived = false;
    QObject::connect(
        &wp, &WorldParameters::cameraUpdated,
        [&signalReceived, &SENDER](const SSL_GeometryCameraCalibration& c, const QString& sender) {
            signalReceived = true;

            EXPECT_EQ(c.camera_id(), 0);
            EXPECT_EQ(sender, SENDER);
        }
    );

    wp.handleVisionGeometry(geometry, SENDER);
    EXPECT_TRUE(signalReceived);
}

TEST(WorldParameters, BallModelUpdatedSignaled) {
    WorldParameters wp = instance();

    int receivedCount = 0;
    QObject::connect(
        &wp, &WorldParameters::ballModelUpdated, [&receivedCount](const world::BallModel&) { receivedCount++; }
    );

    // Setting the model triggers the signal
    {
        amun::CommandTracking command;
        command.mutable_ball_model()->set_z_damping(1);
        command.mutable_ball_model()->set_xy_damping(1);

        wp.handleCommand(command, true);

        EXPECT_EQ(receivedCount, 1);
    }

    // Toggling the simulator triggers the signal, as we use a different model
    {
        amun::CommandTracking empty;
        wp.handleCommand(empty, false);
        EXPECT_EQ(receivedCount, 2);
        wp.handleCommand(empty, true);
        EXPECT_EQ(receivedCount, 3);
    }
}

TEST(WorldParameters, VirtualFieldToggle) {
    WorldParameters wp = instance();
    wp.finishProcessing();
    EXPECT_FALSE(wp.getGeometryUpdate().has_value());

    amun::CommandTracking command;
    command.set_enable_virtual_field(true);
    geometrySetDefault(command.mutable_virtual_geometry());
    wp.handleCommand(command, true);

    auto geometryUpdate = wp.getGeometryUpdate();
    // Clear the ball model since we did not set it in the command - the
    // comparison would fail
    geometryUpdate->clear_ball_model();

    ASSERT_TRUE(geometryUpdate.has_value());
    EXPECT_TRUE(google::protobuf::util::MessageDifferencer::Equals(*geometryUpdate, command.virtual_geometry()));
    wp.finishProcessing();
    EXPECT_FALSE(wp.getGeometryUpdate().has_value());

    command.set_enable_virtual_field(false);
    command.clear_virtual_geometry();
    wp.handleCommand(command, true);

    EXPECT_TRUE(wp.getGeometryUpdate().has_value());
}
