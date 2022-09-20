#include <iostream>
#include "simulator/simulator.h"
#include "core/timer.h"
#include <QTimer>
#include <QFile>
#include <google/protobuf/message.h>
#include <google/protobuf/text_format.h>


int main(int argc, char* argv[])
{
//    QString full_filename = "../../../../config/simulator/2020.txt" ;
//    QString full_filename = "/home/mathew/projects/ER-Force-Simulator/config/simulator/2020.txt";
    QString full_filename = "/home/mathew/Projects/ER-Force-Simulator/config/simulator/2020.txt";
    QFile file(full_filename);
    if (!file.open(QFile::ReadOnly))
    {
        std::cerr <<
        "Could not open configuration file " << full_filename.toStdString()
                   << std::endl;
    }

    QString str = file.readAll();
    file.close();

    std::string s = qPrintable(str);
    google::protobuf::TextFormat::Parser parser;
    amun::SimulatorSetup er_force_sim_setup;
    parser.ParseFromString(s, &er_force_sim_setup);

    auto* timer = new Timer();
    auto simulator = camun::simulator::Simulator(timer, er_force_sim_setup, true);

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
