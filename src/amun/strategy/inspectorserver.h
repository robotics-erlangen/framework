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
#include <QMap>
#include <QList>
#include <QString>

class QTcpServer;
class QTcpSocket;
class InspectorHandler;

class InspectorServer : public QObject
{
    Q_OBJECT
public:
    InspectorServer(QObject *parent = nullptr);

public slots:
    void newInspectorHandler(InspectorHandler *handler);
    void removeInspectorHandler(InspectorHandler *handler);

private slots:
    void newConnection();
    void readData();

private:
    QString mapToString(const QMap<QString, QString> &map);
    QString mapsToString(const QList<QMap<QString, QString>> &list);
    void sendListResponse();
    void sendVersionResponse();
    void sendHttpResponse(QString response);
    bool handleGetRequest(QString request);

private:
    QTcpServer *m_server;
    QTcpSocket *m_socket;
    QList<InspectorHandler*> m_handlers;
};

#endif // INSPECTORSERVER_H
