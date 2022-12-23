/***************************************************************************
 *   Copyright 2015 Michael Eischer, Jan Kallwies, Philipp Nordhus         *
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

#ifndef PROCESSOR_H
#define PROCESSOR_H

#include "protobuf/command.h"
#include "protobuf/robotcommand.h"
#include "protobuf/ssl_mixed_team.pb.h"
#include "protobuf/status.h"
#include <QMap>
#include <QPair>
#include <QObject>
#include <QThread>

class CommandEvaluator;
class Referee;
class SpeedTracker;
class Timer;
class Tracker;
class QTimer;
class InternalGameController;

class Processor : public QObject
{
    Q_OBJECT

public:
    static const int FREQUENCY;

    explicit Processor(const Timer *timer, bool isReplay);
    ~Processor() override;
    Processor(const Processor&) = delete;
    Processor& operator=(const Processor&) = delete;
    bool getIsFlipped() const { return m_lastFlipped; }
    InternalGameController *getInternalGameController() const { return m_gameController; }
    void resetTracking();

signals:
    void sendStatus(const Status &status);
    void sendStrategyStatus(const Status &status);
    void sendRadioCommands(const QList<robot::RadioCommand> &commands, qint64 processingStart);
    void setFlipped(bool flipped);
    void refereeHostChanged(QString host);

public slots:
    void setScaling(double scaling);
    void handleRefereePacket(const QByteArray &data, qint64 time, QString sender);
    void handleVisionPacket(const QByteArray &data, qint64 time, QString sender);
    void handleSimulatorExtraVision(const QByteArray &data);
    void handleMixedTeamInfo(const QByteArray &data, qint64 time);
    void handleRadioResponses(const QList<robot::RadioResponse> &responses);
    void handleCommand(const Command &command);
    void handleStrategyCommands(bool blue, const QList<RobotCommandInfo> &commands, qint64 time);
    void handleStrategyHalt(bool blue);
    // public only for tracking replay
    void process(qint64 overwriteTime = -1);

private:
    struct Robot;
    struct Team
    {
        robot::Team team;
        QMap<QPair<uint, uint>, Robot*> robots;
    };

private:
    typedef google::protobuf::RepeatedPtrField<world::Robot> RobotList;

    void setTeam(const robot::Team &t, Team &team);
    void processTeam(Team &team, bool isBlue, const RobotList &robots, QList<robot::RadioCommand> &radio_commands_prio,
                     QList<robot::RadioCommand> &radio_commands, Status &status, qint64 time, const RobotList &radioRobots,
                     amun::DebugValues *debug);
    void injectRawSpeedIfAvailable(robot::RadioCommand *radioCommand, const RobotList &radioRobots, const world::Robot *currentRobot);
    void handleControl(Team &team, const amun::CommandControl &control);
    const world::Robot *getWorldRobot(const RobotList &robots, uint id);
    void injectExtraData(Status &status);
    void injectUserControl(Status &status, bool isBlue);
    Status assembleStatus(qint64 time, bool resetRaw);
    world::WorldSource currentWorldSource() const;
    static QString ballModelConfigFile(bool isSimulator);

    void sendTeams();

    const Timer *m_timer;
    QTimer* m_trigger;
    Referee *m_referee;
    Referee *m_refereeInternal;
    std::unique_ptr<Tracker> m_tracker;
    std::unique_ptr<Tracker> m_speedTracker;
    std::unique_ptr<Tracker> m_simpleTracker;
    QList<robot::RadioResponse> m_responses;
    QList<QByteArray> m_extraVision;
    ssl::TeamPlan m_mixedTeamInfo;
    bool m_mixedTeamInfoSet;
    bool m_refereeInternalActive;
    bool m_simulatorEnabled = false;
    bool m_internalSimulatorEnabled = false;
    bool m_externalSimulatorEnabled = false;
    bool m_lastFlipped;
    InternalGameController *m_gameController;
    QThread *m_gameControllerThread;

    Team m_blueTeam;
    Team m_yellowTeam;

    bool m_transceiverEnabled;

    world::DivisionDimensions m_divisionDimensions;
    world::BallModel m_ballModel;
    bool m_ballModelUpdated = false;
    const bool m_saveBallModel;
};

#endif // PROCESSOR_H
