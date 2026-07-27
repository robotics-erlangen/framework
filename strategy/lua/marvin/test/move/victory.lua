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

local Victory = Class("Group.Move.Victory", require "group/move/base")

local World = require "../base/world"
local G = World.Geometry

local MoveToPos = require "task/shared/movetopos"
local VictoryTask = require "task/test/victory"

local vis = require "../base/vis"

Victory.MIN_ROBOTS = 3
Victory.MAX_ROBOTS = 12

function Victory.canStart() -- TODO
	return true
end

function Victory:_init()
	self._state = "init"
end

function Victory:_canContinue() -- TODO
	return true
end

function Victory:_updateTasks()
	local taskAssignments = {}

	local nRobots = #self._robots
	-- TODO: radius sinnvoller
	local radius = (G.FieldHeightHalf - G.DefenseRadius) / 2
	local center = Vector(0, -radius - 0.75)
	radius = radius - 0.5
	vis.addCircle("test", center, 0.05, vis.colors.yellow, true)
	local angleStep = 2 * math.pi / nRobots

	if self._state == "init" then -- todo startposition fixen
		for i, _ in ipairs(self._robots) do
			local angle = i * angleStep
			local moveLine = Vector.fromAngle(angle):setLength(radius/2)
			local pos = center - Vector(0, -radius/2) + moveLine
			taskAssignments[self._robots[i]] = { class = MoveToPos, params = {pos}}
			if self._robots[i].pos:distanceTo(pos) > 0.1 then
				self._state = "circle"
			end
		end
	elseif self._state == "circle" then
		for i, _ in ipairs(self._robots) do
			local angle = (i-1) * angleStep
			taskAssignments[self._robots[i]] = { class = VictoryTask, params = {center, 0, angle, radius}}
		end
	end

	return taskAssignments
end
return Victory
