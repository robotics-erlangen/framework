/***************************************************************************
 *   Copyright 2015 Michael Eischer                                        *
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

#include "abstractstrategyscript.h"

AbstractStrategyScript::AbstractStrategyScript() :
    m_hasDebugger(false),
    m_debugHelper(nullptr),
    m_isInternalAutoref(false)
{
    takeDebugStatus();
}

bool AbstractStrategyScript::triggerDebugger()
{
    // fail as default
    return false;
}

Status AbstractStrategyScript::takeDebugStatus()
{
    Status status = m_debugStatus;
    m_debugStatus = Status(new amun::Status);
    return status;
}

void AbstractStrategyScript::setSelectedOptions(const QStringList &options)
{
    m_selectedOptions = options;
}

void AbstractStrategyScript::setDebugHelper(DebugHelper *helper) {
    m_debugHelper = helper;
}
