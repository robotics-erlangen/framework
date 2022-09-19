#pragma once

#include "simulator/simulator.h"
#include "protobuf/ssl_simulation_robot_control.pb.h"
#include "protobuf/ssl_simulation_robot_feedback.pb.h"
#include "protobuf/ssl_simulation_config.pb.h"
#include "protobuf/ssl_simulation_error.pb.h"

namespace underbots {
    class Simulator : private camun::simulator::Simulator {
    public:
        explicit Simulator();
        // TODO: override destructor?
        Simulator(const Simulator&) = delete;
        Simulator& operator=(const Simulator&) = delete;

        void stepSimulation(float delta_t);
        sslsim::SimulatorError handleRobotControl(sslsim::RobotControl msg);
        sslsim::SimulatorResponse handleSimulatorCommand(sslsim::SimulatorCommand msg);
        std::vector<SSL_WrapperPacket> getSSLWrapperPackets();
        sslsim::RobotControlResponse getRobotControlResponse();
    };
}
