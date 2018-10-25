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

QString stringViewToQString(v8_inspector::StringView view);
std::vector<char> encode_frame_hybi17(const std::vector<char>& message);

class ChannelImpl : public v8_inspector::V8Inspector::Channel {
public:
    ChannelImpl(std::shared_ptr<QTcpSocket> &socket);
    virtual void sendResponse(int callId, std::unique_ptr<v8_inspector::StringBuffer> message) override;
    virtual void sendNotification(std::unique_ptr<v8_inspector::StringBuffer> message) override;
    virtual void flushProtocolNotifications() override;

private:
    std::shared_ptr<QTcpSocket> &m_socket;
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

public slots:
    void setSocket(QTcpSocket *socket);

private slots:
    void readData();

private:
    QString m_id;
    std::shared_ptr<QTcpSocket> m_socket;
    RaInspectorClient *m_inspectorClient;
    std::unique_ptr<v8_inspector::V8InspectorSession> m_session;
    std::unique_ptr<ChannelImpl> m_channel;
};

#endif // INSPECTORHANDLER_H
