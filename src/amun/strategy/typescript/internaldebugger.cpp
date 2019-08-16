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

#include "internaldebugger.h"
#include "typescript.h"
#include "v8utility.h"

using namespace v8;
using namespace v8helper;

template <typename T> inline void USE(T&&) {}

InternalDebugger::InternalDebugger(Isolate *isolate, Typescript *strategy) :
    m_isolate(isolate),
    m_strategy(strategy),
    m_hasFunctions(false)
{ }

void InternalDebugger::setFunctions(v8::Local<v8::Function> &responseCallback, v8::Local<v8::Function> &notificationCallback,
                  v8::Local<v8::Function> &messageLoop)
{
    m_responseCallback.Reset(m_isolate, responseCallback);
    m_notificationCallback.Reset(m_isolate, notificationCallback);
    m_messageLoop.Reset(m_isolate, messageLoop);
    m_hasFunctions = true;
}

void InternalDebugger::clearFunctions()
{
    m_hasFunctions = false;
    m_responseCallback.Reset();
    m_notificationCallback.Reset();
    m_messageLoop.Reset();
}

void InternalDebugger::messageLoop()
{
    if (!m_hasFunctions) {
        return;
    }
    m_strategy->disableTimeoutOnce();
    Local<Context> context = m_isolate->GetCurrentContext();
    Local<Function> function = Local<Function>::New(m_isolate, m_messageLoop);
    USE(function->Call(context, context->Global(), 0, nullptr));
}

void InternalDebugger::inspectorResponse(QString content)
{
    handleStringContent(content, m_responseCallback);
}

void InternalDebugger::inspectorNotification(QString content)
{
    handleStringContent(content, m_notificationCallback);
}

void InternalDebugger::handleStringContent(QString content, v8::Persistent<v8::Function> &function)
{
    if (!m_hasFunctions) {
        return;
    }
    m_strategy->disableTimeoutOnce();
    Local<String> contentString = v8string(m_isolate, content);
    Local<Value> arguments[] = {contentString};
    Local<Context> context = m_isolate->GetCurrentContext();
    Local<Function> localFunction = Local<Function>::New(m_isolate, function);
    USE(localFunction->Call(context, context->Global(), 1, arguments));
}
