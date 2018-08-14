/***************************************************************************
 *   Copyright 2018 Andreas Wendler                                        *
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

#ifndef TYPESCRIPT_H
#define TYPESCRIPT_H

#include "abstractstrategyscript.h"
#include "v8.h"

#include <QString>
#include <QMap>

class Typescript : public AbstractStrategyScript
{
private:
    Typescript(const Timer *timer, StrategyType type, bool debugEnabled, bool refboxControlEnabled);
public:
    static bool canHandle(const QString &filename);
    static AbstractStrategyScript* createStrategy(const Timer *timer, StrategyType type, bool debugEnabled, bool refboxControlEnabled);
    ~Typescript() override;
    void addPathTime(double time);

    bool loadScript(const QString &filename, const QString &entryPoint, const world::Geometry &geometry, const robot::Team &team) override;
    bool process(double &pathPlanning, const world::State &worldState, const amun::GameState &refereeState, const amun::UserInput &userInput) override;

private:
    static void performRequire(const v8::FunctionCallbackInfo<v8::Value>& args);
    static void defineModule(const v8::FunctionCallbackInfo<v8::Value> &args);
    void registerDefineFunction(v8::Local<v8::ObjectTemplate> global);
    bool loadModule(QString name);

private:
    v8::Isolate* m_isolate;
    // TODO: global instead of persistent?
    v8::Persistent<v8::Context> m_context;
    v8::Persistent<v8::Function> m_function;
    double m_totalPathTime;

    QMap<QString, v8::Global<v8::Value>*> m_requireCache;
    v8::Persistent<v8::FunctionTemplate> m_requireTemplate;
    QString m_currentExecutingModule;
};

#endif // TYPESCRIPT_H
