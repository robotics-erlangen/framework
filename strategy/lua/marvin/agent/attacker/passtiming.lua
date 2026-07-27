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

local Base = require "agent/base/behavior"
local PassTiming = Class("Agent.Attacker.PassTiming", Base)

local Sidestep = require "task/attacker/sidestep"
local Attack = require "util/attack"

function PassTiming:check()
	local lastIncomingPassInfo = Attack.lastIncomingPassInfo(self._robot, self._inbox.passInfo())

	if self._inbox.mainAttacker().trainer ~= self._robot then
		return false
	end

	local lastIncomingPassInfoPos = nil

	if lastIncomingPassInfo then
		lastIncomingPassInfoPos = lastIncomingPassInfo.ballPos
	end

	if lastIncomingPassInfoPos and not Attack.checkPassInfos(self._robot, {lastIncomingPassInfo}, true) then
		return true
	end

	return false
end

function PassTiming:_updateTask()
	return Sidestep, {Attack.lastIncomingPassInfo(self._robot, self._inbox.passInfo())}
end

return PassTiming
