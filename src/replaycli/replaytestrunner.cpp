#include "gamecontroller/gamecontrollerconnection.h"
#include "replaytestrunner.h"
#include "testtools/testtools.h"
#include <QCoreApplication>
#include <iostream>

Command createLoadCommand(bool asBlue, QString initScript, QString entryPoint, bool disablePerformanceMode)
{
    Command command(new amun::Command);
    amun::CommandStrategyLoad *load;
    amun::CommandStrategy *strategyCommand;
    if (asBlue) {
        load = command->mutable_strategy_blue()->mutable_load();
        strategyCommand = command->mutable_strategy_blue();
    } else {
        load = command->mutable_strategy_yellow()->mutable_load();
        strategyCommand = command->mutable_strategy_yellow();
    }
    load->set_filename(initScript.toStdString());
    load->set_entry_point(entryPoint.toStdString());

    if (disablePerformanceMode) {
        strategyCommand->set_performance_mode(false);
    }
    return command;
}

ReplayTestRunner::ReplayTestRunner(QString testFile, StrategyType type, CompilerRegistry* compilerRegistry) :
    m_compilerRegistry(compilerRegistry),
    m_gameControllerConnection(new GameControllerConnection(false)),
    m_testStrategy(&m_timer, type, nullptr, m_compilerRegistry, m_gameControllerConnection),
    m_exitCode(255),
    m_type(type),
    m_firstGameStateCopied(false)
{
    m_timer.setTime(0, 1.0);
    connect(&m_testStrategy, SIGNAL(sendStatus(Status)), this, SLOT(handleTestStatus(Status)));
    // use the replay strategy type, as the replay information is only present in the given color
    m_testStrategy.handleCommand(createLoadCommand(type == StrategyType::BLUE, testFile, "", true));
}

void ReplayTestRunner::runFinalReplayJudgement()
{
    Status emptyStatus(new amun::Status());
    if (m_type == StrategyType::BLUE) {
        emptyStatus->set_blue_running(true);
    } else {
        emptyStatus->set_yellow_running(true);
    }
    // so that the execution state is initialized
    emptyStatus->mutable_execution_state()->set_time(0);
    Q_ASSERT(m_firstGameStateCopied);
    emptyStatus->mutable_execution_game_state()->CopyFrom(m_firstGameState);
    m_testStrategy.handleStatus(emptyStatus);
}

void ReplayTestRunner::handleOriginalStatus(const Status &status)
{
     // faster than just checking IsInitialized
    if (!m_firstGameStateCopied && status->execution_game_state().IsInitialized()) {
        m_firstGameState.CopyFrom(status->execution_game_state());
        m_firstGameStateCopied = true;
    }

    // check if original strategy crashed
    if (status->has_status_strategy()) {
        const auto& strategy = status->status_strategy().status();
        if (strategy.state() == amun::StatusStrategy::FAILED) {
            // dump log output from that crash
            std::cout <<"Strategy to test failed:"<<std::endl;
            auto expectedSource = m_type == StrategyType::BLUE ? amun::StrategyBlue : amun::StrategyYellow;
            for (const auto& debug: status->debug()) {
                if (debug.source() == expectedSource) {
                    TestTools::dumpLog(debug, m_exitCode);
                }
            }
        }
    }

    // for example a strategy load packet
    if (!status->has_time() || !status->has_execution_state()) {
        return;
    }
    m_testStrategy.handleStatus(status);
}

void ReplayTestRunner::handleStrategyStatus(const amun::StatusStrategy &strategy)
{
    if (strategy.state() == amun::StatusStrategy::FAILED) {
        if (m_exitCode != 0) {
            exit(m_exitCode);
        } else {
            exit(1);
        }
    }
}

void ReplayTestRunner::handleTestStatus(const Status &status)
{
    auto expectedSource = m_type == StrategyType::BLUE ? amun::StrategyBlue : amun::StrategyYellow;
    for (const auto& debug: status->debug()) {
        if (debug.source() == expectedSource) {
            TestTools::dumpLog(debug, m_exitCode);
        }
    }

    if (status->has_status_strategy()) {
        const auto& strategy = status->status_strategy().status();
        handleStrategyStatus(strategy);
    }
}
