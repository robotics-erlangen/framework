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
local Default = Class("Agent.Defender.Default", Base)

local CenterBack = require "task/defender/centerback"
local Defense = require "util/defense"


function Default:_stop()
	self._lastTarget = nil
	self._customBall = {}
end

function Default:check()
	return true
end

function Default:_updateTask()
	local role = self._inbox.roleAssignment().trainer
	local target = role and role.name == "CenterBack" and role.params or self._customBall
	local restart = target ~= self._lastTarget
	self._lastTarget = target

	if target == self._customBall then
		local fieldPos, fieldDir = Defense.calculateBallPositionField()
		self._customBall.pos = fieldPos
		self._customBall.dir = fieldDir
	end

	return CenterBack, { target }, restart
end

return Default
