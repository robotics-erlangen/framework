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

using namespace v8_inspector;
using namespace v8;

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

class RaInspectorClient : public V8InspectorClient {
public:
    explicit RaInspectorClient(Isolate *isolate, Persistent<Context> &context, std::function<void()> messageLoop) :
        m_inspector(V8Inspector::create(isolate, this))
    {
        m_messageLoop = messageLoop;

        // create context info
        HandleScope handleScope(isolate);
        m_context.Reset(isolate, context);
        m_isolate = isolate;
    }

    void sendContextCreated()
    {
        HandleScope handleScope(m_isolate);
        Local<Context> c = Local<Context>::New(m_isolate, m_context);
        V8ContextInfo info(c, 1, StringView());
        info.auxData = StringView(qStringToStringView("{\"isDefault\":true}"));
        m_inspector->contextCreated(info);
    }

    Isolate *m_isolate;
    Persistent<Context> m_context;

    std::unique_ptr<v8_inspector::V8InspectorSession> connect(V8Inspector::Channel *channel)
    {
        return m_inspector->connect(1, channel, StringView());
    }

    virtual void runMessageLoopOnPause(int contextGroupId) override {
        qDebug() <<"Run message loop on pause";
        m_runMessageLoop = true;
        while (m_runMessageLoop) {
            m_messageLoop();
        }
    }
    virtual void quitMessageLoopOnPause() override {
        qDebug() <<"quit message loop on pause";
        m_runMessageLoop = false;
    }
    virtual void runIfWaitingForDebugger(int contextGroupId) override {
        qDebug() <<"Run if waiting for debugger";
    }

    virtual void muteMetrics(int contextGroupId) override {
        qDebug() <<"Mute metrics";
    }
    virtual void unmuteMetrics(int contextGroupId) override {
        qDebug() <<"unmute metrics";
    }

    virtual void beginUserGesture() override {
        qDebug() <<"begin user gesture";
    }
    virtual void endUserGesture() override {
        qDebug() <<"end user gesture";
    }

    virtual std::unique_ptr<StringBuffer> valueSubtype(v8::Local<v8::Value>) {
        qDebug() <<"value subtype";
      return nullptr;
    }
    virtual bool formatAccessorsAsProperties(v8::Local<v8::Value>) {
        qDebug() <<"format accessors as properties";
      return false;
    }
    virtual bool isInspectableHeapObject(v8::Local<v8::Object>) { return true; }

    virtual v8::Local<v8::Context> ensureDefaultContextInGroup(
        int contextGroupId) {
      return Local<Context>::New(m_isolate, m_context);
    }
    virtual void beginEnsureAllContextsInGroup(int contextGroupId) {
        qDebug() <<"begin ensure all contexts in group"<<contextGroupId;
    }
    virtual void endEnsureAllContextsInGroup(int contextGroupId) {
        qDebug() <<"end ensure all contexts in group "<<contextGroupId;
    }

    virtual void installAdditionalCommandLineAPI(v8::Local<v8::Context>,
                                                 v8::Local<v8::Object>) {
        qDebug() <<"Install command line api";
    }
    virtual void consoleAPIMessage(int contextGroupId,
                                   v8::Isolate::MessageErrorLevel level,
                                   const StringView& message,
                                   const StringView& url, unsigned lineNumber,
                                   unsigned columnNumber, V8StackTrace*) {
        qDebug() <<"Console message";
    }
    virtual v8::MaybeLocal<v8::Value> memoryInfo(v8::Isolate*,
                                                 v8::Local<v8::Context>) {
        qDebug() <<"Memory info";
      return v8::MaybeLocal<v8::Value>();
    }

    virtual void consoleTime(const StringView& title) {
        qDebug() <<"console time";
    }
    virtual void consoleTimeEnd(const StringView& title) {
        qDebug() <<"console tim end";
    }
    virtual void consoleTimeStamp(const StringView& title) {
        qDebug() <<"console time stamp";
    }
    virtual void consoleClear(int contextGroupId) {
        qDebug() <<"Console clear";
    }
    virtual double currentTimeMS() {
        qDebug() <<"current time";
        return 0;
    }
    typedef void (*TimerCallback)(void*);
    virtual void startRepeatingTimer(double, TimerCallback, void* data) {
        qDebug() <<"start repeating timer";
    }
    virtual void cancelTimer(void* data) {
        qDebug() <<"cancel timer";
    }

    virtual void maxAsyncCallStackDepthChanged(int depth) {
        qDebug() <<"max async calll stack depth changed";
    }

private:
    std::unique_ptr<V8Inspector> m_inspector;
    bool m_runMessageLoop = false;
    std::function<void()> m_messageLoop;
};

InspectorHandler::InspectorHandler(v8::Isolate *isolate, v8::Persistent<Context> &context,
                                   QList<v8::ScriptOrigin*> &scriptOrigins, QString strategyName, QObject *parent) :
    QObject(parent),
    m_strategyName(strategyName),
    m_isolate(isolate),
    m_scriptOrigins(scriptOrigins),
    m_inspectorClient(nullptr)
{
    m_context.Reset(isolate, context);
    QByteArray idData;
    for (int i = 0;i<32;i++) {
        idData.append(qrand() % 256);
    }
    m_id = QString(idData.toBase64());
    qDebug() <<m_id;

    Isolate::Scope isolateScope(m_isolate);
    HandleScope handleScope(m_isolate);

    m_inspectorClient = new RaInspectorClient(m_isolate, m_context, [&]() {
        m_socket->waitForReadyRead();
        readData();
    });
    m_channel.reset(new ChannelImpl(m_socket));
    m_session = m_inspectorClient->connect(m_channel.get());
    m_inspectorClient->sendContextCreated();
}

void InspectorHandler::setSocket(QTcpSocket *socket)
{
    m_socket.reset(socket);
    m_socket->setParent(this);

    connect(socket, SIGNAL(readyRead()), this, SLOT(readData()));
}

void InspectorHandler::readData()
{
    Isolate::Scope isolateScope(m_isolate);
    HandleScope handleScope(m_isolate);
    Local<Context> c = Local<Context>::New(m_isolate, m_inspectorClient->m_context);
    Context::Scope asdf(c);

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
        } else if (r == FRAME_OK) {
            StringView message((uint8_t*)output.data(), output.size());
            m_session->dispatchProtocolMessage(message);
        }
        buffer.erase(buffer.begin(), buffer.begin() + bytes_consumed);
    } while (buffer.size() > 0);
}
