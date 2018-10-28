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

#include "inspectorholder.h"

class Typescript;

// handles websocket content and relays it to the v8 inspector
class InspectorHandler : public QObject, public AbstractInspectorHandler
{
    Q_OBJECT
public:
    explicit InspectorHandler(Typescript *strategy, std::shared_ptr<QTcpSocket> &socket, QObject *parent = nullptr);
    virtual ~InspectorHandler() override;

    void startMessageLoopOnPause() override;
    void endMessageLoopOnPause() override;
    void messageLoop() override;
    void inspectorResponse(QString content) override;
    void inspectorNotification(QString content) override;
    void inspectorFlush() override;

signals:
    void frontendDisconnected();

public slots:
    void readData();

private:
    void sendPauseSimulator(bool pause);

private:
    std::shared_ptr<QTcpSocket> m_socket;
    Typescript *m_strategy;
    bool m_shouldResetHolder;
};

#endif // INSPECTORHANDLER_H
