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

#ifndef INSPECTORSERVER_H
#define INSPECTORSERVER_H

#include <QObject>
#include <QString>
#include <QTcpServer>
#include <memory>

class QTcpSocket;
class Typescript;

// this class handles connecting with the debugging frontend
// until a websocket connection is created, which is then
// forwarded to the corresponding InspectorHandler
class InspectorServer : public QObject
{
    Q_OBJECT
public:
    InspectorServer(int port, QObject *parent = nullptr);
    // may only be called when no current active strategy is registered
    void newDebuggagleStrategy(Typescript *typescript);
    void clearHandlers();

private slots:
    void newConnection();
    void readData();
    void acceptConnections();

private:
    void sendListResponse();
    void sendVersionResponse();
    void sendHttpResponse(QString response);
    bool handleGetRequest(QString request);

private:
    QTcpServer m_server;
    std::shared_ptr<QTcpSocket> m_socket;
    Typescript *m_strategy;
    int m_port;

    const QString m_connectionId = "this_id_doesnt_seem_to_matter";
};

#endif // INSPECTORSERVER_H
