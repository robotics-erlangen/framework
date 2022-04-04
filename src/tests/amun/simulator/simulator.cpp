/***************************************************************************
 *   Copyright 2021 Tobias Heineken                                        *
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
#include "simulator/fastsimulator.h"
#include "simulator/simulator.h"
#include "core/timer.h"
#include "core/configuration.h"
#include "core/coordinates.h"
#include "protobuf/geometry.h"
#include "protobuf/command.h"
#include "protobuf/status.h"
#include "protobuf/ssl_wrapper.pb.h"
#include "visionlog/visionlogwriter.h"

#include <QObject>
#include <QQuaternion>
#include <algorithm>
#include <functional>
#include <cmath>

constexpr const float SHOOT_LINEAR_MAX = 8.0f;

class SimTester : public QObject {
    Q_OBJECT
public slots:
    void count() { m_counter++; }
    void handlePacket(const QByteArray &data, qint64 time, QString sender);
    void handleSimulatorTruthRaw(const QByteArray &data);

signals:
    void sendCommand(const Command& c);
    void sendSSLRadioCommand(const SSLSimRobotControl& control, bool isBlue, qint64 processingStart);

public:
    void openLog(const QString &filename);

    int m_counter = 0;
    VisionLogWriter m_logWriter;
    std::function<void(const SSL_WrapperPacket&, qint64)> handleDetectionWrapper = [](const SSL_WrapperPacket&, quint64) {};
    std::function<void(const world::SimulatorState&)> handleSimulatorTruth = [](const world::SimulatorState&) {};
};

void SimTester::handlePacket(const QByteArray &data, qint64 time, QString sender) {
    ASSERT_TRUE(sender == QString("simulator"));

    SSL_WrapperPacket wrapper;
    bool result = wrapper.ParseFromArray(data.data(), data.size());
    ASSERT_TRUE(result && "wrapper.ParseFromArray");

    m_logWriter.addVisionPacket(wrapper, time);

    handleDetectionWrapper(wrapper, time);
}

void SimTester::handleSimulatorTruthRaw(const QByteArray &data) {
    world::SimulatorState simState;
    bool result = simState.ParseFromArray(data.data(), data.size());
    ASSERT_TRUE(result && "simState.ParseFromArray");

    handleSimulatorTruth(simState);
}

void SimTester::openLog(const QString &filename) {
    m_logWriter.open(filename);
}

using namespace camun::simulator;

class FastSimulatorTest : public testing::Test {
public:
    FastSimulatorTest() : s(nullptr) {
        amun::SimulatorSetup defaultSimulatorSetup;
        loadConfiguration("cpptests/simulator-2020", &defaultSimulatorSetup, false);
        createSimulator(defaultSimulatorSetup);
    }

    ~FastSimulatorTest() {
        delete s;
    }

    void createSimulator(const amun::SimulatorSetup &setup) {
        delete s;
        s = new camun::simulator::Simulator{&t, setup, true};
        QObject::connect(&test, &SimTester::sendCommand, s, &Simulator::handleCommand);
        QObject::connect(&test, &SimTester::sendSSLRadioCommand, s, &Simulator::handleRadioCommands);
        t.setScaling(0);
        t.setTime(1234, 0);
        s->seedPRGN(14986);
        QObject::connect(s, &Simulator::sendRealData, &test, &SimTester::handleSimulatorTruthRaw);
        QObject::connect(s, &Simulator::gotPacket, &test, &SimTester::handlePacket);

        Command c{new amun::Command};
        c->mutable_simulator()->set_enable(true);
        emit test.sendCommand(c);
    }

    void loadRobots(int blue, int yellow) {
        Command c{new amun::Command};

        robot::Specs fourteen;
        fourteen.set_generation(0);
        fourteen.set_year(1970);
        fourteen.set_type(robot::Specs::Regular);
        fourteen.set_mass(1.5);
        fourteen.set_angle(0.98291);
        fourteen.set_v_max(3);
        fourteen.set_omega_max(6);
        fourteen.set_shot_linear_max(SHOOT_LINEAR_MAX);
        fourteen.set_shot_chip_max(3);
        fourteen.set_dribbler_width(0.07);
        fourteen.set_shoot_radius(0.067);
        fourteen.set_dribbler_height(0.04);

        auto* accel = fourteen.mutable_acceleration();
        accel->set_a_speedup_f_max(7);
        accel->set_a_speedup_s_max(6);
        accel->set_a_speedup_phi_max(60);
        accel->set_a_brake_f_max(7);
        accel->set_a_brake_s_max(6);
        accel->set_a_brake_phi_max(60);

        auto* str = fourteen.mutable_strategy();
        str->set_a_speedup_f_max(7);
        str->set_a_speedup_s_max(6);
        str->set_a_speedup_phi_max(60);
        str->set_a_brake_f_max(7);
        str->set_a_brake_s_max(6);
        str->set_a_brake_phi_max(60);

        auto* teamBlue = c->mutable_set_team_blue();
        auto* teamYellow = c->mutable_set_team_yellow();
        auto addTeam = [&fourteen] (auto* team, int num) {
            for (int i=0; i < num; ++i) {
                auto* robot = team->add_robot();
                robot->CopyFrom(fourteen);
                robot->set_id(i);
            }
        };
        addTeam(teamBlue, blue);
        addTeam(teamYellow, yellow);
        emit test.sendCommand(c);
    }

    SimTester test;
    Timer t;
    camun::simulator::Simulator* s;
};

class ShootTest : public FastSimulatorTest {
protected:
    ShootTest() : FastSimulatorTest() {
        loadRobots(0, 1);
    }

    /* Places the yellow 0 in the field center facing the blue goal. A ball is
     * placed at (0, 0.15) and slightly nudged towards the robot
     *
     * Coordinates are from the perspective of the yellow strategy (positive y
     * is toward the blue goal, distances are in [m])
     */
    void prepareShoot() {
        const Vector ROBOT_POS { 0, 0 };
        const Vector BALL_POS { 0, 0.15 };
        const Vector BALL_SPEED { 0, -0.4 };

        Command command { new amun::Command };

        // Enable kicker charge
        amun::CommandTransceiver* transceiver = command->mutable_transceiver();
        transceiver->set_enable(true); // For good measure, not sure if this is necessary
        transceiver->set_charge(true);

        sslsim::SimulatorControl* sim_control = command->mutable_simulator()->mutable_ssl_control();
        // Place the robot
        sslsim::TeleportRobot* teleport_robot = sim_control->add_teleport_robot();
        teleport_robot->mutable_id()->set_id(0);
        teleport_robot->mutable_id()->set_team(::gameController::Team::YELLOW);
        coordinates::toVision(ROBOT_POS, *teleport_robot);
        teleport_robot->set_orientation(0);

        // Place ball
        sslsim::TeleportBall* teleport_ball = sim_control->mutable_teleport_ball();
        coordinates::toVision(BALL_POS, *teleport_ball);
        teleport_ball->set_z(0);
        coordinates::toVisionVelocity(BALL_SPEED, *teleport_ball);
        teleport_ball->set_vz(0);

        emit test.sendCommand(command);
    }

    /* Creates a shoot command for the robot with id 0 */
    SSLSimRobotControl makeShootCommand(const float speed) {
        SSLSimRobotControl control { new sslsim::RobotControl };
        sslsim::RobotCommand* robot_command = control->add_robot_commands();
        robot_command->set_id(0);
        robot_command->set_kick_speed(speed);

        return control;
    }

    float measureMaxShootSpeed(const float expected_speed) {
        auto control = makeShootCommand(expected_speed);
        auto callback = [&control, this]() {
            emit test.sendSSLRadioCommand(control, false, 0);
        };
        float max_speed = 0.0f;
        test.handleSimulatorTruth = [&max_speed](const world::SimulatorState& truth) {
            if (!truth.has_ball()) {
                return;
            }
            const world::SimBall& ball = truth.ball();
            const Vector current_speed { ball.v_x(), ball.v_y() };
            max_speed = std::max(max_speed, current_speed.length());
        };
        FastSimulator::goDeltaCallback(s, &t, 1e9, callback); // Simulate 1s

        return max_speed;
    }
};

#include "simulator.moc"


TEST_F(FastSimulatorTest, VisionRate) {
    QObject::disconnect(s, &Simulator::sendRealData, &test, &SimTester::handleSimulatorTruthRaw);
    QObject::connect(s, &Simulator::gotPacket, &test, &SimTester::count);
    FastSimulator::goDelta(s, &t, 1e9); // one second
    const int exp_packets = 60 * 2; // 60 Hz * 2 cameras
    ASSERT_LE(test.m_counter, exp_packets * 1.2);
    ASSERT_GE(test.m_counter, exp_packets * 0.8);
}

TEST_F(FastSimulatorTest, OriginString) {
    QObject::disconnect(s, &Simulator::sendRealData, &test, &SimTester::handleSimulatorTruthRaw);
    FastSimulator::goDelta(s, &t, 5e8); // 500 millisecond
}

TEST_F(FastSimulatorTest, NoRobots) {
    QObject::disconnect(s, &Simulator::sendRealData, &test, &SimTester::handleSimulatorTruthRaw);
    // Initially, the whole world should be empy without robots and just a ball
    test.handleDetectionWrapper = [] (auto packet, auto) {
        if (!packet.has_detection()) {
            return;
        }
        auto det = packet.detection();
        ASSERT_EQ(det.robots_yellow_size(), 0);
        ASSERT_EQ(det.robots_blue_size(), 0);
    };
    FastSimulator::goDelta(s, &t, 5e8); // 500 millisecond
}

TEST_F(FastSimulatorTest, StationaryBall) {
    test.handleSimulatorTruth = [] (auto truth) {
        ASSERT_EQ(truth.blue_robots_size(), 0);
        ASSERT_EQ(truth.yellow_robots_size(), 0);
        ASSERT_TRUE(truth.has_ball());
        const auto& ball = truth.ball();
        ASSERT_EQ(ball.p_x(), 0.0);
        ASSERT_EQ(ball.p_y(), 0.0);
        ASSERT_FLOAT_EQ(ball.p_z(), 0.0215);
    };
    FastSimulator::goDelta(s, &t, 1e8); // 100 millisecond
}

TEST_F(FastSimulatorTest, LoadRobots) {
    loadRobots(2,5);
    test.handleSimulatorTruth = [] (auto truth) {
        ASSERT_EQ(truth.blue_robots_size(), 2);
        ASSERT_EQ(truth.yellow_robots_size(), 5);
        ASSERT_TRUE(truth.has_ball());
        const auto& ball = truth.ball();
        ASSERT_EQ(ball.p_x(), 0.0);
        ASSERT_EQ(ball.p_y(), 0.0);
        ASSERT_FLOAT_EQ(ball.p_z(), 0.0215);
    };
    FastSimulator::goDelta(s, &t, 1e8); // 100 millisecond
}

TEST_F(FastSimulatorTest, CBFrequency) {
    QObject::disconnect(s, &Simulator::sendRealData, &test, &SimTester::handleSimulatorTruthRaw);
    int counter = 0;
    auto lambda = [&counter]() {counter++;};
    FastSimulator::goDeltaCallback(s, &t, 10e9, lambda); // 10 seconds, should be run every 10 ms = 100 times + 1 time initially
    ASSERT_EQ(counter, 1001);
}

TEST_F(FastSimulatorTest, DriveRobotForwardBlue) {
    loadRobots(1, 0);
    float phi=0.f, x = 0.f, y = 0.f;
    QQuaternion rotation;
    bool init = false;
    test.handleSimulatorTruth = [&x, &y, &phi, &init, &rotation] (auto truth) {
        ASSERT_EQ(truth.blue_robots_size(), 1);
        for (const auto& robot : truth.blue_robots()) {
            QQuaternion q{robot.rotation().real(), robot.rotation().i(), robot.rotation().j(), robot.rotation().k()};
            QVector3D forwards{0, 1, 0};
            QVector3D rotated = q.rotatedVector(forwards);
            if (!init) {
                x = robot.p_x();
                y = robot.p_y();
                //stolen from fieldwidget
                phi = -atan2(rotated.x(), rotated.y());
                init = true;
                rotation = q;
            } else {
                ASSERT_LE(std::abs(robot.p_x() - x), 1e-2);
                ASSERT_LE(std::abs(robot.p_y() - y), 1e-2);
                ASSERT_LE(std::abs(-atan2(rotated.x(), rotated.y()) - phi), 5.f / 180 * M_PI);
            }

        }
    };
    FastSimulator::goDelta(s, &t, 1e9); // 1 second to get robot data and make sure it doesn't move on its own.

    SSLSimRobotControl control{new sslsim::RobotControl};

    auto* cmd = control->add_robot_commands();
    cmd->set_id(0);
    auto * localVel = cmd->mutable_move_command()->mutable_local_velocity();
    localVel->set_forward(-0.5);
    localVel->set_left(0);
    localVel->set_angular(0);

    auto callback = [&control, this]() {
        emit this->test.sendSSLRadioCommand(control, true, 0);
    };

    test.handleSimulatorTruth = [](auto) {};

    FastSimulator::goDeltaCallback(s, &t, 2e8, callback); // 200 milliseond to accelerate

    qint64 time = -1e7;
    init = false;
    auto callback2 = [&control, this, &time]() {
        time += 1e7;
        emit this->test.sendSSLRadioCommand(control, true, 0);
    };

    float ox, oy, oz;

    test.handleSimulatorTruth = [rotation, &time, &ox, &oy, &oz, &init](auto truth) {
        ASSERT_EQ(truth.blue_robots_size(), 1);
        for (const auto& robot : truth.blue_robots()) {
            QVector3D forwards{0, -0.5, 0};
            QVector3D rotated = rotation.rotatedVector(forwards);
            ASSERT_LE(std::abs(robot.v_x() - rotated.x()), 2e-2);
            ASSERT_LE(std::abs(robot.v_y() - rotated.y()), 2e-2);
            ASSERT_LE(std::abs(robot.v_z() - rotated.z()), 2e-2);
            if (!init) {
                ox = robot.p_x();
                oy = robot.p_y();
                oz = robot.p_z();
                init = true;
            } else {
                QVector3D distance{0, static_cast<float>(-0.5 * time / 1e9), 0};
                rotated = rotation.rotatedVector(distance);
                ASSERT_LE(std::abs(robot.p_x() - rotated.x() - ox), 5e-2);
                ASSERT_LE(std::abs(robot.p_y() - rotated.y() - oy), 5e-2);
                ASSERT_LE(std::abs(robot.p_z() - rotated.z() - oz), 5e-2);
            }
        }
    };

    FastSimulator::goDeltaCallback(s, &t, 18e8, callback2); // summa summarum 2 seconds
}

TEST_F(FastSimulatorTest, DriveRobotRightBlue) {
    loadRobots(1, 0);
    float phi=0.f, x = 0.f, y = 0.f;
    QQuaternion rotation;
    bool init = false;
    test.handleSimulatorTruth = [&x, &y, &phi, &init, &rotation] (auto truth) {
        ASSERT_EQ(truth.blue_robots_size(), 1);
        for (const auto& robot : truth.blue_robots()) {
            QQuaternion q{robot.rotation().real(), robot.rotation().i(), robot.rotation().j(), robot.rotation().k()};
            QVector3D forwards{0, 1, 0};
            QVector3D rotated = q.rotatedVector(forwards);
            if (!init) {
                x = robot.p_x();
                y = robot.p_y();
                //stolen from fieldwidget
                phi = -atan2(rotated.x(), rotated.y());
                init = true;
                rotation = q;
            } else {
                ASSERT_LE(std::abs(robot.p_x() - x), 1e-2);
                ASSERT_LE(std::abs(robot.p_y() - y), 1e-2);
                ASSERT_LE(std::abs(-atan2(rotated.x(), rotated.y()) - phi), 5.f / 180 * M_PI);
            }

        }
    };
    FastSimulator::goDelta(s, &t, 1e9); // 1 second to get robot data and make sure it doesn't move on its own.

    SSLSimRobotControl control{new sslsim::RobotControl};

    auto* cmd = control->add_robot_commands();
    cmd->set_id(0);
    auto * localVel = cmd->mutable_move_command()->mutable_local_velocity();
    localVel->set_forward(0);
    localVel->set_left(-0.5);
    localVel->set_angular(0);

    auto callback = [&control, this]() {
        emit this->test.sendSSLRadioCommand(control, true, 0);
    };

    test.handleSimulatorTruth = [](auto) {};

    FastSimulator::goDeltaCallback(s, &t, 2e8, callback); // 200 milliseond to accelerate

    qint64 time = -1e7;
    init = false;
    auto callback2 = [&control, this, &time]() {
        time += 1e7;
        emit this->test.sendSSLRadioCommand(control, true, 0);
    };

    float ox, oy, oz;

    test.handleSimulatorTruth = [rotation, &time, &ox, &oy, &oz, &init](auto truth) {
        ASSERT_EQ(truth.blue_robots_size(), 1);
        for (const auto& robot : truth.blue_robots()) {
            QVector3D right{0.5, 0, 0};
            QVector3D rotated = rotation.rotatedVector(right);
            ASSERT_LE(std::abs(robot.v_x() - rotated.x()), 2e-2);
            ASSERT_LE(std::abs(robot.v_y() - rotated.y()), 2e-2);
            ASSERT_LE(std::abs(robot.v_z() - rotated.z()), 2e-2);
            if (!init) {
                ox = robot.p_x();
                oy = robot.p_y();
                oz = robot.p_z();
                init = true;
            } else {
                QVector3D distance{static_cast<float>(0.5 * time / 1e9), 0, 0};
                rotated = rotation.rotatedVector(distance);
                ASSERT_LE(std::abs(robot.p_x() - rotated.x() - ox), 5e-2);
                ASSERT_LE(std::abs(robot.p_y() - rotated.y() - oy), 5e-2);
                ASSERT_LE(std::abs(robot.p_z() - rotated.z() - oz), 5e-2);
            }
        }
    };

    FastSimulator::goDeltaCallback(s, &t, 18e8, callback2); // summa summarum 2 seconds
}

TEST_F(FastSimulatorTest, DriveRobotForwardYellow) {
    loadRobots(0, 1);
    float phi=0.f, x = 0.f, y = 0.f;
    QQuaternion rotation;
    bool init = false;
    test.handleSimulatorTruth = [&x, &y, &phi, &init, &rotation] (auto truth) {
        ASSERT_EQ(truth.yellow_robots_size(), 1);
        for (const auto& robot : truth.yellow_robots()) {
            QQuaternion q{robot.rotation().real(), robot.rotation().i(), robot.rotation().j(), robot.rotation().k()};
            QVector3D forwards{0, 1, 0};
            QVector3D rotated = q.rotatedVector(forwards);
            if (!init) {
                x = robot.p_x();
                y = robot.p_y();
                //stolen from fieldwidget
                phi = -atan2(rotated.x(), rotated.y());
                init = true;
                rotation = q;
            } else {
                ASSERT_LE(std::abs(robot.p_x() - x), 1e-2);
                ASSERT_LE(std::abs(robot.p_y() - y), 1e-2);
                ASSERT_LE(std::abs(-atan2(rotated.x(), rotated.y()) - phi), 5.f / 180 * M_PI);
            }

        }
    };
    FastSimulator::goDelta(s, &t, 1e9); // 1 second to get robot data and make sure it doesn't move on its own.

    SSLSimRobotControl control{new sslsim::RobotControl};

    auto* cmd = control->add_robot_commands();
    cmd->set_id(0);
    auto * localVel = cmd->mutable_move_command()->mutable_local_velocity();
    localVel->set_forward(-0.5);
    localVel->set_left(0);
    localVel->set_angular(0);

    auto callback = [&control, this]() {
        emit this->test.sendSSLRadioCommand(control, false, 0);
    };

    test.handleSimulatorTruth = [](auto) {};

    FastSimulator::goDeltaCallback(s, &t, 2e8, callback); // 200 milliseond to accelerate

    qint64 time = -1e7;
    init = false;
    auto callback2 = [&control, this, &time]() {
        time += 1e7;
        emit this->test.sendSSLRadioCommand(control, false, 0);
    };

    float ox, oy, oz;

    test.handleSimulatorTruth = [rotation, &time, &ox, &oy, &oz, &init](auto truth) {
        ASSERT_EQ(truth.yellow_robots_size(), 1);
        for (const auto& robot : truth.yellow_robots()) {
            QVector3D forwards{0, -0.5, 0};
            QVector3D rotated = rotation.rotatedVector(forwards);
            ASSERT_LE(std::abs(robot.v_x() - rotated.x()), 2e-2);
            ASSERT_LE(std::abs(robot.v_y() - rotated.y()), 2e-2);
            ASSERT_LE(std::abs(robot.v_z() - rotated.z()), 2e-2);
            if (!init) {
                ox = robot.p_x();
                oy = robot.p_y();
                oz = robot.p_z();
                init = true;
            } else {
                QVector3D distance{0, static_cast<float>(-0.5 * time / 1e9), 0};
                rotated = rotation.rotatedVector(distance);
                ASSERT_LE(std::abs(robot.p_x() - rotated.x() - ox), 5e-2);
                ASSERT_LE(std::abs(robot.p_y() - rotated.y() - oy), 5e-2);
                ASSERT_LE(std::abs(robot.p_z() - rotated.z() - oz), 5e-2);
            }
        }
    };

    FastSimulator::goDeltaCallback(s, &t, 18e8, callback2); // summa summarum 2 seconds
}

TEST_F(FastSimulatorTest, DriveRobotLeftYellow) {
    loadRobots(0, 1);
    float phi=0.f, x = 0.f, y = 0.f;
    QQuaternion rotation;
    bool init = false;
    test.handleSimulatorTruth = [&x, &y, &phi, &init, &rotation] (auto truth) {
        ASSERT_EQ(truth.yellow_robots_size(), 1);
        for (const auto& robot : truth.yellow_robots()) {
            QQuaternion q{robot.rotation().real(), robot.rotation().i(), robot.rotation().j(), robot.rotation().k()};
            QVector3D forwards{0, 1, 0};
            QVector3D rotated = q.rotatedVector(forwards);
            if (!init) {
                x = robot.p_x();
                y = robot.p_y();
                //stolen from fieldwidget
                phi = -atan2(rotated.x(), rotated.y());
                init = true;
                rotation = q;
            } else {
                ASSERT_LE(std::abs(robot.p_x() - x), 1e-2);
                ASSERT_LE(std::abs(robot.p_y() - y), 1e-2);
                ASSERT_LE(std::abs(-atan2(rotated.x(), rotated.y()) - phi), 5.f / 180 * M_PI);
            }

        }
    };
    FastSimulator::goDelta(s, &t, 1e9); // 1 second to get robot data and make sure it doesn't move on its own.

    SSLSimRobotControl control{new sslsim::RobotControl};

    auto* cmd = control->add_robot_commands();
    cmd->set_id(0);
    auto * localVel = cmd->mutable_move_command()->mutable_local_velocity();
    localVel->set_forward(0);
    localVel->set_left(0.5);
    localVel->set_angular(0);

    auto callback = [&control, this]() {
        emit this->test.sendSSLRadioCommand(control, false, 0);
    };

    test.handleSimulatorTruth = [](auto) {};

    FastSimulator::goDeltaCallback(s, &t, 2e8, callback); // 200 milliseond to accelerate

    qint64 time = -1e7;
    init = false;
    auto callback2 = [&control, this, &time]() {
        time += 1e7;
        emit this->test.sendSSLRadioCommand(control, false, 0);
    };

    float ox, oy, oz;

    test.handleSimulatorTruth = [rotation, &time, &ox, &oy, &oz, &init](auto truth) {
        ASSERT_EQ(truth.yellow_robots_size(), 1);
        for (const auto& robot : truth.yellow_robots()) {
            QVector3D left{-0.5, 0, 0};
            QVector3D rotated = rotation.rotatedVector(left);
            ASSERT_LE(std::abs(robot.v_x() - rotated.x()), 2e-2);
            ASSERT_LE(std::abs(robot.v_y() - rotated.y()), 2e-2);
            ASSERT_LE(std::abs(robot.v_z() - rotated.z()), 2e-2);
            if (!init) {
                ox = robot.p_x();
                oy = robot.p_y();
                oz = robot.p_z();
                init = true;
            } else {
                QVector3D distance{static_cast<float>(-0.5 * time / 1e9), 0, 0};
                rotated = rotation.rotatedVector(distance);
                ASSERT_LE(std::abs(robot.p_x() - rotated.x() - ox), 5e-2);
                ASSERT_LE(std::abs(robot.p_y() - rotated.y() - oy), 5e-2);
                ASSERT_LE(std::abs(robot.p_z() - rotated.z() - oz), 5e-2);
            }
        }
    };

    FastSimulator::goDeltaCallback(s, &t, 18e8, callback2); // summa summarum 2 seconds
}

TEST_F(FastSimulatorTest, UnaffectedRobotsByCommands) {
    loadRobots(2, 1);
    float phi[2], x[2], y[2]; // 0 blue, 1 yellow
    bool init = false;
    test.handleSimulatorTruth = [&x, &y, &phi, &init] (auto truth) {
        ASSERT_EQ(truth.blue_robots_size(), 2);
        int i = -2;
        auto checkRobot = [&i, init, &x, &y, &phi](const auto& robot) {
            QQuaternion q{robot.rotation().real(), robot.rotation().i(), robot.rotation().j(), robot.rotation().k()};
            QVector3D forwards{0, 1, 0};
            QVector3D rotated = q.rotatedVector(forwards);
            if (!init) {
                x[i] = robot.p_x();
                y[i] = robot.p_y();
                //stolen from fieldwidget
                phi[i] = -atan2(rotated.x(), rotated.y());
            } else {
                ASSERT_LE(std::abs(robot.p_x() - x[i]), 1e-2);
                ASSERT_LE(std::abs(robot.p_y() - y[i]), 1e-2);
                ASSERT_LE(std::abs(-atan2(rotated.x(), rotated.y()) - phi[i]), 5.f / 180 * M_PI);
            }
        };
        for (const auto& robot : truth.blue_robots()) {
            ++i;
            if (robot.id() == 0) continue;
            checkRobot(robot);
        }
        ASSERT_EQ(truth.yellow_robots_size(), 1);
        for(const auto& robot : truth.yellow_robots()) {
            ++i;
            checkRobot(robot);
        }
        init = true;
    };

    SSLSimRobotControl control{new sslsim::RobotControl};
    auto* cmd = control->add_robot_commands();
    cmd->set_id(0);
    auto * localVel = cmd->mutable_move_command()->mutable_local_velocity();
    localVel->set_forward(-0.5);
    localVel->set_left(0);
    localVel->set_angular(0);

    auto callback = [&control, this]() {
        emit this->test.sendSSLRadioCommand(control, true, 0);
    };


    FastSimulator::goDeltaCallback(s, &t, 2e9, callback); // 2 seconds
}

TEST_F(FastSimulatorTest, TeleportRobot) {
    loadRobots(1, 0);

    const Vector desiredPos(2, 3);

    Command command(new amun::Command);
    auto teleport = command->mutable_simulator()->mutable_ssl_control()->add_teleport_robot();
    teleport->mutable_id()->set_id(0);
    teleport->mutable_id()->set_team(gameController::Team::BLUE);
    coordinates::toVision(desiredPos, *teleport);
    teleport->set_v_x(0);
    teleport->set_v_y(0);
    teleport->set_v_angular(0);
    teleport->set_orientation(0);

    emit this->test.sendCommand(command);

    FastSimulator::goDelta(s, &t, 5e7);

    test.handleSimulatorTruth = [&desiredPos] (auto truth) {
        ASSERT_EQ(truth.blue_robots_size(), 1);
        auto robot = truth.blue_robots(0);
        Vector truePos(robot.p_x(), robot.p_y());
        ASSERT_LE(desiredPos.distance(truePos), 0.01f);
        ASSERT_LE(Vector(robot.v_x(), robot.v_y()).length(), 0.01f);
    };
    FastSimulator::goDelta(s, &t, 1e8); // 100 millisecond
}

TEST_F(FastSimulatorTest, TeleportRobotPosOnly) {
    loadRobots(1, 0);

    const Vector desiredPos(2, 3);

    Command command(new amun::Command);
    auto teleport = command->mutable_simulator()->mutable_ssl_control()->add_teleport_robot();
    teleport->mutable_id()->set_id(0);
    teleport->mutable_id()->set_team(gameController::Team::BLUE);
    coordinates::toVision(desiredPos, *teleport);
    teleport->set_orientation(0);

    emit this->test.sendCommand(command);

    FastSimulator::goDelta(s, &t, 5e7);

    test.handleSimulatorTruth = [&desiredPos] (auto truth) {
        ASSERT_EQ(truth.blue_robots_size(), 1);
        auto robot = truth.blue_robots(0);
        Vector truePos(robot.p_x(), robot.p_y());
        ASSERT_LE(desiredPos.distance(truePos), 0.01f);
    };
    FastSimulator::goDelta(s, &t, 1e8); // 100 millisecond
}

TEST_F(FastSimulatorTest, TeleportRobotAfterMove) {
    loadRobots(1, 0);

    FastSimulator::goDelta(s, &t, 2.5e7);

    const Vector desiredPos(-2, -2);

    Command teleportCommand(new amun::Command);
    auto teleport = teleportCommand->mutable_simulator()->mutable_ssl_control()->add_teleport_robot();
    teleport->mutable_id()->set_id(0);
    teleport->mutable_id()->set_team(gameController::Team::BLUE);
    coordinates::toVision(desiredPos, *teleport);
    teleport->set_v_x(0);
    teleport->set_v_y(0);
    teleport->set_v_angular(0);
    teleport->set_orientation(0);

    emit this->test.sendCommand(teleportCommand);
    FastSimulator::goDelta(s, &t, 2e9);


    const Vector pushPos(-1.6, -1.6);
    Command pushCommand(new amun::Command);
    auto push = pushCommand->mutable_simulator()->mutable_ssl_control()->add_teleport_robot();
    push->mutable_id()->set_id(0);
    push->mutable_id()->set_team(gameController::Team::BLUE);
    coordinates::toVision(pushPos, *push);
    push->set_v_x(0);
    push->set_v_y(0);
    push->set_v_angular(0);
    push->set_orientation(0);
    push->set_by_force(true);

    emit this->test.sendCommand(pushCommand);
    FastSimulator::goDelta(s, &t, 2e7);


    // send same teleport command as above again
    emit this->test.sendCommand(teleportCommand);

    test.handleSimulatorTruth = [&desiredPos] (auto truth) {
        ASSERT_EQ(truth.blue_robots_size(), 1);
        auto robot = truth.blue_robots(0);
        Vector truePos(robot.p_x(), robot.p_y());
        ASSERT_LE(desiredPos.distance(truePos), 0.01f);
        ASSERT_LE(Vector(robot.v_x(), robot.v_y()).length(), 0.01f);
    };
    FastSimulator::goDelta(s, &t, 1e8); // 100 millisecond
}

TEST_F(FastSimulatorTest, GeometryReflection) {
    amun::SimulatorSetup setup;
    setup.add_camera_setup()->CopyFrom(createDefaultCamera(2, 5, 3.3, 5));
    geometrySetDefault(setup.mutable_geometry(), true);
    createSimulator(setup);

    QObject::disconnect(s, &Simulator::sendRealData, &test, &SimTester::handleSimulatorTruthRaw);
    int runCount = 0;
    test.handleDetectionWrapper = [&setup, &runCount] (auto wrapper, auto) {
        if (!wrapper.has_geometry()) {
            return;
        }
        runCount++;

        amun::SimulatorSetup reproduced;
        for (auto camera : wrapper.geometry().calib()) {
            reproduced.add_camera_setup()->CopyFrom(camera);
        }
        convertFromSSlGeometry(wrapper.geometry().field(), *reproduced.mutable_geometry());

        ASSERT_EQ(setup.SerializeAsString(), reproduced.SerializeAsString());
    };
    FastSimulator::goDelta(s, &t, 5e7); // 100 millisecond
    // make sure the geometry arrived at least once
    ASSERT_GT(runCount, 0);
}

TEST_F(FastSimulatorTest, InvisibleBall) {

    const Vector cameraPos{2, 2};
    const Vector robotPos{2, 5};
    const Vector ballPos{2, 5.1};
    const Vector ballPosVisible{2, 4.5};

    // create controlled camera setup (before changing anything else)
    {
        amun::SimulatorSetup setup;
        setup.add_camera_setup()->CopyFrom(createDefaultCamera(2, cameraPos.x, cameraPos.y, 5));
        geometrySetDefault(setup.mutable_geometry(), true); // the exact field size does not matter
        createSimulator(setup);
    }

    loadRobots(1, 0);

    {
        Command command(new amun::Command);

        auto teleportRobot = command->mutable_simulator()->mutable_ssl_control()->add_teleport_robot();
        teleportRobot->mutable_id()->set_id(0);
        teleportRobot->mutable_id()->set_team(gameController::Team::BLUE);
        coordinates::toVision(robotPos, *teleportRobot);
        teleportRobot->set_v_x(0);
        teleportRobot->set_v_y(0);
        teleportRobot->set_v_angular(0);
        teleportRobot->set_orientation(0);

        auto teleportBall = command->mutable_simulator()->mutable_ssl_control()->mutable_teleport_ball();
        coordinates::toVision(ballPos, *teleportBall);
        teleportBall->set_vx(0);
        teleportBall->set_vy(0);

        // simulator realism settings
        auto realism = command->mutable_simulator()->mutable_realism_config();
        loadConfiguration("cpptests/realism-none", realism, false);
        realism->set_ball_visibility_threshold(0.4);
        realism->set_enable_invisible_ball(true);

        emit this->test.sendCommand(command);
    }

    FastSimulator::goDelta(s, &t, 1e8);

    QObject::disconnect(s, &Simulator::sendRealData, &test, &SimTester::handleSimulatorTruthRaw);
    test.handleDetectionWrapper = [] (auto wrapper, auto) {
        if (!wrapper.has_detection()) {
            return;
        }
        ASSERT_EQ(wrapper.detection().balls_size(), 0);
    };
    FastSimulator::goDelta(s, &t, 1e8); // 100 millisecond

    // to make sure everything works, check if the ball is visible at another position
    {
        Command command(new amun::Command);
        auto teleportBall = command->mutable_simulator()->mutable_ssl_control()->mutable_teleport_ball();
        coordinates::toVision(ballPosVisible, *teleportBall);
        teleportBall->set_vx(0);
        teleportBall->set_vy(0);
        emit this->test.sendCommand(command);
    }
    test.handleDetectionWrapper = [] (auto wrapper, auto) {
        if (!wrapper.has_detection()) {
            return;
        }
        ASSERT_EQ(wrapper.detection().balls_size(), 1);
    };
    FastSimulator::goDelta(s, &t, 1e8); // 100 millisecond
}

TEST_F(FastSimulatorTest, CameraOverlap) {
    amun::SimulatorSetup setup;
    setup.add_camera_setup()->CopyFrom(createDefaultCamera(0, 3, 3, 5));
    setup.add_camera_setup()->CopyFrom(createDefaultCamera(1, -3, 3, 5));
    setup.add_camera_setup()->CopyFrom(createDefaultCamera(2, 3, -3, 5));
    setup.add_camera_setup()->CopyFrom(createDefaultCamera(3, -3, -3, 5));
    geometrySetDefault(setup.mutable_geometry(), true);
    createSimulator(setup);

    Command command(new amun::Command);
    auto realism = command->mutable_simulator()->mutable_realism_config();
    loadConfiguration("cpptests/realism-none", realism, false);
    realism->set_camera_overlap(0.5f);

    emit this->test.sendCommand(command);

    QObject::disconnect(s, &Simulator::sendRealData, &test, &SimTester::handleSimulatorTruthRaw);

    auto checkCameras = [this](Vector ballPos, std::set<int> expectedIds) {
        Command command(new amun::Command);
        auto teleportBall = command->mutable_simulator()->mutable_ssl_control()->mutable_teleport_ball();
        coordinates::toVision(ballPos, *teleportBall);
        teleportBall->set_vx(0);
        teleportBall->set_vy(0);
        emit this->test.sendCommand(command);

        this->test.handleDetectionWrapper = [](auto, auto){};
        FastSimulator::goDelta(s, &t, 3e7);

        std::set<int> foundCameras;
        this->test.handleDetectionWrapper = [&foundCameras] (auto wrapper, auto) {
            if (wrapper.has_detection() && wrapper.detection().balls_size() > 0) {
                foundCameras.insert(wrapper.detection().camera_id());
            }
        };

        FastSimulator::goDelta(s, &t, 5e7);

        ASSERT_EQ(expectedIds, foundCameras);
    };

    checkCameras(Vector(3, 3), {0});
    checkCameras(Vector(-3, 3), {1});
    checkCameras(Vector(3, -3), {2});
    checkCameras(Vector(-3, -3), {3});

    checkCameras(Vector(30, 30), {0});
    checkCameras(Vector(-30, 30), {1});
    checkCameras(Vector(30, -30), {2});
    checkCameras(Vector(-30, -30), {3});

    checkCameras(Vector(0.6, 0.6), {0});
    checkCameras(Vector(-0.6, 0.6), {1});
    checkCameras(Vector(0.6, -0.6), {2});
    checkCameras(Vector(-0.6, -0.6), {3});

    checkCameras(Vector(0, 0), {0, 1, 2, 3});

    checkCameras(Vector(2, 0), {0, 2});
    checkCameras(Vector(2, 0.51), {0});
    checkCameras(Vector(2, 0.49), {0, 2});
    checkCameras(Vector(2, -0.51), {2});
    checkCameras(Vector(2, -0.49), {0, 2});
}

TEST_F(ShootTest, ShootSpeed) {
    for (const float expected_speed : { 2.0f, 4.0f, 6.0f, 8.0f }) {
        prepareShoot();
        const float max_speed = measureMaxShootSpeed(expected_speed);
        const float speed_diff = std::abs(expected_speed - max_speed);
        EXPECT_LT(speed_diff, 0.10f);
    }
}

TEST_F(ShootTest, ShootSpeedCapped) {
    prepareShoot();
    const float max_speed = measureMaxShootSpeed(SHOOT_LINEAR_MAX + 5.0f);
    EXPECT_LT(max_speed, SHOOT_LINEAR_MAX + 0.1f);
}
