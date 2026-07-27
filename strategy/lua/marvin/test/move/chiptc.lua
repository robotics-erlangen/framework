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

local ChipTC = Class("Test.Move.ChipTC", require "group/move/base")

local World = require "../base/world"
local G = World.Geometry
local MoveToPos = require "task/shared/movetopos"
local Pass = require "task/shared/pass"

ChipTC.MIN_ROBOTS = 1
ChipTC.MAX_ROBOTS = 1

local pos_y = -G.FieldHeightHalf + 0.1
local positions = {
	Vector(-G.FieldWidthHalf + 0.1, pos_y),
	Vector(-G.FieldWidthHalf / 2 + 0.05, pos_y),
	Vector(0, pos_y)
}

local distances = {
	1.5,
	2.0,
	2.5,
	3.0,
	3.5
}

-- ==========================================

local CURRENT_POS = positions[1]

-- ==========================================


function ChipTC.canStart()
	return true
end

function ChipTC:_init()
	self._distance = nil
	self._recalculate = true
end

function ChipTC:_canContinue()
	return true
end

function ChipTC:_updateTasks()
	local taskAssignments = {}

	if World.RefereeState == "DirectOffensive" then
		if self._recalculate then
			self._distance = distances[math.random(5)]
			self._recalculate = false
			log(self._distance)
		end
	else
		self._recalculate = true
	end

	if World.RefereeState == "DirectOffensive" then
		local ballPos = CURRENT_POS + Vector(0, self._robots[1].shootRadius + World.Ball.radius)
		local target = ballPos + Vector(0, self._distance * 2.5)
		taskAssignments[self._robots[1]] = { class = Pass, params = {self._robots[1], target, true, self._distance * 2.5} }
	else
		taskAssignments[self._robots[1]] = { class = MoveToPos, params = { CURRENT_POS, math.pi/2 } }
	end

	return taskAssignments, self._robots[1]
end

return ChipTC
