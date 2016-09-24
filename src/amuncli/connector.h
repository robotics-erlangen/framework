/***************************************************************************
 *   Copyright 2016 Michael Eischer                                        *
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

#ifndef CONNECTOR_H
#define CONNECTOR_H

#include "protobuf/command.h"
#include "protobuf/status.h"
#include <QObject>
#include <QString>
#include <utility>

class Connector : public QObject
{
    Q_OBJECT

public:
    explicit Connector(QObject *parent = 0);
    ~Connector() override;

    void setInitScript(const QString &initScript);
    void setEntryPoint(const QString &entryPoint);
    void setStrategyColor(bool asBlue);
    void setDebug(bool debug);

    void start();

public slots:
    void handleStatus(const Status &status);

signals:
    void sendCommand(const Command &command);

private:
    std::pair<int, bool> toExitCode(const QString &str);
    void addStrategyLoad(amun::CommandStrategy *strategy);
    void dumpProtobuf(const google::protobuf::Message &message);
    void dumpEntrypoints(const amun::StatusStrategy &strategy);
    void handleStrategyStatus(const amun::StatusStrategy &strategy);
    void dumpLog(const amun::DebugValues &debug);
    QString stripHTML(const QString &logText);

    QString m_initScript;
    QString m_entryPoint;
    bool m_asBlue;
    bool m_debug;
    int m_exitCode;
};

#endif // CONNECTOR_H
