#include "strategyreplayhelper.h"
#include "strategy.h"

// BlockingStrategyReplay
BlockingStrategyReplay::BlockingStrategyReplay(Strategy * strategy, int size) :
    cacheSize(size) {
    connect(strategy, SIGNAL(startReadingStatus()), this, SLOT(strategyExecute()), Qt::DirectConnection);
    connect(strategy, SIGNAL(sendStatus(Status)), this, SIGNAL(gotStatus(Status)));
    connect(this, SIGNAL(gotStatusForStrategy(Status)), strategy, SLOT(handleStatus(Status)));
}

void BlockingStrategyReplay::strategyExecute() {
    conditionMutex.lock();
    cacheCounter--;
    if (cacheCounter < cacheSize) {
        conditionMutex.unlock();
        waitCondition.wakeOne();
    }
}

void BlockingStrategyReplay::handleStatus(const Status &status) {
    conditionMutex.lock();
    if (cacheCounter >= cacheSize) {
        waitCondition.wait(&conditionMutex);
    }
    cacheCounter++;
    conditionMutex.unlock();
    emit gotStatusForStrategy(status);
}

// FeedbackStrategyReplay
FeedbackStrategyReplay::FeedbackStrategyReplay(Strategy * strategy) {
    connect(this, SIGNAL(gotStatus(Status)), strategy, SLOT(handleStatus(Status)));
    connect(strategy, SIGNAL(gotStatus(Status)), this, SLOT(handleStrategyStatus(Status)));
}

Status FeedbackStrategyReplay::executeWithFeedback(const Status &orig) {
    conditionMutex.lock();
    emit gotStatus(orig);
    waitCondition.wait(&conditionMutex);
    Status status(new amun::Status(*lastStatus));
    conditionMutex.unlock();
    return status;
}

void FeedbackStrategyReplay::handleStrategyStatus(const Status &status) {
    conditionMutex.lock();
    lastStatus->CopyFrom(*status);
    conditionMutex.unlock();
    waitCondition.wakeOne();
}
