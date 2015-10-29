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
#include "protobuf/status.h"
#include "strategytype.h"
#include <QString>
#include <QHostAddress>

class QTimer;
class Timer;
class AbstractStrategyScript;
class QUdpSocket;

class Strategy : public QObject
{
    Q_OBJECT

public:
    Strategy(const Timer *timer, StrategyType type);
    ~Strategy();

signals:
    void gotCommand(const Command &command);
    void sendStatus(const Status &status);
    void sendStrategyCommand(bool blue, uint generation, uint id, const QByteArray &data, qint64 time);
    void sendHalt(bool blue);

public slots:
    void handleStatus(const Status &status);
    void handleCommand(const Command &command);
    void sendMixedTeamInfo(const QByteArray &data);
    void sendNetworkRefereeCommand(const QByteArray &data);

private slots:
    void process();
    void reload();
    void sendCommand(Command command);

private:
    void loadScript(const QString filename, const QString entryPoint);
    void close();
    void fail(const QString error);
    void setStrategyStatus(Status status, amun::StatusStrategy::STATE state);
    void copyDebugValues(Status status);
    amun::DebugSource debugSource() const;

private:
    const Timer *m_timer;
    AbstractStrategyScript *m_strategy;
    std::string m_geometryString;
    world::Geometry m_geometry;
    robot::Team m_team;
    Status m_status;
    const StrategyType m_type;

    QString m_filename;
    QString m_entryPoint;
    bool m_debugEnabled;

    QTimer *m_idleTimer;
    QTimer *m_reloadTimer;
    bool m_autoReload;
    bool m_strategyFailed;

    QUdpSocket *m_udpSenderSocket;
    QHostAddress m_mixedTeamHost;
    quint16 m_mixedTeamPort;
    QByteArray m_mixedTeamData;
    QByteArray m_networkRefereeCommand;
};

#endif // STRATEGY_H
