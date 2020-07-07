/***************************************************************************
 *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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

#ifndef AMUNCLIENT_H
#define AMUNCLIENT_H

#include "protobuf/command.h"
#include "protobuf/status.h"

class Amun;
class QThread;

class AmunClient : public QObject
{
    Q_OBJECT

public:
    explicit AmunClient(QObject *parent = 0);
    ~AmunClient() override;
    AmunClient(const AmunClient&) = delete;
    AmunClient& operator=(const AmunClient&) = delete;

signals:
    // the replay status is not in a command to avoid copying it
    void gotStatus(const Status &status);
    void sendCommand(const Command &command);

public:
    void start(bool simulatorOnly = false);
    void stop();

private:
    Amun* m_amun;
    QThread *m_amunThread;
};

#endif // AMUNCLIENT_H
