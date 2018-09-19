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

#ifndef INPUTDEVICE_H
#define INPUTDEVICE_H

#include "protobuf/robot.pb.h"
#include "protobuf/ssl_referee.pb.h"
#include <QObject>

class InputDevice : public QObject
{
    Q_OBJECT

public:
    explicit InputDevice(const QString &name);
    ~InputDevice() override;
    InputDevice(const InputDevice&) = delete;
    InputDevice& operator=(const InputDevice&) = delete;

signals:
    void sendRefereeCommand(SSL_Referee::Command command);
    void toggleTransceiver();

public:
    void setLocal(bool local);
    bool isLocal() const { return m_local; }
    void setStrategyControlled(bool isControlled);
    bool isStrategyControlled() const { return m_strategyControlled; }
    QString name() const { return m_name; }
    const robot::Command& command() const { return m_command; }

protected:
    void resetCommand();

protected:
    robot::Command m_command;

private:
    const QString m_name;
    bool m_local;
    bool m_strategyControlled;
};

#endif // INPUTDEVICE_H
