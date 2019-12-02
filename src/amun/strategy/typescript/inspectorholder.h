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

#ifndef INSPECTORHOLDER_H
#define INSPECTORHOLDER_H

#include "v8.h"
#include "v8-inspector.h"

#include <functional>
#include <memory>
#include <QString>

class AbstractInspectorHandler
{
public:
    virtual ~AbstractInspectorHandler() = default;
    virtual void startMessageLoopOnPause() {}
    virtual void endMessageLoopOnPause() {}
    virtual void messageLoop() {}
    virtual void inspectorResponse(QString content) {}
    virtual void inspectorNotification(QString content) {}
    virtual void inspectorFlush() {}

    void dispatchProtocolMessage(uint8_t *message, int length) { m_dispatchMessage(message, length); }
    void quitMessageLoopOnPause() { m_quitMessageLoop(); }

    void setFunctions(std::function<void(uint8_t*,int)> dispatch, std::function<void()> quit) {
        m_dispatchMessage = dispatch;
        m_quitMessageLoop = quit;
    }

private:
    std::function<void(uint8_t*,int)> m_dispatchMessage;
    std::function<void()> m_quitMessageLoop;
};

class InspectorHolder
{
public:
    InspectorHolder(v8::Isolate *isolate, const v8::Persistent<v8::Context> &context);
    void setInspectorHandler(AbstractInspectorHandler *handler);
    bool hasInspectorHandler() { return m_inspectorHandler != nullptr; }
    AbstractInspectorHandler *getInspectorHandler() { return m_inspectorHandler; }
    void setIsIgnoringMessages(bool ignore) { m_channel.setIsIgnoringMessages(ignore); }
    void breakProgram(QString reason);

private:
    class DefaultChannel : public v8_inspector::V8Inspector::Channel {
    public:
        void setInspectorHandler(AbstractInspectorHandler *handler) { m_inspectorHandler = handler; }
        void setIsIgnoringMessages(bool ignore)
        {
            if (ignore) {
                m_isIgnoringMessages++;
            } else {
                m_isIgnoringMessages--;
            }
        }
        virtual void sendResponse(int, std::unique_ptr<v8_inspector::StringBuffer> message) override;
        virtual void sendNotification(std::unique_ptr<v8_inspector::StringBuffer> message) override;
        virtual void flushProtocolNotifications() override;

    private:
        AbstractInspectorHandler *m_inspectorHandler;
        int m_isIgnoringMessages = 0;
    };

    class DefaultInspectorClient : public v8_inspector::V8InspectorClient {
    public:
        explicit DefaultInspectorClient(v8::Isolate *isolate, const v8::Persistent<v8::Context> &context);
        void setInspectorHandler(AbstractInspectorHandler *handler) { m_inspectorHandler = handler; }
        virtual void runMessageLoopOnPause(int) override;
        virtual void quitMessageLoopOnPause() override;
        virtual v8::Local<v8::Context> ensureDefaultContextInGroup(int) override;

    private:
        bool m_runMessageLoop;
        v8::Isolate *m_isolate;
        v8::Persistent<v8::Context> m_context;
        AbstractInspectorHandler *m_inspectorHandler;
    };

private:
    DefaultChannel m_channel;
    DefaultInspectorClient m_client;
    std::unique_ptr<v8_inspector::V8Inspector> m_inspector;
    std::unique_ptr<v8_inspector::V8InspectorSession> m_session;
    AbstractInspectorHandler *m_inspectorHandler;
};

#endif // INSPECTORHOLDER_H
