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

#ifndef INSPECTORHANDLER_H
#define INSPECTORHANDLER_H

#include <QObject>
#include <QString>
#include <QTcpSocket>
#include <memory>
#include <QThread>
#include <QMutex>

// TODO: can we avoid including everything??
#include "v8.h"
#include "v8-inspector.h"

class Typescript;
class RaInspectorClient;

class ChannelImpl : public v8_inspector::V8Inspector::Channel {
public:
    ChannelImpl(std::shared_ptr<QTcpSocket> &socket);
    virtual void sendResponse(int callId, std::unique_ptr<v8_inspector::StringBuffer> message) override;
    virtual void sendNotification(std::unique_ptr<v8_inspector::StringBuffer> message) override;
    virtual void flushProtocolNotifications() override;

private:
    std::shared_ptr<QTcpSocket> &m_socket;
};


class RaInspectorClient : public v8_inspector::V8InspectorClient {
public:
    explicit RaInspectorClient(v8::Isolate *isolate, const v8::Persistent<v8::Context> &context, std::function<void()> messageLoop, Typescript *strategy);
    std::unique_ptr<v8_inspector::V8InspectorSession> connect(v8_inspector::V8Inspector::Channel *channel);
    void sendPauseSimulator(bool pause);
    virtual void runMessageLoopOnPause(int) override;
    virtual void quitMessageLoopOnPause() override;
    virtual v8::Local<v8::Context> ensureDefaultContextInGroup(int contextGroupId) override;
    virtual void consoleAPIMessage(int contextGroupId,
                                   v8::Isolate::MessageErrorLevel level,
                                   const v8_inspector::StringView& message,
                                   const v8_inspector::StringView& url, unsigned lineNumber,
                                   unsigned columnNumber, v8_inspector::V8StackTrace*) override;

private:
    std::unique_ptr<v8_inspector::V8Inspector> m_inspector;
    bool m_runMessageLoop = false;
    std::function<void()> m_messageLoop;
    Typescript *m_strategy;
    v8::Isolate *m_isolate;
    v8::Persistent<v8::Context> m_context;
};


// runs in each strategy thread
// represents that strategy and its isolate
// don't create more than one

// handles websocket content and relays it to the v8 inspector
class InspectorHandler : public QObject
{
    Q_OBJECT
public:
    explicit InspectorHandler(Typescript *strategy, QObject *parent = nullptr);
    QString getId() const { return m_id; }

signals:
    void frontendDisconnected();

public slots:
    void setSocket(QTcpSocket *socket);

private slots:
    void readData();

private:
    QString m_id;
    std::shared_ptr<QTcpSocket> m_socket;
    std::unique_ptr<RaInspectorClient> m_inspectorClient;
    std::unique_ptr<v8_inspector::V8InspectorSession> m_session;
    std::unique_ptr<ChannelImpl> m_channel;
};

#endif // INSPECTORHANDLER_H
