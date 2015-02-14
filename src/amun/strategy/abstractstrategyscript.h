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

#include <QObject>
#include <QString>
#include <QStringList>
#include "protobuf/gamestate.pb.h"
#include "protobuf/world.pb.h"
#include "protobuf/robot.pb.h"
#include "protobuf/debug.pb.h"
#include "protobuf/command.h"
#include "protobuf/userinput.pb.h"
#include "strategytype.h"

class Timer;

class AbstractStrategyScript : public QObject
{
    Q_OBJECT
public:
    virtual ~AbstractStrategyScript() {}

    // simple factory to allow for different strategy handlers
    static bool canHandle(const QString filename);
    static AbstractStrategyScript* createStrategy(const Timer *timer, StrategyType type, bool debugEnabled);

    // return true on success, if false is returned the error msg can be retrieved via errorMsg()
    // loadScript and process MUST NOT be called anymore after an error was thrown!
    // must only be called once
    virtual bool loadScript(const QString filename, const QString entryPoint, const world::Geometry &geometry, const robot::Team &team) = 0;
    // must only be called after loadScript was executed successfully
    virtual bool process(double &pathPlanning, const world::State &worldState, const amun::GameState &refereeState, const amun::UserInput &userInput) = 0;

    // getter functions
    QString errorMsg() const { return m_errorMsg; }
    // may be polled after is call to loadScript / process
    const amun::DebugValues &debugValues() const { return m_debug; }

    QStringList entryPoints() const { return m_entryPoints; }
    QString entryPoint() const { return m_entryPoint; }
    QString name() const { return m_name; }

protected:
    void clearDebug();

signals:
    // wrapper may listen to reload request, but doesn't have to
    void requestReload();
    void gotCommand(const Command &command);
    void sendStrategyCommand(bool blue, uint generation, uint id, const QByteArray &data, qint64 time);

protected:
    QStringList m_entryPoints;
    QString m_entryPoint;
    QString m_name;

    QString m_errorMsg;
    amun::DebugValues m_debug;
};

#endif // ABSTRACTSTRATEGYSCRIPT_H
