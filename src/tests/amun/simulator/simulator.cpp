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
#include <functional>

class SimTester : public QObject {
    Q_OBJECT
public slots:
    void count() { m_counter++; }
    void handlePacket(const QByteArray &data, qint64 time, QString sender);
    void handleSimulatorTruth(const QByteArray &data);

signals:
    void sendCommand(const Command& c);

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
