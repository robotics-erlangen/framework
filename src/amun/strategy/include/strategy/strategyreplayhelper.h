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

#ifndef STRATEGYREPLAYHELPER_H
#define STRATEGYREPLAYHELPER_H

#include <QMutex>
#include <QWaitCondition>
#include <QObject>

#include "protobuf/status.h"
#include "protobuf/command.h"

class Strategy;

class BlockingStrategyReplay : public QObject {
    Q_OBJECT
public:
    BlockingStrategyReplay(Strategy * strategy, int size = 5);

signals:
    void gotStatus(const Status &status);
    void gotCommand(const Command &command);
    void gotStatusForStrategy(const Status &status);

public slots:
    void strategyExecute();
    void handleStatus(const Status &status);

private:
    const int cacheSize;
    int cacheCounter = 0;

    QMutex conditionMutex;
    QWaitCondition waitCondition;
};

class FeedbackStrategyReplay : public QObject {
    Q_OBJECT
public:
    FeedbackStrategyReplay(Strategy * strategy);

    Status executeWithFeedback(const Status &orig);

signals:
    void gotStatus(const Status &status);

private slots:
    void handleStrategyStatus(const Status &status);

private:
    Status lastStatus;
    QMutex conditionMutex;
    QWaitCondition waitCondition;
};

#endif // STRATEGYREPLAYHELPER_H
