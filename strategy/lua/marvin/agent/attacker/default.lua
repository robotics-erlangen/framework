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
local Default = Class("Agent.Attacker.Default", Base)

local AcceptPass = require "task/attacker/acceptpass"
local Midfield = require "task/attacker/midfield"
local SideStep = require "task/attacker/sidestep"
local Striker = require "task/attacker/striker"
local Attack = require "util/attack"

function Default:_stop()
	self._forceKeepingInPool = false
end

function Default:check()
	self._forceKeepingInPool = false
	local _, passInfoTable = next(self._inbox.passInfo())
	if passInfoTable then
		for _, passInfo in pairs(passInfoTable) do
			if passInfo and passInfo.target == self._robot then
				self._forceKeepingInPool = true
			end
		end
	end
	self._send.groupApplication("trainer", { name = "midfield", payload = {} })

	return true
end

function Default:_updateTask()
	local _, passInfoTable = next(self._inbox.passInfo())
	local relevantPassInfo = Attack.relevantPassInfoMessage(self._robot, passInfoTable)
	local acceptingPass = Attack.checkPassInfos(self._robot, passInfoTable, false)

	local midfieldZone = self._inbox.midfieldZone().trainer
	local Freebreaker = midfieldZone and Midfield or Striker

	if relevantPassInfo and not acceptingPass then
		return SideStep, {relevantPassInfo}
	end
	return acceptingPass and AcceptPass or Freebreaker
end

return Default
