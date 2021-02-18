/****************************************************************************
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
#include <clocale>
#include <QApplication>
#include <QUdpSocket>
#include <QThread>
#include <QNetworkDatagram>
#include <cmath>

#include "protobuf/ssl_simulation_robot_control.pb.h"
#include "protobuf/ssl_simulation_robot_feedback.pb.h"
#include "protobuf/status.h"
#include "protobuf/command.h"
#include "protobuf/geometry.h"
#include "simulator/simulator.h"

#include "core/timer.h"

#include "ssl_robocup_server.h"

static int BLUE_PORT = 10301;
static int YELLOW_PORT = 10302;
static int CONTROL_PORT = 10300;


/**
 * Stand alone Erforce simulator
 *
 * Known issues:
 *  - [ ]: If the kick is considered a chip kick (45 degree) shot power is completly wrong (in meters distance until first drop down instead of velocity)
 *  - [ ]: Only the kick - angles 0 degree or 45 degree supported
 *  - [ ]: Configuring via control_port is unimplemented
 *  - [ ]: Responding to teams in case of error is unimplemented
 *  - [ ]: Robots go into standby after 0.1 seconds without command (Safty)
 *  - [ ]: Dribbler will reset if a new command doesn't contain a new dribbling speed (contrary to the definition that states all not set values should stay as previously assumed)
 *  - [ ]: Commands that are recieved at t0 will not be in effect after the next tick of the simulator (around 5 ms), no interpolation.
 *  - [ ]: Tournament mode where commands origin are checked is not implemented
 */

class RobotCommandAdaptor: public QObject{
    Q_OBJECT
public:
    RobotCommandAdaptor(bool blue, Timer* timer);

public slots:
    void handleRobotResponse(const QList<robot::RadioResponse>& responses);

private slots:
    void handleDatagrams();

signals:
    void sendRadioCommands(QList<robot::RadioCommand>, qint64 processingDelay);


private:
    bool m_is_blue;
    QUdpSocket m_server;
    QHostAddress m_senderAddress;
    int m_senderPort;
    QList<robot::RadioCommand> m_commands;
    Timer* m_timer; // unowned
};

RobotCommandAdaptor::RobotCommandAdaptor(bool blue, Timer* timer): m_is_blue(blue),
    m_server(this),
    m_senderAddress(QHostAddress::Null),
    m_senderPort(-1),
    m_timer(timer)
{
    m_server.bind(QHostAddress::Any, (blue)? BLUE_PORT : YELLOW_PORT);
    connect(&m_server, &QUdpSocket::readyRead, this, &RobotCommandAdaptor::handleDatagrams);
}

void RobotCommandAdaptor::handleDatagrams()
{
    while(m_server.hasPendingDatagrams()) {
        qint64 start =m_timer->currentTime();
        auto datagram = m_server.receiveDatagram();
        // TODO: do something with m_senderAddress and datagram.senderAddress
        m_senderAddress = datagram.senderAddress();
        m_senderPort = datagram.senderPort();
        auto data = datagram.data();

        sslsim::RobotControl control;
        if (!control.ParseFromArray(data.data(), data.size())) {
            // TODO: cerr
            std::cerr << "This is bad" << std::endl;
        }

        for (const auto& command : control.robot_commands()) {
            robot::RadioCommand rCommand;
            rCommand.set_is_blue(m_is_blue);
            rCommand.set_generation(0); // only one generation for external use
            rCommand.set_id(command.id());
            auto* rCmd = rCommand.mutable_command();
            if (command.has_kick_speed()) {
                bool accepted = true;
                if (command.kick_angle() == 0) {
                    rCmd->set_kick_style(robot::Command::Linear);
                } else if(command.kick_angle() == 45) {
                    rCmd->set_kick_style(robot::Command::Chip);
                } else {
                    accepted = false;
                    // TODO: reply to the sender!
                    std::cerr << "Unimplemented kick angle: " << command.kick_angle() << std::endl;
                }
                if (accepted) {
                    rCmd->set_kick_power(command.kick_speed());
                }
            }
            if (command.has_dribbler_speed()) {
                // We uses a float between 0 and 1 for its dribbler speed.
                // Where 0 is no rotation and 1 is 150 (rad / s).
                float max_rotation_speed = 150.f / 2 / M_PI * 60; // rpm
                rCmd->set_dribbler(command.dribbler_speed() / max_rotation_speed);
            }

            if (command.has_move_command()) {
                const auto& moveCmd = command.move_command();
                if (moveCmd.has_wheel_velocity() || moveCmd.has_global_velocity()) {
                    // TODO: reply to the sender!
                    std::cerr << "Unimplemented Velocity" << std::endl;
                }
                if (moveCmd.has_local_velocity()) {
                    const auto& localVelo = moveCmd.local_velocity();
                    auto moveCommand = rCmd->mutable_output1();
                    moveCommand->set_v_f(localVelo.forward());
                    moveCommand->set_v_s(-localVelo.left());
                    moveCommand->set_omega(localVelo.angular() * .5f / M_PI);
                }
            }
            m_commands.push_back(rCommand);
        }
        emit sendRadioCommands(m_commands, m_timer->currentTime()); // This might be a bit late.
        m_commands.clear();
        // TODO: response!
        qint64 delta = m_timer->currentTime() - start;
        std::cout << "Handled Datagram in " << delta << std::endl;
    }
}

void RobotCommandAdaptor::handleRobotResponse(const QList<robot::RadioResponse>& res) {
    if (m_senderAddress.isNull()) {
        return;
    }

    sslsim::RobotControlResponse out;
    bool send = false;

    for (const auto& response : res) {
        if (response.has_is_blue() && response.is_blue() == m_is_blue && response.has_ball_detected() && response.ball_detected()) {
            auto* outFeedback = out.add_feedback();
            outFeedback->set_id(response.id());
            outFeedback->set_dribbler_ball_contact(true);
            send = true;
        }
    }

    if (send) {
        QByteArray data;
        data.resize(out.ByteSize());
        bool sendingSuccessful = false;
        if (out.SerializeToArray(data.data(), data.size())) {
            sendingSuccessful = m_server.writeDatagram(data, m_senderAddress, m_senderPort) == data.size();
        }
        if (!sendingSuccessful) {
            std::cerr << "Sending relpy failed: " << std::endl;
        }
    }
}

class SSLVisionServer: public QObject {
    Q_OBJECT
public:
    SSLVisionServer(int port);

public slots:
    void sendVisionData(const QByteArray& data, qint64 time, QString sender);

private:
    RoboCupSSLServer m_server;
};

SSLVisionServer::SSLVisionServer(int port): m_server(this, port)
{
}

void SSLVisionServer::sendVisionData(const QByteArray& data, qint64, QString)
{
    m_server.send(data);
}

class SimulatorComandAdaptor: public QObject {
    Q_OBJECT
public:
    SimulatorComandAdaptor();

signals:
    void sendCommand(const Command& command);
};

SimulatorComandAdaptor::SimulatorComandAdaptor() {}

#include "simulator.moc"

using camun::simulator::Simulator;


int main(int argc, char* argv[])
{
    QApplication app(argc, argv);
    app.setApplicationName("Simulator");
    app.setOrganizationName("ER-Force");

    std::setlocale(LC_NUMERIC, "C");

    qRegisterMetaType<QList<robot::RadioCommand>>("QList<robot::RadioCommand>");
    qRegisterMetaType<QList<robot::RadioResponse>>("QList<robot::RadioResponse>");

    SimulatorComandAdaptor commands;

    Timer timer;
    RobotCommandAdaptor blue{true, &timer}, yellow{false, &timer};
    // TODO: accept configuration commands, this is stolen from amun
    amun::SimulatorSetup defaultSimulatorSetup;
    geometrySetDefault(defaultSimulatorSetup.mutable_geometry());
    defaultSimulatorSetup.mutable_camera_setup()->set_num_cameras(2);
    defaultSimulatorSetup.mutable_camera_setup()->set_camera_height(4.5f);

    Simulator sim{&timer, defaultSimulatorSetup};

    blue.connect(&blue, &RobotCommandAdaptor::sendRadioCommands, &sim, &Simulator::handleRadioCommands);
    blue.connect(&sim, &Simulator::sendRadioResponses, &blue, &RobotCommandAdaptor::handleRobotResponse);
    yellow.connect(&yellow, &RobotCommandAdaptor::sendRadioCommands, &sim, &Simulator::handleRadioCommands);
    yellow.connect(&sim, &Simulator::sendRadioResponses, &yellow, &RobotCommandAdaptor::handleRobotResponse);

    SSLVisionServer vision{10020};

    vision.connect(&sim, &Simulator::gotPacket, &vision, &SSLVisionServer::sendVisionData);
    commands.connect(&commands, &SimulatorComandAdaptor::sendCommand, &sim, &Simulator::handleCommand);

    Command c{new amun::Command};
    auto* simCommand = c->mutable_simulator();
    simCommand->set_enable(true);
    auto* trCommand = c->mutable_transceiver();
    trCommand->set_charge(true);
    // start with 6 robots for yellow and blue, take ER-Force specs.


    robot::Specs ERForce;
    ERForce.set_generation(0);
    ERForce.set_year(1970);
    ERForce.set_type(robot::Specs::Regular);
    ERForce.set_mass(1.5);
    ERForce.set_angle(0.98291);
    ERForce.set_v_max(3);
    ERForce.set_omega_max(6);
    ERForce.set_shot_linear_max(8);
    ERForce.set_shot_chip_max(3);
    ERForce.set_dribbler_width(0.07);
    ERForce.set_shoot_radius(0.067);
    ERForce.set_dribbler_height(0.04);

    auto* accel = ERForce.mutable_acceleration();
    accel->set_a_speedup_f_max(7);
    accel->set_a_speedup_s_max(6);
    accel->set_a_speedup_phi_max(60);
    accel->set_a_brake_f_max(7);
    accel->set_a_brake_s_max(6);
    accel->set_a_brake_phi_max(60);

    auto* str = ERForce.mutable_strategy();
    str->set_a_speedup_f_max(7);
    str->set_a_speedup_s_max(6);
    str->set_a_speedup_phi_max(60);
    str->set_a_brake_f_max(7);
    str->set_a_brake_s_max(6);
    str->set_a_brake_phi_max(60);

    auto* teamBlue = c->mutable_set_team_blue();
    auto* teamYellow = c->mutable_set_team_yellow();
    for(auto* team : {teamBlue, teamYellow}) {
        for(int i=0; i < 6; ++i){
            auto* robot = team->add_robot();
            robot->CopyFrom(ERForce);
            robot->set_id(i);
        }
    }



    emit commands.sendCommand(c);

    QThread rcv_thread;

    blue.moveToThread(&rcv_thread);
    yellow.moveToThread(&rcv_thread);
    vision.moveToThread(&rcv_thread);


    rcv_thread.start();

    return app.exec();
}
