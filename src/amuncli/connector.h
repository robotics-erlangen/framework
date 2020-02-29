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

#include "internalreferee.h"
#include "logfile/logfilewriter.h"
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
    Connector(const Connector&) = delete;
    Connector& operator=(const Connector&) = delete;

    void setAutorefInitScript(const QString &initScript);
    void setInitScript(const QString &initScript);
    void setEntryPoint(const QString &entryPoint);
    void setStrategyColors(bool runBlue, bool runYellow);
    void setDebug(bool debug);
    void setSimulatorConfigFile(const QString &shortFile);
    void setSimulationRunningTime(int seconds);
    void setRobotConfiguration(int numRobots, const QString &generation);
    void setRecordLogfile(const QString &filename);

    void start();

public slots:
    void handleStatus(const Status &status);

signals:
    void sendCommand(const Command &command);

private:
    void addStrategyLoad(amun::CommandStrategy *strategy, const QString &initScript, const QString &entryPoint);
    void handleStrategyStatus(const amun::StatusStrategy &strategy);
    void sendOptions();
    void loadConfiguration(const QString &configFile, google::protobuf::Message *message, bool allowPartial);

    QString m_initScript;
    QString m_entryPoint;
    QString m_autorefInitScript = "";
    bool m_runBlue = false;
    bool m_runYellow = false;
    bool m_debug = false;
    int m_exitCode = 255;
    std::map<std::string, bool> m_options;

    QString m_simulatorConfigurationFile;
    qint64 m_simulationRunningTime = std::numeric_limits<qint64>::max();

    qint64 m_simulationStartTime = 0;

    InternalReferee m_referee;
    LogFileWriter m_logfile;
    bool m_recordLogfile = false;
};

#endif // CONNECTOR_H
