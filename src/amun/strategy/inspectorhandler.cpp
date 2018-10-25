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

#include "inspectorhandler.h"

#include <QTcpSocket>
#include <functional>

#include "websocketprotocol.h"
#include "typescript.h"

using namespace v8_inspector;
using namespace v8;

// general helper functions
QString stringViewToQString(StringView view)
{
    if (view.length() == 0) {
        return "";
    }
    if (view.is8Bit()) {
        return QString::fromUtf8(reinterpret_cast<const char*>(view.characters8()),
                                view.length());
    }
    return QString::fromUtf16(reinterpret_cast<const unsigned short*>(view.characters16()),
                              view.length());
}

StringView qStringToStringView(const QString &s)
{
    QByteArray d = s.toUtf8();
    return StringView((uint8_t*)d.data(), d.length());
}

// ChannelImpl
ChannelImpl::ChannelImpl(std::shared_ptr<QTcpSocket> &socket) : m_socket(socket) { }

void ChannelImpl::sendResponse(int callId, std::unique_ptr<v8_inspector::StringBuffer> message) {
    QString content = stringViewToQString(message->string());
    qDebug() <<"Response: "<<content;
    QByteArray d = stringViewToQString(message->string()).toUtf8();
    std::vector<char> data(d.begin(), d.end());
    std::vector<char> toSend = encode_frame_hybi17(data);
    m_socket->write(toSend.data(), toSend.size());
    m_socket->flush();
}

void ChannelImpl::sendNotification(std::unique_ptr<v8_inspector::StringBuffer> message) {
    QString content = stringViewToQString(message->string());
    QByteArray d = stringViewToQString(message->string()).toUtf8();
    std::vector<char> data(d.begin(), d.end());
    std::vector<char> toSend = encode_frame_hybi17(data);
    m_socket->write(toSend.data(), toSend.size());
    m_socket->flush();
}

void ChannelImpl::flushProtocolNotifications() {
    m_socket->flush();
}


class RaInspectorClient : public V8InspectorClient {
public:
    explicit RaInspectorClient(Isolate *isolate, const Persistent<Context> &context, std::function<void()> messageLoop, Typescript *strategy) :
        m_inspector(V8Inspector::create(isolate, this)),
        m_strategy(strategy),
        m_isolate(isolate)
    {
        m_messageLoop = messageLoop;

        m_context.Reset(isolate, context);
    }

    std::unique_ptr<v8_inspector::V8InspectorSession> connect(V8Inspector::Channel *channel)
    {
        auto result = m_inspector->connect(1, channel, StringView());

        HandleScope handleScope(m_isolate);
        Local<Context> c = Local<Context>::New(m_isolate, m_context);
        V8ContextInfo info(c, 1, StringView());
        info.auxData = StringView(qStringToStringView("{\"isDefault\":true}"));
        m_inspector->contextCreated(info);
        return result;
    }

    void sendPauseSimulator(bool pause) {
        Command command(new amun::Command);
        amun::PauseSimulatorReason reason = amun::DebugBlueStrategy;
        switch (m_strategy->getStrategyType()) {
        case StrategyType::BLUE:
            reason = amun::DebugBlueStrategy;
            break;
        case StrategyType::YELLOW:
            reason = amun::DebugYellowStrategy;
            break;
        case StrategyType::AUTOREF:
            reason = amun::DebugAutoref;
            break;
        }
        command->mutable_pause_simulator()->set_reason(reason);
        command->mutable_pause_simulator()->set_pause(pause);
        m_strategy->sendCommand(command);
    }

    virtual void runMessageLoopOnPause(int) override {
        m_strategy->disableTimeoutOnce();
        sendPauseSimulator(true);

        m_runMessageLoop = true;
        while (m_runMessageLoop) {
            m_messageLoop();
        }
    }

    virtual void quitMessageLoopOnPause() override {
        m_runMessageLoop = false;
        sendPauseSimulator(false);
    }

    virtual v8::Local<v8::Context> ensureDefaultContextInGroup(
        int contextGroupId) {
      return Local<Context>::New(m_isolate, m_context);
    }

    virtual void consoleAPIMessage(int contextGroupId,
                                   v8::Isolate::MessageErrorLevel level,
                                   const StringView& message,
                                   const StringView& url, unsigned lineNumber,
                                   unsigned columnNumber, V8StackTrace*) {
        qDebug() <<"Console message: "<<stringViewToQString(message)<<stringViewToQString(url)<<lineNumber;
    }

private:
    std::unique_ptr<V8Inspector> m_inspector;
    bool m_runMessageLoop = false;
    std::function<void()> m_messageLoop;
    Typescript *m_strategy;
    Isolate *m_isolate;
    Persistent<Context> m_context;
};

InspectorHandler::InspectorHandler(Typescript *strategy, QObject *parent) :
    QObject(parent)
{
    QByteArray idData;
    for (int i = 0;i<32;i++) {
        idData.append(qrand() % 256);
    }
    m_id = QString(idData.toBase64());

    m_inspectorClient = new RaInspectorClient(strategy->getIsolate(), strategy->getContext(), [&]() {
        m_socket->waitForReadyRead();
        readData();
    }, strategy);
    m_channel.reset(new ChannelImpl(m_socket));
    m_session = m_inspectorClient->connect(m_channel.get());
}

void InspectorHandler::setSocket(QTcpSocket *socket)
{
    m_socket.reset(socket);
    m_socket->setParent(this);
    // TODO: read and handle any data that came in inbetween disconnect and connect

    connect(socket, SIGNAL(readyRead()), this, SLOT(readData()));
}

void InspectorHandler::readData()
{
    QByteArray data = m_socket->readAll();

    std::vector<char> buffer(data.begin(), data.end());
    do {
        int bytes_consumed = 0;
        std::vector<char> output;
        bool compressed = false;

        ws_decode_result r =  decode_frame_hybi17(buffer, true, &bytes_consumed, &output, &compressed);
        if (compressed || r == FRAME_ERROR) {
            qDebug() <<"error";
            bytes_consumed = 0;
        } else if (r == FRAME_CLOSE) {
            qDebug() <<"Close";
            bytes_consumed = 0;
            m_socket->close();
            deleteLater();
            break;
        } else if (r == FRAME_OK) {
            qDebug() <<"Nachricht: "<<QString::fromUtf8(output.data(), output.size());
            StringView message((uint8_t*)output.data(), output.size());
            m_session->dispatchProtocolMessage(message);
        }
        buffer.erase(buffer.begin(), buffer.begin() + bytes_consumed);
    } while (buffer.size() > 0);
}
