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
local Piggy = Class("Agent.Defender.Piggy", Base)

local debug = require "../base/debug"
local Ball = require "observer/ball"
local InterceptPass = require "task/defender/interceptpass"
local PiggyTask = require "task/defender/piggy"


function Piggy:_stop()
	self._opp = nil
end

function Piggy:check()
	local role = self._inbox.roleAssignment().trainer
	return role and role.name == "Piggy"
end

function Piggy:_updateTask()
	local newOpp = self._inbox.roleAssignment().trainer.params[1]
	local restartTask = newOpp ~= self._opp
	self._opp = newOpp

	debug.set("target", self._opp.id)

	if Ball.receivesPass(self._opp) then
		return InterceptPass
	else
		return PiggyTask, { self._opp }, restartTask
	end

end

return Piggy