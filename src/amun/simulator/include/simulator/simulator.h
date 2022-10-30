/***************************************************************************
 *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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

#ifndef SIMULATOR_H
#define SIMULATOR_H

//#include "core/timer.h"
#include "protobuf/command.h"
#include "protobuf/status.h"
#include "protobuf/sslsim.h"
#include <QFile>
#include <QList>
#include <QMap>
#include <QPair>
#include <QQueue>
#include <QByteArray>
#include <tuple>
#include <list>
#include <random>
#include <google/protobuf/text_format.h>

#include "protobuf/ssl_simulation_robot_control.pb.h"
#include "protobuf/ssl_simulation_robot_feedback.pb.h"
#include "protobuf/ssl_simulation_config.pb.h"
#include "protobuf/ssl_simulation_error.pb.h"

// higher values break the rolling friction of the ball
const float SIMULATOR_SCALE = 10.0f;
const float SUB_TIMESTEP = 1/200.f;
const float COLLISION_MARGIN = 0.04f;
const unsigned FOCAL_LENGTH = 390;

class QByteArray;
class QTimer;
class Timer;
class SSL_GeometryFieldSize;

namespace camun {
    namespace simulator {
        class SimRobot;
        class Simulator;
        class ErrorAggregator;
        struct SimulatorData;

        enum class ErrorSource {
            BLUE,
            YELLOW,
            CONFIG
        };
    }
}

namespace {
    amun::SimulatorSetup loadSetupFromFile(std::string absolute_filepath) {
        QFile file(QString::fromStdString(absolute_filepath));
        if (!file.open(QFile::ReadOnly))
        {
            std::cerr <<
                      "Could not open configuration file " << absolute_filepath
                      << std::endl;
        }

        QString str = file.readAll();
        file.close();

        std::string s = qPrintable(str);
        google::protobuf::TextFormat::Parser parser;
        amun::SimulatorSetup er_force_sim_setup;
        parser.ParseFromString(s, &er_force_sim_setup);
        return er_force_sim_setup;
    }
}

using SerializedMsg = std::vector<uint8_t>;

class camun::simulator::Simulator : public QObject
{
    Q_OBJECT

public:
    typedef QMap<unsigned int, QPair<SimRobot*, unsigned int>> RobotMap; /*First int: ID, Second int: Generation*/

    explicit Simulator(std::string absolute_filepath);
    explicit Simulator(const Timer *timer, const amun::SimulatorSetup &setup, bool useManualTrigger = false);
    ~Simulator() override;
    Simulator(const Simulator&) = delete;
    Simulator& operator=(const Simulator&) = delete;
    void handleSimulatorTick(double timeStep);
    void seedPRGN(uint32_t seed);

    template <typename T>
    std::vector<uint8_t> serializeProto(const T& msg) {
        size_t msg_size_bytes = msg.ByteSizeLong();
        std::vector<uint8_t> data(msg_size_bytes);
        if(data.data() != nullptr) {
            msg.SerializeToArray(data.data(), msg_size_bytes);
        }
        return data;
    }
    template <typename T>
    T parseProto(const SerializedMsg& msg) {
        T parsed_msg;
        if(!parsed_msg.ParseFromArray(msg.data(), msg.size())) {
            // TODO: error
        }
        return parsed_msg;
    }

    void stepSimulation(float time_s);

    sslsim::RobotControlResponse handleRobotControl(const sslsim::RobotControl& msg, bool is_blue);
    sslsim::RobotControlResponse handleYellowRobotControl(sslsim::RobotControl msg);
    sslsim::RobotControlResponse handleBlueRobotControl(sslsim::RobotControl msg);
    void handleCommandWrapper(const Command& command);
    sslsim::SimulatorResponse handleSimulatorCommand(sslsim::SimulatorCommand command, bool is_blue);
    std::vector<SSL_WrapperPacket> getSslWrapperPackets(bool add_noise=true);
    // Sometimes the simulation has to run before errors are detected, so provide
    // a separate function the caller can check whenever they want
    // Returns std::vector<sslsim::SimulatorError>
    std::vector<sslsim::SimulatorError> getAndClearErrors();
    SSL_WrapperPacket getTrueStateSslWrapperPacket();

    // Even though some of these could be overloaded and share names with the above, it's easier
    // for pybind to disambiguate types with different names
    SerializedMsg handleSerializedYellowRobotControl(SerializedMsg msg);
    SerializedMsg handleSerializedBlueRobotControl(SerializedMsg msg);
    SerializedMsg handleSerializedSimulatorCommand(SerializedMsg msg);
    std::vector<SerializedMsg> getSerializedSSLWrapperPackets();
    std::vector<SerializedMsg> getAndClearSerializedErrors();
    SerializedMsg getSerializedTrueStateSslWrapperPacket();

signals:
    void gotPacket(const QByteArray &data, qint64 time, QString sender);
    void sendStatus(const Status &status);
    void sendRadioResponses(const QList<robot::RadioResponse> &responses);
    void sendRealData(const QByteArray& data); // sends amun::SimulatorState
    void sendSSLSimError(const QList<SSLSimError>& errors, ErrorSource source);

public slots:
    void handleCommand(const Command &command);
    void handleRadioCommands(const SSLSimRobotControl& control, bool isBlue, qint64 processingStart);
    void setScaling(double scaling);
    void setFlipped(bool flipped);
    // checks for possible collisions with the robots on the target position of the ball
    // calls teleportRobotToFreePosition to move robots out of the way
    void safelyTeleportBall(const float x, const float y);
    void process();

private slots:
    void sendVisionPacket();

private:
    void sendSSLSimErrorInternal(ErrorSource source);
    void resetFlipped(RobotMap &robots, float side);
    std::tuple<QList<QByteArray>, QByteArray, qint64> createVisionPacket();
    void resetVisionPackets();
    void setTeam(RobotMap &list, float side, const robot::Team &team, QMap<uint32_t, robot::Specs>& specs);
    void moveBall(const sslsim::TeleportBall &ball);
    void moveRobot(const sslsim::TeleportRobot &robot);
    void teleportRobotToFreePosition(SimRobot *robot);
    void initializeDetection(SSL_DetectionFrame *detection, std::size_t cameraId);

private:
    typedef std::tuple<SSLSimRobotControl, qint64, bool> RadioCommand;
    SimulatorData *m_data;
    QQueue<RadioCommand> m_radioCommands;
    QQueue<std::tuple<QList<QByteArray>, QByteArray, qint64>> m_visionPackets;
    QQueue<QTimer *> m_visionTimers;
    bool m_isPartial;
    const Timer *m_timer;
    QTimer *m_trigger;
    qint64 m_time;
    qint64 m_lastSentStatusTime;
    double m_timeScaling;
    bool m_enabled;
    bool m_charge;
    // systemDelay + visionProcessingTime = visionDelay
    qint64 m_visionDelay;
    qint64 m_visionProcessingTime;

    qint64 m_minRobotDetectionTime = 0;
    qint64 m_minBallDetectionTime = 0;
    qint64 m_lastBallSendTime = 0;
    std::map<qint64, unsigned> m_lastFrameNumber;
    ErrorAggregator *m_aggregator;

    std::mt19937 rand_shuffle_src = std::mt19937(std::random_device()());
};

#endif // SIMULATOR_H
