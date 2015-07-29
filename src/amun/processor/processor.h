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
#include "protobuf/status.h"
#include "protobuf/ssl_radio_protocol.pb.h"
#include "protobuf/ssl_mixed_team.pb.h"
#include <QMap>
#include <QPair>
#include <QObject>

class Controller;
class Referee;
class Timer;
class Tracker;
class QTimer;

class Processor : public QObject
{
    Q_OBJECT

public:
    Processor(const Timer *timer);
    ~Processor();

signals:
    void sendStatus(const Status &status);
    void sendStrategyStatus(const Status &status);
    void sendRadioCommands(const QList<robot::RadioCommand> &commands);

public slots:
    void setScaling(float scaling);
    void handleRefereePacket(const QByteArray &data, qint64 time);
    void handleVisionPacket(const QByteArray &data, qint64 time);
    void handleNetworkCommand(const QByteArray &data, qint64 time);
    void handleMixedTeamInfo(const QByteArray &data, qint64 time);
    void handleRadioResponses(const QList<robot::RadioResponse> &responses);
    void handleCommand(const Command &command);
    void handleStrategyCommand(bool blue, uint generation, uint id, QByteArray data, qint64 time);
    void handleStrategyHalt(bool blue);

private:
    struct Robot;
    struct Team
    {
        robot::Team team;
        QMap<QPair<uint, uint>, Robot*> robots;
    };

private slots:
    void process();

private:
    typedef google::protobuf::RepeatedPtrField<world::Robot> RobotList;

    void setTeam(const robot::Team &t, Team &team);
    void processTeam(Team &team, bool isBlue, const RobotList &robots, QList<robot::RadioCommand> &radio_commands, Status &status, qint64 time);
    void handleControl(Team &team, const amun::CommandControl &control);
    void updateCommandVGlobal(const world::Robot *robot, robot::Command &command);
    void updateCommandVLocal(const world::Robot *robot, robot::Command &command);
    const world::Robot *getWorldRobot(const RobotList &robots, uint id);
    void injectExtraData(Status &status);
    void injectUserControl(Status &status, bool isBlue);

    void sendTeams();

    const Timer *m_timer;
    QTimer* m_trigger;
    Referee *m_referee;
    Referee *m_refereeInternal;
    Tracker *m_tracker;
    QList<robot::RadioResponse> m_responses;
    QMap<uint, SSL_RadioProtocolCommand> m_networkCommand;
    ssl::TeamPlan m_mixedTeamInfo;
    bool m_mixedTeamInfoSet;
    qint64 m_networkCommandTime;
    bool m_refereeInternalActive;
    bool m_simulatorEnabled;

    Team m_blueTeam;
    Team m_yellowTeam;

    bool m_transceiverEnabled;
};

#endif // PROCESSOR_H
