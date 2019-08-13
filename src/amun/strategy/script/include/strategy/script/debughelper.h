/***************************************************************************
 *   Copyright 2017 Michael Eischer                                        *
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

#ifndef DEBUGHELPER_H
#define DEBUGHELPER_H

#include <QList>
#include <QMutex>
#include <QObject>
#include <QString>
#include <QWaitCondition>
#include "strategytype.h"
#include "protobuf/command.h"
#include "protobuf/status.h"

class DebugHelper : public QObject
{
    Q_OBJECT
public:
    explicit DebugHelper(StrategyType strategy);

    void enableQueue();
    QString takeInput();
    void sendOutput(const QString &line);
signals:
    void sendStatus(const Status &status);

public slots:
    void handleCommand(const Command &command);

private:
    void queueInput(QString line);
    void clearAndDisableQueue();
    void clearQueue();
    void queueSetStatus(bool isEnabled);

    StrategyType fromDebuggerInput(amun::DebuggerInputTarget target);
    amun::DebugSource toDebugSource(StrategyType strategy);

    const amun::CommandStrategy *getOwnStrategyCommand(const Command &command);

    const StrategyType m_strategy;

    QWaitCondition m_condition;
    QMutex m_queueLock;
    QList<QString> m_queue;
    bool m_queueEnabled;
};

#endif // DEBUGHELPER_H
