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

#include "inspectorholder.h"

#include <assert.h>

using namespace v8;
using namespace v8_inspector;

// general helper functions
QString stringViewToQString(StringView view)
{
    if (view.length() == 0) {
        return "";
    }
    if (view.is8Bit()) {
        return QString::fromUtf8(reinterpret_cast<const char*>(view.characters8()), view.length());
    }
    return QString::fromUtf16(reinterpret_cast<const unsigned short*>(view.characters16()), view.length());
}

// InspectorHolder
InspectorHolder::InspectorHolder(v8::Isolate *isolate, const v8::Global<v8::Context> &context) :
    m_client(isolate, context),
    m_inspector(V8Inspector::create(isolate, &m_client)),
    m_session(m_inspector->connect(1, &m_channel, StringView()))
{
    HandleScope handleScope(isolate);
    Local<Context> c = Local<Context>::New(isolate, context);
    V8ContextInfo info(c, 1, StringView());
    QByteArray auxData = QString("{\"isDefault\":true}").toUtf8();
    info.auxData = StringView(reinterpret_cast<const uint8_t*>(auxData.data()), auxData.length());
    m_inspector->contextCreated(info);
}

void InspectorHolder::setInspectorHandler(std::unique_ptr<AbstractInspectorHandler> handler)
{
    handler->setFunctions([this](uint8_t *message, int length) { m_session->dispatchProtocolMessage(StringView(message, length)); },
        [this]() { m_client.quitMessageLoopOnPause(); });


    m_inspectorHandler = std::move(handler);
    m_channel.setInspectorHandler(m_inspectorHandler.get());
    m_client.setInspectorHandler(m_inspectorHandler.get());
}

void InspectorHolder::breakProgram(QString reason)
{
    std::string stdReason = reason.toStdString();
    StringView t = StringView((uint8_t*)stdReason.c_str(), reason.length());
    m_session->breakProgram(t, t);
}


// DefaultChannel
void InspectorHolder::DefaultChannel::sendResponse(int, std::unique_ptr<v8_inspector::StringBuffer> message) {
    assert(m_inspectorHandler);
    if (m_isIgnoringMessages == 0) {
        QString content = stringViewToQString(message->string());
        m_inspectorHandler->inspectorResponse(content);
    }
}

void InspectorHolder::DefaultChannel::sendNotification(std::unique_ptr<v8_inspector::StringBuffer> message) {
    assert(m_inspectorHandler);
    if (m_isIgnoringMessages == 0) {
        QString content = stringViewToQString(message->string());
        m_inspectorHandler->inspectorNotification(content);
    }
}

void InspectorHolder::DefaultChannel::flushProtocolNotifications()
{
    assert(m_inspectorHandler);
    m_inspectorHandler->inspectorFlush();
}


// DefaultInspectorClient
InspectorHolder::DefaultInspectorClient::DefaultInspectorClient(Isolate *isolate, const Global<Context> &context) :
    m_isolate(isolate)
{
    m_context.Reset(isolate, context);
}

void InspectorHolder::DefaultInspectorClient::runMessageLoopOnPause(int)
{
    assert(m_inspectorHandler);
    m_inspectorHandler->startMessageLoopOnPause();
    m_runMessageLoop = true;
    while (m_runMessageLoop) {
        m_inspectorHandler->messageLoop();
    }
    m_inspectorHandler->endMessageLoopOnPause();
}

void InspectorHolder::DefaultInspectorClient::quitMessageLoopOnPause()
{
    assert(m_inspectorHandler);
    m_runMessageLoop = false;
}

v8::Local<v8::Context> InspectorHolder::DefaultInspectorClient::ensureDefaultContextInGroup(int)
{
    return Local<Context>::New(m_isolate, m_context);
}
