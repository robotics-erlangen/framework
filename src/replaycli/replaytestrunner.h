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

#ifndef REPLAYTESTRUNNER_H
#define REPLAYTESTRUNNER_H

#include <QObject>

#include "strategy/strategy.h"
#include "core/timer.h"

class CompilerRegistry;

Command createLoadCommand(bool asBlue, QString initScript, QString entryPoint, bool enablePerformanceMode);

class ReplayTestRunner : public QObject
{
    Q_OBJECT
public:
    explicit ReplayTestRunner(QString testFile, StrategyType type, CompilerRegistry *compilerRegistry);
    void runFinalReplayJudgement();

public slots:
    // this slot must be connected externally
    void handleOriginalStatus(const Status &status);

private slots:
    void handleTestStatus(const Status &status);

private:
    void handleStrategyStatus(const amun::StatusStrategy &strategy);

private:
    Timer m_timer;
    CompilerRegistry* m_compilerRegistry;
    std::shared_ptr<StrategyGameControllerMediator> m_gameControllerConnection;
    Strategy m_testStrategy;
    int m_exitCode;
    StrategyType m_type;
    // used to create the last final judgement packet, since an initialized game state is needed. The content is not relevant
    amun::GameState m_firstGameState;
    bool m_firstGameStateCopied;
};

#endif // REPLAYTESTRUNNER_H
