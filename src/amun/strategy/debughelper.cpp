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

#include "debughelper.h"

#include <QMutexLocker>

DebugHelper::DebugHelper(StrategyType strategy) : QObject(),
    m_strategy(strategy), m_queueEnabled(false)
{ }

void DebugHelper::sendOutput(const QString &line)
{
    Status status(new amun::Status);
    amun::DebugValues *debug = status->add_debug();
    debug->set_source(toDebugSource(m_strategy));
    debug->mutable_debugger_output()->set_line(line.toStdString());
    emit sendStatus(status);
}

void DebugHelper::handleCommand(const Command &command)
{
    const amun::CommandStrategy *strategyCmd = getOwnStrategyCommand(command);
    if (strategyCmd != nullptr) {
        if (strategyCmd->has_close() || strategyCmd->has_reload()) {
            clearAndDisableQueue();
        }
        if (strategyCmd->has_load() || strategyCmd->has_enable_debug()) {
            clearQueue();
        }
    }
    if (command->has_debugger_input()) {
        const amun::CommandDebuggerInput &input = command->debugger_input();
        const StrategyType strategy = fromDebuggerInput(input.strategy_type());
        if (strategy != m_strategy) {
            return;
        }

        if (input.has_queue_line()) {
            queueInput(QString::fromStdString(input.queue_line().line()));
        } else if (input.has_disable()) {
            clearAndDisableQueue();
        }
    }
}

// FIXME somehow avoid passing raw pointers...
const amun::CommandStrategy *DebugHelper::getOwnStrategyCommand(const Command &command)
{
    if (m_strategy == StrategyType::YELLOW && command->has_strategy_yellow()) {
        return &command->strategy_yellow();
    } else if (m_strategy == StrategyType::BLUE && command->has_strategy_blue()) {
        return &command->strategy_blue();
    } else if (m_strategy == StrategyType::AUTOREF && command->has_strategy_autoref()) {
        return &command->strategy_autoref();
    }
    return nullptr;
}

void DebugHelper::enableQueue()
{
    queueSetStatus(true);
}

void DebugHelper::clearAndDisableQueue()
{
    queueSetStatus(false);
    clearQueue();
}

void DebugHelper::clearQueue()
{
    QMutexLocker locker(&m_queueLock);
    m_queue.clear();
}

void DebugHelper::queueInput(QString line)
{
    QMutexLocker locker(&m_queueLock);
    m_queue.append(line);
    m_queueEnabled = true;
    m_condition.wakeAll();
}

void DebugHelper::queueSetStatus(bool isEnabled)
{
    QMutexLocker locker(&m_queueLock);
    m_queueEnabled = isEnabled;
    m_condition.wakeAll();
}

QString DebugHelper::takeInput()
{
    QMutexLocker locker(&m_queueLock);
    while (true) {
        if (!m_queueEnabled) {
            return QString();
        }
        if (!m_queue.isEmpty()) {
            return m_queue.takeFirst();
        }
        m_condition.wait(&m_queueLock);
    }
}

StrategyType DebugHelper::fromDebuggerInput(amun::DebuggerInputTarget target)
{
    switch (target) {
    case amun::DITStrategyYellow:
        return StrategyType::YELLOW;
    case amun::DITStrategyBlue:
        return StrategyType::BLUE;
    case amun::DITAutoref:
        return StrategyType::AUTOREF;
    default:
        // make the compiler happy
        return StrategyType::YELLOW;
    }
}

amun::DebugSource DebugHelper::toDebugSource(StrategyType strategy)
{
    switch (strategy) {
    case StrategyType::YELLOW:
        return amun::DebugSource::StrategyYellow;
    case StrategyType::BLUE:
        return amun::DebugSource::StrategyBlue;
    case StrategyType::AUTOREF:
        return amun::DebugSource::Autoref;
    default:
        // make the compiler happy
        return amun::DebugSource::StrategyYellow;
    }
}
