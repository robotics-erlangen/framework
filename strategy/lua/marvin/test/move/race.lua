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

local Race = Class("Test.Move.Race", require "group/move/base")

local World = require "../base/world"
local MoveToPos = require "task/shared/movetopos"

Race.MIN_ROBOTS = 1
Race.MAX_ROBOTS = 1

local Y_END = -(-World.Geometry.FieldHeightHalf + World.Geometry.DefenseRadius + 0.5)
local Y_START = -World.Geometry.FieldHeightHalf + World.Geometry.DefenseRadius + 0.5
local TOLERANCE = 0.02

function Race.canStart()
	return true
end

function Race:_init()
	self._atStart = true
end

function Race:_canContinue()
	return true
end

function Race:_updateTasks()
	local taskAssignments = {}

	local restart = false
	if self._atStart then
		local finished = true
		for _,r in ipairs(self._robots) do
			if r.pos.y + TOLERANCE < Y_END then
				finished = false
				break
			end
		end
		if finished then
			self._atStart = false
			restart = true
		end
	else
		local finished = true
		for _,r in ipairs(self._robots) do
			if r.pos.y - TOLERANCE > Y_START then
				finished = false
				break
			end
		end
		if finished then
			self._atStart = true
			restart = true
		end
	end

	for i = 1, #self._robots do
		taskAssignments[self._robots[i]] = { class = MoveToPos,
			params = { Vector(-0.5 * (#self._robots + 1) + i + 2, self._atStart and Y_END or Y_START) }, restart = restart}
		end
	return taskAssignments
end

return Race
