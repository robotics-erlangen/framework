#include <iostream>
#include "simulator/simulator.h"
#include "core/timer.h"
#include <QTimer>
#include <QFile>
#include <google/protobuf/message.h>
#include <google/protobuf/text_format.h>


int main(int argc, char* argv[])
{
    std::string full_filename = "/home/mathew/Projects/ER-Force-Simulator/config/simulator/2020.txt";

    auto simulator = camun::simulator::Simulator(full_filename);


    sslsim::SimulatorCommand command;
    sslsim::SimulatorControl control;
    sslsim::TeleportBall teleport_ball;
    teleport_ball.set_x(50);
    teleport_ball.set_y(200);
    *control.mutable_teleport_ball() = teleport_ball;
    *command.mutable_control() = control;
    std::cout << "Hello World" << std::endl;
    for(auto p : simulator.getSSLWrapperPackets()) {
        std::cout << p.detection().DebugString() << std::endl;
    }
    simulator.handleSimulatorCommand(command);
    simulator.stepSimulation(0.1);
    for(auto error : simulator.getErrors()) {
        std::cout << error.DebugString() << std::endl;
    }
    for(auto p : simulator.getSSLWrapperPackets()) {
        std::cout << p.detection().DebugString() << std::endl;
    }
}
