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

#ifndef INTEGRATOR_H
#define INTEGRATOR_H

#include <QObject>

#include "protobuf/status.h"
#include "protobuf/command.h"

class Integrator : public QObject
{
    Q_OBJECT
public:
    Integrator();

public slots:
    void handleReplayStatus(const Status &status);
    void handleStatus(const Status &status);
    void handleCommand(const Command &command);

signals:
    // to be connected to a replay blocker
    void sendReplayStatus(const Status &status);

private:
    bool m_isReplay;
};

#endif // INTEGRATOR_H
