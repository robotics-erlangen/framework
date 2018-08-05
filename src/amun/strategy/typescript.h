#ifndef TYPESCRIPT_H
#define TYPESCRIPT_H

#include "abstractstrategyscript.h"
#include "v8.h"

#include <QString>

class Typescript : public AbstractStrategyScript
{
private:
    Typescript(const Timer *timer, StrategyType type, bool debugEnabled, bool refboxControlEnabled);
public:
    static bool canHandle(const QString &filename);
    static AbstractStrategyScript* createStrategy(const Timer *timer, StrategyType type, bool debugEnabled, bool refboxControlEnabled);
    ~Typescript() override;

    bool loadScript(const QString &filename, const QString &entryPoint, const world::Geometry &geometry, const robot::Team &team) override;
    bool process(double &pathPlanning, const world::State &worldState, const amun::GameState &refereeState, const amun::UserInput &userInput) override;

private:
    v8::Isolate* m_isolate;
    v8::Persistent<v8::Context> m_context;
    v8::Persistent<v8::Function> m_function;
};

#endif // TYPESCRIPT_H
