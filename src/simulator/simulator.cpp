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
#include "protobuf/sslsim.h"
#include "protobuf/status.h"
#include "protobuf/command.h"
#include "protobuf/geometry.h"
#include "simulator/simulator.h"

#include "core/timer.h"
#include "core/run_out_of_scope.h"

#include "ssl_robocup_server.h"

static int BLUE_PORT = 10301;
static int YELLOW_PORT = 10302;
static int CONTROL_PORT = 10300;


/**
 * Stand alone Erforce simulator
 *
 * Known issues:
 *  - [ ]: Currently, it is not possible to supply partial positions for teleportBall or teleportRobot
 *  - [ ]: Simulator Config is not implemented
 *  - [ ]: Adding / removing robots via teleport-robot is not implemented.
 *  - [ ]: Robots go into standby after 0.1 seconds without command (Safty)
 *  - [ ]: Dribbler will reset if a new command doesn't contain a new dribbling speed (contrary to the definition that states all not set values should stay as previously assumed)
 *  - [ ]: Commands that are recieved at t0 will not be in effect after the next tick of the simulator (around 5 ms), no interpolation.
 *  - [ ]: Tournament mode where commands origin are checked is not implemented
 */

class SimulatorCommandAdaptor: public QObject {
    Q_OBJECT
public:
    SimulatorCommandAdaptor(Timer* timer);
private slots:
    void handleDatagrams();

public slots:
    void handleSimulatorError(const QList<SSLSimError> &error, camun::simulator::ErrorSource source);

signals:
    void sendCommand(const Command& c);

private:
    QUdpSocket m_server;
    QHostAddress m_senderAddress;
    int m_senderPort;
    Timer* m_timer; // unowned
};

SimulatorCommandAdaptor::SimulatorCommandAdaptor(Timer* timer):
    m_server(this),
    m_senderAddress(QHostAddress::Null),
    m_senderPort(-1),
    m_timer(timer)
{
    m_server.bind(QHostAddress::Any, CONTROL_PORT);
    connect(&m_server, &QUdpSocket::readyRead, this, &SimulatorCommandAdaptor::handleDatagrams);
}

class RobotCommandAdaptor: public QObject{
    Q_OBJECT
public:
    RobotCommandAdaptor(bool blue, Timer* timer);

private:
    void sendRobotRespose(const sslsim::RobotControlResponse& rcr);

public slots:
    void handleRobotResponse(const QList<robot::RadioResponse>& responses);
    void handleSimulatorError(const QList<SSLSimError> &error, camun::simulator::ErrorSource source);

private slots:
    void handleDatagrams();

signals:
    void sendRadioCommands(const SSLSimRobotControl & commands, bool isBlue, qint64 processingDelay);


private:
    bool m_is_blue;
    QUdpSocket m_server;
    QHostAddress m_senderAddress;
    int m_senderPort;
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

enum class SimError {
    UNSUPPORTED_VELOCITY,
    UNSUPPORTED_ANGLE,
    UNREADABLE
};

static void setError(sslsim::SimulatorError* error, SimError code, std::string appendix = "") {
    switch(code) {
        case SimError::UNREADABLE:
            error->set_code("UNREADABLE");
            error->set_message("The recieved message was unreadable " + appendix);
            break;
        case SimError::UNSUPPORTED_VELOCITY:
            error->set_code("VELOCITY_TYPE");
            error->set_message("The recieved message had a velocity type unsupported by this simulator "+appendix);
            break;
        case SimError::UNSUPPORTED_ANGLE:
            error->set_code("ANGLE_VALUE");
            error->set_message("The recieved kick angle was not equal to either 0 or 45 " + appendix);
            break;
        default:
            std::cerr << "Unmanaged SimError for message" << std::endl;
    }
}

static void sendUDP(const google::protobuf::Message& out, QUdpSocket& server, const QHostAddress& senderAddress, int senderPort) {
    QByteArray data;
    data.resize(out.ByteSize());
    bool sendingSuccessful = false;
    if (out.SerializeToArray(data.data(), data.size())) {
        sendingSuccessful = server.writeDatagram(data, senderAddress, senderPort) == data.size();
    }
    if (!sendingSuccessful) {
        std::cerr << "Sending relpy failed: " << std::endl;
    }
}

#define SCALE_UP(OBJ, ATTR) do{if((OBJ).has_##ATTR()) (OBJ).set_##ATTR((OBJ).ATTR() * 1e3);} while(0)

void SimulatorCommandAdaptor::handleDatagrams() {
    while(m_server.hasPendingDatagrams()) {
        qint64 start = m_timer->currentTime();
        auto datagram = m_server.receiveDatagram();
        sslsim::SimulatorResponse sir;
        bool sendSir = false;
        m_senderAddress = datagram.senderAddress();
        m_senderPort = datagram.senderPort();
        auto data = datagram.data();

        RUN_WHEN_OUT_OF_SCOPE({
                if (sendSir) {
                    sendUDP(sir, m_server, m_senderAddress, m_senderPort);
                }
            });
        sslsim::SimulatorCommand simcom;
        if (!simcom.ParseFromArray(data.data(), data.size())) {
            sendSir = true;
            setError(sir.add_errors(), SimError::UNREADABLE);
            continue;
        }
        if (simcom.has_control()) {
            Command c{new amun::Command};
            auto* sslControl = c->mutable_simulator()->mutable_ssl_control();
            sslControl->CopyFrom(simcom.control());
            if (sslControl->has_teleport_ball()) {
                auto* teleportBall = sslControl->mutable_teleport_ball();
                SCALE_UP(*teleportBall, x);
                SCALE_UP(*teleportBall, y);
                SCALE_UP(*teleportBall, z);
                SCALE_UP(*teleportBall, vx);
                SCALE_UP(*teleportBall, vy);
                SCALE_UP(*teleportBall, vz);
            }
            for(sslsim::TeleportRobot& robot : *sslControl->mutable_teleport_robot()) {
                SCALE_UP(robot, x);
                SCALE_UP(robot, y);
                SCALE_UP(robot, v_x);
                SCALE_UP(robot, v_y);
            }
            emit sendCommand(c);
        }

        qint64 delta = m_timer->currentTime() - start;
        std::cout << "Handled Datagram in " << delta << std::endl;
    }
}

void RobotCommandAdaptor::handleSimulatorError(const QList<SSLSimError> &error,camun::simulator::ErrorSource source)
{

    camun::simulator::ErrorSource expected = m_is_blue ? camun::simulator::ErrorSource::BLUE : camun::simulator::ErrorSource::YELLOW;
    if (source != expected) return;
    if (error.size() == 0) return;

    sslsim::RobotControlResponse rcr;

    for(const SSLSimError& err : error) {
        auto* sendError = rcr.add_errors();
        *sendError = *err;
    }

    sendRobotRespose(rcr);
}

void SimulatorCommandAdaptor::handleSimulatorError(const QList<SSLSimError> &error, camun::simulator::ErrorSource source) {
    if (source != camun::simulator::ErrorSource::CONFIG) return;
    if (error.size() == 0) return;
    sslsim::SimulatorResponse sir;
    for (const SSLSimError& err : error) {
        sir.add_errors()->CopyFrom(*err);
    }
    sendUDP(sir, m_server, m_senderAddress, m_senderPort);
}


void RobotCommandAdaptor::handleDatagrams()
{
    while(m_server.hasPendingDatagrams()) {
        qint64 start =m_timer->currentTime();
        sslsim::RobotControlResponse rcr;
        bool sendRcr = false;
        auto datagram = m_server.receiveDatagram();
        // TODO: do something with m_senderAddress and datagram.senderAddress
        m_senderAddress = datagram.senderAddress();
        m_senderPort = datagram.senderPort();
        auto data = datagram.data();

        RUN_WHEN_OUT_OF_SCOPE({
                if (sendRcr) {
                    sendRobotRespose(rcr);
                }
            });

        SSLSimRobotControl control{new sslsim::RobotControl};
        if (!control->ParseFromArray(data.data(), data.size())) {
            sendRcr = true;
            setError(rcr.add_errors(), SimError::UNREADABLE);
            continue;
        }

        for (const auto& command : control->robot_commands()) {
            if (command.has_move_command()) {
                const auto& moveCmd = command.move_command();
                if (moveCmd.has_wheel_velocity() || moveCmd.has_global_velocity()) {
                    sendRcr = true;
                    setError(rcr.add_errors(), SimError::UNSUPPORTED_VELOCITY, std::string{"(Robot :"}+std::to_string(command.id()) + ")");
                }
            }
        }
        emit sendRadioCommands(control, m_is_blue, m_timer->currentTime()); // This might be a bit late.
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
        if (response.has_is_blue() && response.is_blue() == m_is_blue && response.has_ball_detected()) {
            auto* outFeedback = out.add_feedback();
            outFeedback->set_id(response.id());
            outFeedback->set_dribbler_ball_contact(response.ball_detected());
            send = true;
        }
    }

    if (send) {
        sendRobotRespose(out);
    }
}

void RobotCommandAdaptor::sendRobotRespose(const sslsim::RobotControlResponse& out) {
    sendUDP(out, m_server, m_senderAddress, m_senderPort);
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

#include "simulator.moc"

using camun::simulator::Simulator;


int main(int argc, char* argv[])
{
    QApplication app(argc, argv);
    app.setApplicationName("Simulator");
    app.setOrganizationName("ER-Force");

    std::setlocale(LC_NUMERIC, "C");

    qRegisterMetaType<QList<robot::RadioResponse>>("QList<robot::RadioResponse>");
    qRegisterMetaType<Status>("Status");
    qRegisterMetaType<Command>("Command");
    qRegisterMetaType<SSLSimRobotControl>("SSLSimRobotControl");
    qRegisterMetaType<SSLSimError>("SSLSimError");
    qRegisterMetaType<QList<SSLSimError>>("QList<SSLSimError>");
    qRegisterMetaType<camun::simulator::ErrorSource>("ErrorSource");

    Timer timer;
    RobotCommandAdaptor blue{true, &timer}, yellow{false, &timer};
    SimulatorCommandAdaptor commands{&timer};
    // TODO: accept configuration commands
    amun::SimulatorSetup defaultSimulatorSetup;
    simulatorSetupSetDefault(defaultSimulatorSetup);

    Simulator sim{&timer, defaultSimulatorSetup};

    blue.connect(&blue, &RobotCommandAdaptor::sendRadioCommands, &sim, &Simulator::handleRadioCommands);
    blue.connect(&sim, &Simulator::sendRadioResponses, &blue, &RobotCommandAdaptor::handleRobotResponse);
    yellow.connect(&yellow, &RobotCommandAdaptor::sendRadioCommands, &sim, &Simulator::handleRadioCommands);
    yellow.connect(&sim, &Simulator::sendRadioResponses, &yellow, &RobotCommandAdaptor::handleRobotResponse);

    SSLVisionServer vision{10020};

    vision.connect(&sim, &Simulator::gotPacket, &vision, &SSLVisionServer::sendVisionData);
    commands.connect(&commands, &SimulatorCommandAdaptor::sendCommand, &sim, &Simulator::handleCommand);


    commands.connect(&sim, &Simulator::sendSSLSimError, &commands, &SimulatorCommandAdaptor::handleSimulatorError);
    blue.connect(&sim, &Simulator::sendSSLSimError, &blue, &RobotCommandAdaptor::handleSimulatorError);
    yellow.connect(&sim, &Simulator::sendSSLSimError, &yellow, &RobotCommandAdaptor::handleSimulatorError);

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
    commands.moveToThread(&rcv_thread);


    rcv_thread.start();

    return app.exec();
}
