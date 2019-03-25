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
