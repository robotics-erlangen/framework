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
    std::shared_ptr<GameControllerConnection> m_gameControllerConnection;
    Strategy m_testStrategy;
    int m_exitCode;
    StrategyType m_type;
    // used to create the last final judgement packet, since an initialized game state is needed. The content is not relevant
    amun::GameState m_firstGameState;
    bool m_firstGameStateCopied;
};

#endif // REPLAYTESTRUNNER_H
