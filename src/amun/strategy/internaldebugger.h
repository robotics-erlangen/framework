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

#ifndef INTERNALDEBUGGER_H
#define INTERNALDEBUGGER_H

#include "inspectorholder.h"

#include <v8.h>

class Typescript;

class InternalDebugger : public AbstractInspectorHandler
{
public:
    InternalDebugger(v8::Isolate *isolate, Typescript *strategy);
    void setFunctions(v8::Local<v8::Function> &responseCallback, v8::Local<v8::Function> &notificationCallback,
                      v8::Local<v8::Function> &messageLoop);
    void clearFunctions();
    void messageLoop() override;
    void inspectorResponse(QString content) override;
    void inspectorNotification(QString content) override;
    bool isConnected() const { return m_hasFunctions; }

private:
    void handleStringContent(QString content, v8::Persistent<v8::Function> &function);

private:
    v8::Isolate *m_isolate;
    Typescript *m_strategy;
    bool m_hasFunctions;
    v8::Persistent<v8::Function> m_responseCallback;
    v8::Persistent<v8::Function> m_notificationCallback;
    v8::Persistent<v8::Function> m_messageLoop;
};

#endif // INTERNALDEBUGGER_H
