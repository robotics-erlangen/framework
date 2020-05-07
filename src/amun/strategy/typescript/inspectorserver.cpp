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

#include "inspectorserver.h"
#include "inspectorhandler.h"
#include "typescript.h"

#include <QTcpSocket>
#include <QCryptographicHash>

static QString mapToString(const QMap<QString, QString> &map)
{
    QString result = "{\n";
    bool first = true;
    for (const QString &key : map.keys()) {
        if (!first) {
            result += ",\n";
        }
        first = false;
        result += "    \"" + key + "\": \"" + map[key] + "\"";
    }
    result += "\n}";
    return result;
}

static QString mapsToString(const QList<QMap<QString, QString>> &list)
{
    bool first = true;
    QString result;
    result += "[ ";
    for (const auto& object : list) {
        if (!first) {
          result += ", ";
        }
        first = false;
        result += mapToString(object);
    }
    result += "]\n\n";
    return result;
}

InspectorServer::InspectorServer(int port, QObject *parent) :
    QObject(parent),
    m_server(this),
    m_socket(nullptr),
    m_strategy(nullptr),
    m_port(port)
{
    connect(&m_server, SIGNAL(newConnection()), SLOT(newConnection()));
}

bool InspectorServer::handleGetRequest(QString request)
{
    if (request.startsWith("GET /json/list ") || request.startsWith("GET /json ")) {
        sendListResponse();
    } else if (request.startsWith("GET /json/version ")) {
        sendVersionResponse();
    } else if (request.contains("Connection: Upgrade")) {
        if (request.startsWith("GET /" + m_connectionId)) {
            const QString guid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
            // extract the websocket key, as we need it for the response
            QString wsKey = request.split("Sec-WebSocket-Key: ")[1].split("\r\n")[0];
            QCryptographicHash hash(QCryptographicHash::Sha1);
            hash.addData(wsKey.toUtf8());
            hash.addData(guid.toUtf8());
            m_socket->write("HTTP/1.1 101 Switching Protocols\r\n"
                             "Upgrade: websocket\r\n"
                             "Connection: Upgrade\r\n"
                             "Sec-WebSocket-Accept: " + hash.result().toBase64() + "\r\n\r\n");
            m_socket->flush();
            disconnect(m_socket.get(), SIGNAL(readyRead()), this, SLOT(readData()));
            InspectorHandler *handler = new InspectorHandler(m_strategy, m_socket);
            connect(handler, SIGNAL(frontendDisconnected()), SLOT(acceptConnections()));
            m_strategy->setInspectorHandler(handler);
            handler->readData();
            m_server.close();
            m_socket.reset();
            return true;
        }
    }
    return false;
}

void InspectorServer::newConnection()
{
    m_socket.reset(m_server.nextPendingConnection());
    if (!m_socket) {
        return;
    }
    if (m_strategy->hasInspectorHandler()) {
        m_socket->close();
        m_socket.reset();
        return;
    }
    connect(m_socket.get(), SIGNAL(readyRead()), SLOT(readData()));
}

void InspectorServer::readData()
{
    QByteArray data = m_socket->readAll();
    QString stringData(data);

    if (stringData.startsWith("GET ")) {
        handleGetRequest(stringData);
    } else {
        m_socket->write("HTTP/1.0 400 Bad Request\r\n"
                        "Content-Type: text/html; charset=UTF-8\r\n\r\n"
                        "WebSockets request was expected\r\n");
        m_socket->flush();
    }
    if (m_socket != nullptr) {
        m_socket->close();
        m_socket.reset();
    }
}

void InspectorServer::sendListResponse()
{
    QMap<QString, QString> infoMap;
    infoMap["description"] = "ra instance";
    infoMap["id"] = m_connectionId;
    infoMap["type"] = "node";
    infoMap["webSocketDebuggerUrl"] = "ws://127.0.0.1:" + QString::number(m_port) + "/" + m_connectionId;
    sendHttpResponse(mapsToString({infoMap}));
}

void InspectorServer::sendHttpResponse(QString response)
{
    QString header = QString("HTTP/1.0 200 OK\r\n"
                        "Content-Type: application/json; charset=UTF-8\r\n"
                        "Cache-Control: no-cache\r\n"
                        "Content-Length: %1\r\n"
                        "\r\n"
                        "%2").arg(response.length()).arg(response);
    m_socket->write(header.toUtf8());
    m_socket->flush();
}

void InspectorServer::sendVersionResponse()
{
    QMap<QString, QString> response;
    response["Browser"] = "ra 1.0";
    response["Protocol-Version"] = "1.1";
    sendHttpResponse(mapToString(response));
}

void InspectorServer::acceptConnections()
{
    m_strategy->removeInspectorHandler();
    newDebuggagleStrategy(m_strategy);
}

void InspectorServer::newDebuggagleStrategy(Typescript *typescript)
{
    m_strategy = typescript;
    if (!m_server.isListening()) {
        if (!m_server.listen(QHostAddress::LocalHost, (quint16)m_port)) {
            typescript->log("<font color=\"red\">Could not connect debugging server to port " + QString::number(m_port) + "</font>");
        }
    }
}

void InspectorServer::clearHandlers()
{
    if (m_server.isListening()) {
        m_server.close();
    }
}
