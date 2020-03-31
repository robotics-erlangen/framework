/***************************************************************************
 *   Copyright 2020 Andreas Wendler                                        *
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

#include "strategyreplayhelper.h"
#include "strategy.h"

// BlockingStrategyReplay
BlockingStrategyReplay::BlockingStrategyReplay(Strategy * strategy, int size) :
    cacheSize(size)
{
    connect(strategy, SIGNAL(startReadingStatus()), this, SLOT(strategyExecute()), Qt::DirectConnection);
    connect(strategy, SIGNAL(sendStatus(Status)), this, SIGNAL(gotStatus(Status)));
    connect(this, SIGNAL(gotStatusForStrategy(Status)), strategy, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotCommand(Command)), strategy, SLOT(handleCommand(Command)));
}

void BlockingStrategyReplay::strategyExecute()
{
    conditionMutex.lock();
    cacheCounter--;
    if (cacheCounter < cacheSize) {
        conditionMutex.unlock();
        waitCondition.wakeOne();
    } else {
        conditionMutex.unlock();
    }
}

void BlockingStrategyReplay::handleStatus(const Status &status)
{
    conditionMutex.lock();
    if (cacheCounter >= cacheSize) {
        waitCondition.wait(&conditionMutex);
    }
    cacheCounter++;
    conditionMutex.unlock();
    emit gotStatusForStrategy(status);
}

// FeedbackStrategyReplay
FeedbackStrategyReplay::FeedbackStrategyReplay(Strategy * strategy)
{
    connect(this, SIGNAL(gotStatus(Status)), strategy, SLOT(handleStatus(Status)));
    connect(strategy, SIGNAL(gotStatus(Status)), this, SLOT(handleStrategyStatus(Status)));
}

Status FeedbackStrategyReplay::executeWithFeedback(const Status &orig)
{
    conditionMutex.lock();
    emit gotStatus(orig);
    waitCondition.wait(&conditionMutex);
    Status status(new amun::Status(*lastStatus));
    conditionMutex.unlock();
    return status;
}

void FeedbackStrategyReplay::handleStrategyStatus(const Status &status)
{
    conditionMutex.lock();
    lastStatus->CopyFrom(*status);
    conditionMutex.unlock();
    waitCondition.wakeOne();
}
