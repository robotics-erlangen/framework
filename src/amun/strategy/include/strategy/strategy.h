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

#ifndef STRATEGY_H
#define STRATEGY_H

#include "protobuf/command.h"
#include "protobuf/robotcommand.h"
#include "protobuf/status.h"
#include "strategytype.h"
#include <QString>
#include <QStringList>

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
class InspectorServer;
class InspectorHandler;

class Strategy : public QObject
{
    Q_OBJECT

public:
    Strategy(const Timer *timer, StrategyType type, DebugHelper *helper, bool internalAutoref = false, bool isLogplayer = false);
    ~Strategy() override;
    void resetIsReplay() { m_isReplay = false; }
    void setEnabled(bool enable) { m_isEnabled = enable; }

signals:
    void gotCommand(const Command &command);
    void sendStatus(const Status &status);
    void sendStrategyCommand(bool blue, uint generation, uint id, const RobotCommand &command, qint64 time);
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

private:
    StrategyPrivate * const m_p;
    const Timer *m_timer;
    AbstractStrategyScript *m_strategy;
    std::string m_geometryString;
    world::Geometry m_geometry;
    robot::Team m_team;
    Status m_status;
    const StrategyType m_type;
    QStringList m_selectedOptions;

    QString m_filename;
    QString m_entryPoint;
    bool m_debugEnabled;
    bool m_refboxControlEnabled;

    QTimer *m_idleTimer;
    QTimer *m_reloadTimer;
    bool m_autoReload;
    bool m_strategyFailed;
    bool m_isEnabled;

    QUdpSocket *m_udpSenderSocket;
    QTcpSocket *m_refboxSocket;

    amun::UserInput m_lastMoveCommand;
    bool m_isReplay;
    DebugHelper *m_debugHelper;
    bool m_isInternalAutoref;
    bool m_isPerformanceMode;
    bool m_isFlipped;
    robot::Specs m_anyRobotSpec;

    qint32 m_refboxReplyLength;
    QByteArray m_refboxReplyPartialPacket;
    bool m_isInLogplayer;

    static std::unique_ptr<v8::Platform> static_platform;
    static std::unique_ptr<InspectorServer> inspectorServer;
};

#endif // STRATEGY_H
