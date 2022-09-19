#include "simulator.hpp"
#include "core/timer.h"

namespace underbots {
    Simulator::Simulator() : camun::simulator::Simulator(new Timer(), amun::SimulatorSetup(), true) {

    }

    void Simulator::stepSimulation(float delta_t) {

    }

    sslsim::SimulatorError Simulator::handleRobotControl(sslsim::RobotControl msg) {

    }

    sslsim::SimulatorResponse Simulator::handleSimulatorCommand(sslsim::SimulatorCommand msg) {

    }

    std::vector<SSL_WrapperPacket> Simulator::getSSLWrapperPackets() {

    }

    sslsim::RobotControlResponse Simulator::getRobotControlResponse() {

    }
}
