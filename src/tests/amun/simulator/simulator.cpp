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
#include "protobuf/geometry.h"
#include "protobuf/command.h"
#include "protobuf/status.h"
#include "protobuf/ssl_wrapper.pb.h"

#include <QObject>
#include <QQuaternion>
#include <functional>
#include <cmath>

class SimTester : public QObject {
    Q_OBJECT
public slots:
    void count() { m_counter++; }
    void handlePacket(const QByteArray &data, qint64 time, QString sender);
    void handleSimulatorTruth(const QByteArray &data);

signals:
    void sendCommand(const Command& c);
    void sendSSLRadioCommand(const SSLSimRobotControl& control, bool isBlue, qint64 processingStart);

public:
    int m_counter = 0;
    std::function<void(const SSL_WrapperPacket&)> f = [](const SSL_WrapperPacket& p) {};
    std::function<void(const world::SimulatorState&)> s = [](const world::SimulatorState& s) {};
};

static camun::simulator::Simulator* mallocTestingSimulator(Timer* t) {
    // this is stolen from amun
    amun::SimulatorSetup defaultSimulatorSetup;
    geometrySetDefault(defaultSimulatorSetup.mutable_geometry());
    defaultSimulatorSetup.mutable_camera_setup()->set_num_cameras(2);
    defaultSimulatorSetup.mutable_camera_setup()->set_camera_height(4.5f);
    return new camun::simulator::Simulator{t, defaultSimulatorSetup, true};
}

void SimTester::handlePacket(const QByteArray &data, qint64 time, QString sender) {
    ASSERT_TRUE(sender == QString("simulator"));

    SSL_WrapperPacket wrapper;
    bool result = wrapper.ParseFromArray(data.data(), data.size());
    ASSERT_TRUE(result && "wrapper.ParseFromArray");

    f(wrapper);
}

void SimTester::handleSimulatorTruth(const QByteArray &data) {
    world::SimulatorState simState;
    bool result = simState.ParseFromArray(data.data(), data.size());
    ASSERT_TRUE(result && "simState.ParseFromArray");

    s(simState);
}

using namespace camun::simulator;

class FastSimulatorTest : public testing::Test {
public:
    FastSimulatorTest() : s(nullptr) {
        s = mallocTestingSimulator(&t);
        test.connect(&test, &SimTester::sendCommand, s, &Simulator::handleCommand);
        t.setScaling(0);
        t.setTime(1234, 0);
        s->seedPRGN(14986);
        s->connect(s, &Simulator::sendRealData, &test, &SimTester::handleSimulatorTruth);
    }

    void SetUp() override {
        Command c{new amun::Command};
        c->mutable_simulator()->set_enable(true);
        emit test.sendCommand(c);
    }

    ~FastSimulatorTest() {
        delete s;
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
        fourteen.set_shot_linear_max(8);
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

#include "simulator.moc"


TEST_F(FastSimulatorTest, VisionRate) {
    s->disconnect(s, &Simulator::sendRealData, &test, &SimTester::handleSimulatorTruth);
    s->connect(s, &Simulator::gotPacket, &test, &SimTester::count);
    FastSimulator::goDelta(s, &t, 1e9); // one second
    const int exp_packets = 60 * 2; // 60 Hz * 2 cameras
    ASSERT_LE(test.m_counter, exp_packets * 1.2);
    ASSERT_GE(test.m_counter, exp_packets * 0.8);
}

TEST_F(FastSimulatorTest, OriginString) {
    s->disconnect(s, &Simulator::sendRealData, &test, &SimTester::handleSimulatorTruth);
    s->connect(s, &Simulator::gotPacket, &test, &SimTester::handlePacket);
    FastSimulator::goDelta(s, &t, 5e8); // 500 millisecond
}

TEST_F(FastSimulatorTest, NoRobots) {
    s->disconnect(s, &Simulator::sendRealData, &test, &SimTester::handleSimulatorTruth);
    s->connect(s, &Simulator::gotPacket, &test, &SimTester::handlePacket);
    // Initially, the whole world should be empy without robots and just a ball
    test.f = [] (auto packet) {
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
    test.s = [] (auto truth) {
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
    test.s = [] (auto truth) {
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
    s->disconnect(s, &Simulator::sendRealData, &test, &SimTester::handleSimulatorTruth);
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
    test.s = [&x, &y, &phi, &init, &rotation] (auto truth) {
        ASSERT_EQ(truth.blue_robots_size(), 1);
        for (const auto& robot : truth.blue_robots()) {
            QQuaternion q{robot.rotation().real(), robot.rotation().i(), robot.rotation().j(), robot.rotation().k()}; // see simrobot.cpp
            QVector3D forwards{0, 1, 0};
            QVector3D rotated = q.rotatedVector(forwards);
            if (!init) {
                x = robot.p_x();
                y = robot.p_y();
                //stolen from fieldwidget
                phi = -atan2(rotated.z(), rotated.y());
                init = true;
                rotation = q;
            } else {
                ASSERT_LE(std::abs(robot.p_x() - x), 1e-2);
                ASSERT_LE(std::abs(robot.p_y() - y), 1e-2);
                ASSERT_LE(std::abs(-atan2(rotated.z(), rotated.y()) - phi), 5.f / 180 * M_PI);
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

    t.connect(&test, &SimTester::sendSSLRadioCommand, s, &Simulator::handleRadioCommands);

    test.s = [](auto truth) {};

    FastSimulator::goDeltaCallback(s, &t, 2e8, callback); // 200 milliseond to accelerate

    qint64 time = -1e7;
    init = false;
    auto callback2 = [&control, this, &time]() {
        time += 1e7;
        emit this->test.sendSSLRadioCommand(control, true, 0);
    };

    float ox, oy, oz;

    test.s = [rotation, &time, &ox, &oy, &oz, &init](auto truth) {
        ASSERT_EQ(truth.blue_robots_size(), 1);
        for (const auto& robot : truth.blue_robots()) {
            QVector3D forwards{0, -0.5, 0};
            QVector3D rotated = rotation.rotatedVector(forwards);
            ASSERT_LE(std::abs(robot.v_x() + rotated.z()), 2e-2);
            ASSERT_LE(std::abs(robot.v_y() + rotated.y()), 2e-2);
            ASSERT_LE(std::abs(robot.v_z() + rotated.x()), 2e-2);
            if (!init) {
                ox = robot.p_x();
                oy = robot.p_y();
                oz = robot.p_z();
                init = true;
            } else {
                QVector3D distance{0, static_cast<float>(-0.5 * time / 1e9), 0};
                rotated = rotation.rotatedVector(distance);
                ASSERT_LE(std::abs(robot.p_x() + rotated.z() - ox), 5e-2);
                ASSERT_LE(std::abs(robot.p_y() + rotated.y() - oy), 5e-2);
                ASSERT_LE(std::abs(robot.p_z() + rotated.x() - oz), 5e-2);
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
    test.s = [&x, &y, &phi, &init, &rotation] (auto truth) {
        ASSERT_EQ(truth.blue_robots_size(), 1);
        for (const auto& robot : truth.blue_robots()) {
            QQuaternion q{robot.rotation().real(), robot.rotation().i(), robot.rotation().j(), robot.rotation().k()}; // see simrobot.cpp
            QVector3D forwards{0, 1, 0};
            QVector3D rotated = q.rotatedVector(forwards);
            if (!init) {
                x = robot.p_x();
                y = robot.p_y();
                //stolen from fieldwidget
                phi = -atan2(rotated.z(), rotated.y());
                init = true;
                rotation = q;
            } else {
                ASSERT_LE(std::abs(robot.p_x() - x), 1e-2);
                ASSERT_LE(std::abs(robot.p_y() - y), 1e-2);
                ASSERT_LE(std::abs(-atan2(rotated.z(), rotated.y()) - phi), 5.f / 180 * M_PI);
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

    t.connect(&test, &SimTester::sendSSLRadioCommand, s, &Simulator::handleRadioCommands);

    test.s = [](auto truth) {};

    FastSimulator::goDeltaCallback(s, &t, 2e8, callback); // 200 milliseond to accelerate

    qint64 time = -1e7;
    init = false;
    auto callback2 = [&control, this, &time]() {
        time += 1e7;
        emit this->test.sendSSLRadioCommand(control, true, 0);
    };

    float ox, oy, oz;

    test.s = [rotation, &time, &ox, &oy, &oz, &init](auto truth) {
        ASSERT_EQ(truth.blue_robots_size(), 1);
        for (const auto& robot : truth.blue_robots()) {
            QVector3D forwards{0, 0, -0.5};
            QVector3D rotated = rotation.rotatedVector(forwards);
            ASSERT_LE(std::abs(robot.v_x() + rotated.z()), 2e-2);
            ASSERT_LE(std::abs(robot.v_y() + rotated.y()), 2e-2);
            ASSERT_LE(std::abs(robot.v_z() + rotated.x()), 2e-2);
            if (!init) {
                ox = robot.p_x();
                oy = robot.p_y();
                oz = robot.p_z();
                init = true;
            } else {
                QVector3D distance{0, 0, static_cast<float>(-0.5 * time / 1e9)};
                rotated = rotation.rotatedVector(distance);
                ASSERT_LE(std::abs(robot.p_x() + rotated.z() - ox), 5e-2);
                ASSERT_LE(std::abs(robot.p_y() + rotated.y() - oy), 5e-2);
                ASSERT_LE(std::abs(robot.p_z() + rotated.x() - oz), 5e-2);
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
    test.s = [&x, &y, &phi, &init, &rotation] (auto truth) {
        ASSERT_EQ(truth.yellow_robots_size(), 1);
        for (const auto& robot : truth.yellow_robots()) {
            QQuaternion q{robot.rotation().real(), robot.rotation().i(), robot.rotation().j(), robot.rotation().k()}; // see simrobot.cpp
            QVector3D forwards{0, 1, 0};
            QVector3D rotated = q.rotatedVector(forwards);
            if (!init) {
                x = robot.p_x();
                y = robot.p_y();
                //stolen from fieldwidget
                phi = -atan2(rotated.z(), rotated.y());
                init = true;
                rotation = q;
            } else {
                ASSERT_LE(std::abs(robot.p_x() - x), 1e-2);
                ASSERT_LE(std::abs(robot.p_y() - y), 1e-2);
                ASSERT_LE(std::abs(-atan2(rotated.z(), rotated.y()) - phi), 5.f / 180 * M_PI);
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

    t.connect(&test, &SimTester::sendSSLRadioCommand, s, &Simulator::handleRadioCommands);

    test.s = [](auto truth) {};

    FastSimulator::goDeltaCallback(s, &t, 2e8, callback); // 200 milliseond to accelerate

    qint64 time = -1e7;
    init = false;
    auto callback2 = [&control, this, &time]() {
        time += 1e7;
        emit this->test.sendSSLRadioCommand(control, false, 0);
    };

    float ox, oy, oz;

    test.s = [rotation, &time, &ox, &oy, &oz, &init](auto truth) {
        ASSERT_EQ(truth.yellow_robots_size(), 1);
        for (const auto& robot : truth.yellow_robots()) {
            QVector3D forwards{0, -0.5, 0};
            QVector3D rotated = rotation.rotatedVector(forwards);
            ASSERT_LE(std::abs(robot.v_x() + rotated.z()), 2e-2);
            ASSERT_LE(std::abs(robot.v_y() + rotated.y()), 2e-2);
            ASSERT_LE(std::abs(robot.v_z() + rotated.x()), 2e-2);
            if (!init) {
                ox = robot.p_x();
                oy = robot.p_y();
                oz = robot.p_z();
                init = true;
            } else {
                QVector3D distance{0, static_cast<float>(-0.5 * time / 1e9), 0};
                rotated = rotation.rotatedVector(distance);
                ASSERT_LE(std::abs(robot.p_x() + rotated.z() - ox), 5e-2);
                ASSERT_LE(std::abs(robot.p_y() + rotated.y() - oy), 5e-2);
                ASSERT_LE(std::abs(robot.p_z() + rotated.x() - oz), 5e-2);
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
    test.s = [&x, &y, &phi, &init, &rotation] (auto truth) {
        ASSERT_EQ(truth.yellow_robots_size(), 1);
        for (const auto& robot : truth.yellow_robots()) {
            QQuaternion q{robot.rotation().real(), robot.rotation().i(), robot.rotation().j(), robot.rotation().k()}; // see simrobot.cpp
            QVector3D forwards{0, 1, 0};
            QVector3D rotated = q.rotatedVector(forwards);
            if (!init) {
                x = robot.p_x();
                y = robot.p_y();
                //stolen from fieldwidget
                phi = -atan2(rotated.z(), rotated.y());
                init = true;
                rotation = q;
            } else {
                ASSERT_LE(std::abs(robot.p_x() - x), 1e-2);
                ASSERT_LE(std::abs(robot.p_y() - y), 1e-2);
                ASSERT_LE(std::abs(-atan2(rotated.z(), rotated.y()) - phi), 5.f / 180 * M_PI);
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

    t.connect(&test, &SimTester::sendSSLRadioCommand, s, &Simulator::handleRadioCommands);

    test.s = [](auto truth) {};

    FastSimulator::goDeltaCallback(s, &t, 2e8, callback); // 200 milliseond to accelerate

    qint64 time = -1e7;
    init = false;
    auto callback2 = [&control, this, &time]() {
        time += 1e7;
        emit this->test.sendSSLRadioCommand(control, false, 0);
    };

    float ox, oy, oz;

    test.s = [rotation, &time, &ox, &oy, &oz, &init](auto truth) {
        ASSERT_EQ(truth.yellow_robots_size(), 1);
        for (const auto& robot : truth.yellow_robots()) {
            QVector3D forwards{0, 0, 0.5};
            QVector3D rotated = rotation.rotatedVector(forwards);
            ASSERT_LE(std::abs(robot.v_x() + rotated.z()), 2e-2);
            ASSERT_LE(std::abs(robot.v_y() + rotated.y()), 2e-2);
            ASSERT_LE(std::abs(robot.v_z() + rotated.x()), 2e-2);
            if (!init) {
                ox = robot.p_x();
                oy = robot.p_y();
                oz = robot.p_z();
                init = true;
            } else {
                QVector3D distance{0, 0, static_cast<float>(0.5 * time / 1e9)};
                rotated = rotation.rotatedVector(distance);
                ASSERT_LE(std::abs(robot.p_x() + rotated.z() - ox), 5e-2);
                ASSERT_LE(std::abs(robot.p_y() + rotated.y() - oy), 5e-2);
                ASSERT_LE(std::abs(robot.p_z() + rotated.x() - oz), 5e-2);
            }
        }
    };

    FastSimulator::goDeltaCallback(s, &t, 18e8, callback2); // summa summarum 2 seconds
}

TEST_F(FastSimulatorTest, UnaffectedRobotsByCommands) {
    loadRobots(2, 1);
    float phi[2], x[2], y[2]; // 0 blue, 1 yellow
    bool init = false;
    test.s = [&x, &y, &phi, &init] (auto truth) {
        ASSERT_EQ(truth.blue_robots_size(), 2);
        int i = -2;
        auto checkRobot = [&i, init, &x, &y, &phi](const auto& robot) {
            QQuaternion q{robot.rotation().real(), robot.rotation().i(), robot.rotation().j(), robot.rotation().k()}; // see simrobot.cpp
            QVector3D forwards{0, 1, 0};
            QVector3D rotated = q.rotatedVector(forwards);
            if (!init) {
                x[i] = robot.p_x();
                y[i] = robot.p_y();
                //stolen from fieldwidget
                phi[i] = -atan2(rotated.z(), rotated.y());
            } else {
                ASSERT_LE(std::abs(robot.p_x() - x[i]), 1e-2);
                ASSERT_LE(std::abs(robot.p_y() - y[i]), 1e-2);
                ASSERT_LE(std::abs(-atan2(rotated.z(), rotated.y()) - phi[i]), 5.f / 180 * M_PI);
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

    t.connect(&test, &SimTester::sendSSLRadioCommand, s, &Simulator::handleRadioCommands);


    FastSimulator::goDeltaCallback(s, &t, 2e9, callback); // 2 seconds
}
