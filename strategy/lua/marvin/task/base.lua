--[[***********************************************************************
*   Copyright 2026 Robotics Erlangen e.V.                                 *
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
*************************************************************************]]

local Base = Class("Task.Base")


function Base:init(agent, ...)
	assert(agent ~= nil, "no agent passed")
	self._agent = agent
	self._robot = self._agent:robot()
	self._inbox = self._agent._inbox
	self._send = self._agent._send
	self:clearMainAttackerParameters()
	self:_init(...)
end

function Base:robot()
	return self._robot
end

function Base:run()
	error("stub")
end

function Base:_init()
end

function Base:clearMainAttackerParameters()
	self._mainAttackerParameters = nil
end

function Base:setMainAttackerParameters(target, endSpeedLength)
	self._mainAttackerParameters = { target, endSpeedLength }
end

function Base:mainAttackerParameters()
	return self._mainAttackerParameters
end

return Base
