/***************************************************************************
 *   Copyright 2017 Alexander Danzer                                       *
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

#ifndef MINIPROCESSOR_H
#define MINIPROCESSOR_H

#include <QObject>
#include <QMutex>

#include "protobuf/status.h"
#include "protobuf/command.h"
#include "logfile/logfilewriter.h"

class Strategy;

class MiniProcessor : public QObject
{
    Q_OBJECT

public:
    MiniProcessor(Strategy* strategy, QString outputFilename);
    ~MiniProcessor();
    void setCurrentStatus(const Status &status);

signals:
    void sendStatus(const Status &status);
    void sendCommand(const Command &command);

private slots:
    void handleStatus(const Status &status);

private:
    LogFileWriter m_logFileOut;
    Status m_status;
    bool m_hasStrategy;
    QMutex m_mutex;
};

#endif // MINIPROCESSOR_H
