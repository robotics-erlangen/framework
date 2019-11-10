/***************************************************************************
 *   Copyright 2015 Michael Eischer, Philipp Nordhus, Paul Bergmann        *
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

#ifndef STRATEGY_H
#define STRATEGY_H


#include "gamecontroller/gamecontrollerconnection.h"
#include "protobuf/command.h"
#include "protobuf/robotcommand.h"
#include "protobuf/status.h"
#include "strategy/script/scriptstate.h"
#include "strategy/script/strategytype.h"
#include <QString>
#include <QStringList>
#include <memory>

class AbstractStrategyScript;
class DebugHelper;
class StrategyPrivate;
class Timer;
class QTimer;
class QTcpSocket;
class QUdpSocket;
namespace v8 {
    class Platform;
}
class InspectorHandler;
class CompilerRegistry;

class Strategy : public QObject
{
    Q_OBJECT

public:
    Strategy(const Timer *timer, StrategyType type, DebugHelper *helper, CompilerRegistry* registry,
             std::shared_ptr<GameControllerConnection> &gameControllerConnection, bool internalAutoref = false, bool isLogplayer = false);
    ~Strategy() override;
    Strategy(const Strategy&) = delete;
    Strategy& operator=(const Strategy&) = delete;
    void resetIsReplay() { m_scriptState.isReplay = false; }
    void setEnabled(bool enable) { m_isEnabled = enable; }
    void tryProcess();

signals:
    void gotCommand(const Command &command);
    void sendStatus(const Status &status);
    void sendStrategyCommands(bool blue, const QList<RobotCommandInfo> &commands, qint64 time);
    void sendHalt(bool blue);
    void startReadingStatus();

public slots:
    void handleStatus(const Status &status);
    void handleCommand(const Command &command);
    void sendMixedTeamInfo(const QByteArray &data);
    void sendNetworkRefereeCommand(const QByteArray &data);
    void handleRefereeHost(QString hostName);
    void setFlipped(bool flipped);

private slots:
    void process();
    void reload();
    void sendCommand(const Command &command);
    void loadStateChanged(amun::StatusStrategy::STATE state);

private:
    static void initV8();
    void loadScript(const QString &filename, const QString &entryPoint);
    void close();
    void triggerDebugger();
    void fail(const QString &error, const amun::UserInput &userInput = amun::UserInput());
    void setStrategyStatus(Status &status, amun::StatusStrategy::STATE state);
    Status takeStrategyDebugStatus();
    amun::DebugSource debugSource() const;
    void createDummyTeam();
    bool updateTeam(const robot::Team &team, StrategyType teamType);
    void handleRefboxReply(const QByteArray &data);
    world::State assembleWorldState();

private:
    StrategyPrivate * const m_p;
    const Timer *m_timer;
    AbstractStrategyScript *m_strategy;
    std::string m_geometryString;
    world::Geometry m_geometry;
    robot::Team m_team;
    Status m_debugStatus;
    const StrategyType m_type;
    ScriptState m_scriptState;

    QString m_filename;
    QString m_entryPoint;
    bool m_refboxControlEnabled;

    QTimer *m_idleTimer;
    QTimer *m_reloadTimer;
    bool m_autoReload;
    bool m_strategyFailed;
    bool m_isEnabled;

    std::unique_ptr<QUdpSocket> m_udpSenderSocket;
    std::unique_ptr<QTcpSocket> m_refboxSocket;

    amun::UserInput m_lastMoveCommand;
    robot::Specs m_anyRobotSpec;

    qint32 m_refboxReplyLength;
    QByteArray m_refboxReplyPartialPacket;
    const bool m_isInLogplayer;

    CompilerRegistry* m_compilerRegistry;

    std::shared_ptr<GameControllerConnection> m_gameControllerConnection;

#ifdef V8_FOUND
    static std::unique_ptr<v8::Platform> static_platform;
#endif
};

#endif // STRATEGY_H
