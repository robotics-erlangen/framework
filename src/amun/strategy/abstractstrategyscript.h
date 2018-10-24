/***************************************************************************
 *   Copyright 2015 Michael Eischer                                        *
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

#ifndef ABSTRACTSTRATEGYSCRIPT_H
#define ABSTRACTSTRATEGYSCRIPT_H

#include "protobuf/command.h"
#include "protobuf/debug.pb.h"
#include "protobuf/gamestate.pb.h"
#include "protobuf/robot.pb.h"
#include "protobuf/robotcommand.h"
#include "protobuf/status.h"
#include "protobuf/userinput.pb.h"
#include "protobuf/world.pb.h"
#include "strategytype.h"
#include <QObject>
#include <QString>
#include <QStringList>
#include <QDir>

class DebugHelper;
class Timer;

class AbstractStrategyScript : public QObject
{
    Q_OBJECT
public:
    AbstractStrategyScript(const Timer *timer, StrategyType type, bool debugEnabled, bool refboxControlEnabled);
    ~AbstractStrategyScript() override {}

    // simple factory to allow for different strategy handlers
    static bool canHandle(const QString &filename);

    // return true on success, if false is returned the error msg can be retrieved via errorMsg()
    // loadScript and process MUST NOT be called anymore after an error was thrown!
    // must only be called once
    bool loadScript(const QString &filename, const QString &entryPoint, const world::Geometry &geometry, const robot::Team &team);
    // must only be called after loadScript was executed successfully
    bool process(double &pathPlanning, const world::State &worldState, const amun::GameState &refereeState, const amun::UserInput &userInput);
    virtual bool triggerDebugger();

    void setSelectedOptions(const QStringList &options);
    void setDebugHelper(DebugHelper *helper);
    void setIsInternalAutoref(bool internal) { m_isInternalAutoref = internal; }
    void setIsPerformanceMode(bool performance) { m_isPerformanceMode = performance; }
    void setIsReplay(bool replay) { m_isReplay = replay; }
    void setFlipped(bool flipped) { m_isFlipped = flipped; }

    // getter functions
    QString errorMsg() const { return m_errorMsg; }
    // may be called after loadScript / process
    Status takeDebugStatus();

    QStringList entryPoints() const { return m_entryPoints; }
    QString entryPoint() const { return m_entryPoint; }
    QString name() const { return m_name; }
    QStringList options() const { return m_options; }
    QStringList selectedOptions() const { return m_selectedOptions; }
    bool hasDebugger() const { return m_hasDebugger; }
    bool isInternalAutoref() const { return m_isInternalAutoref; }
    bool isPerformanceMode() const { return m_isPerformanceMode; }
    bool isReplay() const { return m_isReplay;}
    void addRefereeReply(SSL_RefereeRemoteControlReply reply) { m_refereeReplys.append(reply); }
    SSL_RefereeRemoteControlReply nextRefereeReply() { return m_refereeReplys.takeFirst(); }
    bool hasRefereeReply() const { return m_refereeReplys.size() > 0; }
    bool isFlipped() const { return m_isFlipped; }

    qint64 time() const;

    void log(const QString &text);
    amun::Visualization *addVisualization();
    void removeVisualizations();
    amun::DebugValue *addDebug();
    amun::PlotValue *addPlot();
    amun::RobotValue *addRobotValue();
    bool refboxControlEnabled() const { return m_refboxControlEnabled; }
    void setCommand(uint generation, uint robotId, const RobotCommand &command);
    bool sendCommand(const Command &command);
    bool sendNetworkReferee(const QByteArray &referee);
    void sendMixedTeam(const QByteArray &info);
    const world::Geometry& geometry() const { return m_geometry; }
    const robot::Team& team() const { return m_team; }
    const world::State& worldState() const { return m_worldState; }
    const amun::GameState& refereeState() const { return m_refereeState; }
    const amun::UserInput& userInput() const { return m_userInput; }
    bool isBlue() const { return m_type == StrategyType::BLUE; }
    StrategyType getStrategyType() const { return m_type; }
    QDir baseDir() const { return m_baseDir; }

signals:
    // wrapper may listen to reload request, but doesn't have to
    void requestReload();
    void gotCommand(const Command &command);
    void sendStrategyCommand(bool blue, uint generation, uint id, const RobotCommand &command, qint64 time);
    void sendMixedTeamInfo(const QByteArray &data);
    void sendNetworkRefereeCommand(const QByteArray &data);

protected:
    bool chooseEntryPoint(QString entryPoint);
    virtual bool loadScript(const QString &filename, const QString &entryPoint) = 0;
    virtual bool process(double &pathPlanning) = 0;

protected:
    QStringList m_entryPoints;
    QString m_entryPoint;
    QString m_name;
    QStringList m_options;
    QStringList m_selectedOptions;

    const Timer *m_timer;
    const StrategyType m_type;
    const bool m_debugEnabled;
    const bool m_refboxControlEnabled;

    QString m_errorMsg;
    Status m_debugStatus;
    bool m_hasDebugger;
    DebugHelper *m_debugHelper;
    bool m_isInternalAutoref;
    bool m_isPerformanceMode;
    bool m_isReplay;
    bool m_isFlipped;
    QDir m_baseDir;
    QString m_filename;

    world::Geometry m_geometry;
    robot::Team m_team;
    world::State m_worldState;
    amun::GameState m_refereeState;
    amun::UserInput m_userInput;

    QList<SSL_RefereeRemoteControlReply> m_refereeReplys;
};

#endif // ABSTRACTSTRATEGYSCRIPT_H
