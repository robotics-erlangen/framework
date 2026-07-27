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

local None = Class("Group.Move.None", require "group/move/base")

local World = require "../base/world"
local Armada = require "group/move/armada"
local WindshieldWiper = require "group/move/windshieldwiper"

local G = World.Geometry

None.MIN_ROBOTS = 5
None.MAX_ROBOTS = 5

function None:_updateTasks()
	local taskAssignments = {}
	for _,r in ipairs(self._robots) do
		taskAssignments[r] = {class = "none", params={}}
	end
	return taskAssignments, self._robots[1]
end

function None:_canContinue()
	if None.Referee.isFriendlyFreeKickState() then
		return true
	end
	return World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 - 0.2
		and math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2 - 0.2
		and World.RefereeState == "Stop"
end

function None.canStart()
	return Armada.canStart() or WindshieldWiper.canStart()
end

function None._init()
end

return None
