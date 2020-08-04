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

#include "protobuf/command.h"
#include "protobuf/status.h"
#include <QList>
#include <QMap>
#include <QPair>
#include <QQueue>
#include <QByteArray>

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
        struct SimulatorData;
    }
}

class camun::simulator::Simulator : public QObject
{
    Q_OBJECT

public:
    typedef QMap<QPair<unsigned int, unsigned int>, SimRobot *> RobotMap;

    explicit Simulator(const Timer *timer, const amun::SimulatorSetup &setup);
    ~Simulator() override;
    Simulator(const Simulator&) = delete;
    Simulator& operator=(const Simulator&) = delete;
    void handleSimulatorTick(double timeStep);

signals:
    void gotPacket(const QByteArray &data, qint64 time, QString sender);
    void sendStatus(const Status &status);
    void sendRadioResponses(const QList<robot::RadioResponse> &responses);
    void sendRealData(const QByteArray& data); // sends amun::SimulatorState

public slots:
    void handleCommand(const Command &command);
    void handleRadioCommands(const QList<robot::RadioCommand> &commands, qint64 processingDelay);
    void setScaling(double scaling);
    void setFlipped(bool flipped);
    // checks for possible collisions with the robots on the target position of the ball
    // calls teleportRobotToFreePosition to move robots out of the way
    void safelyTeleportBall(const float x, const float y);

private slots:
    void process();
    void sendVisionPacket();

private:
    void resetFlipped(RobotMap &robots, float side);
    QPair<QList<QByteArray>, QByteArray> createVisionPacket();
    void resetVisionPackets();
    void setTeam(RobotMap &list, float side, const robot::Team &team);
    void moveBall(const amun::SimulatorMoveBall &ball);
    void moveRobot(const RobotMap &list, const amun::SimulatorMoveRobot &robot);
    void fieldAddLine(SSL_GeometryFieldSize *field, std::string name, float x1, float y1, float x2, float y2) const;
    void fieldAddCircularArc(SSL_GeometryFieldSize *field, std::string name, float x, float y, float radius, float a1, float a2) const;
    void populateFieldPacket(SSL_GeometryFieldSize *field);
    void teleportRobotToFreePosition(SimRobot *robot);
    void initializeDetection(SSL_DetectionFrame *detection, std::size_t cameraId);

private:
    typedef QPair<QList<robot::RadioCommand>, qint64> RadioCommand;
    SimulatorData *m_data;
    QQueue<RadioCommand> m_radioCommands;
    QQueue<QPair<QList<QByteArray>, QByteArray>> m_visionPackets;
    QQueue<QTimer *> m_visionTimers;
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
};

#endif // SIMULATOR_H
