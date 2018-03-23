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

#include "inputdevice.h"

InputDevice::InputDevice(const QString &name) :
    m_name(name),
    m_local(true),
    m_strategyControlled(false)
{
    resetCommand();
}

InputDevice::~InputDevice()
{

}

void InputDevice::setLocal(bool local)
{
    m_local = local;
    m_command.set_local(m_local);
}

void InputDevice::setStrategyControlled(bool isControlled)
{
    m_strategyControlled = isControlled;
    m_command.set_strategy_controlled(isControlled);
}

void InputDevice::resetCommand()
{
    m_command.Clear();
    m_command.set_local(m_local);
    m_command.set_strategy_controlled(m_strategyControlled);
}
