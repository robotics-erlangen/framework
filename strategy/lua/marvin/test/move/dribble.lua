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

local Dribble = Class("Test.Move.Dribble", require "group/move/base")

local DribbleTask = require "task/attacker/dribble"
local World = require "../base/world"

local G = World.Geometry

Dribble.MIN_ROBOTS = 1
Dribble.MAX_ROBOTS = 1

-- the armada has 4 steps to form stairs, depending on ball distance
local POSITIONS_ORIG = {
	Vector(G.FieldWidthHalf * -0.2, G.FieldWidthHalf *  0   ),
	Vector(G.FieldWidthHalf *  0.2, G.FieldWidthHalf *  0.25),
	Vector(G.FieldWidthHalf *  0.6, G.FieldWidthHalf *  0.5 ),
	Vector(G.FieldWidthHalf * -0.6, G.FieldWidthHalf * -0.25),
	Vector(G.FieldWidthHalf * -0.56, G.FieldWidthHalf * -0.225),
}

function Dribble.canStart()
	return true
end

function Dribble:_init()
	self._state = 1
	self._time = World.Time
end

function Dribble:_canContinue()
	return true
end

function Dribble:_updateTasks()
	local state_changed = false
	local delay = false
	if World.Time - self._time < 3 then
		delay = true
	end
	if not delay and self._state == 5 then
		self._state = 1
		state_changed = true
	end
	if self._robots[1].pos:distanceTo(POSITIONS_ORIG[self._state]) < 0.01 and not delay then
		if self._state == 4 then
			self._time = World.Time
		end
		self._state = self._state + 1
		state_changed = true
	end
	local taskAssignments = {}
	taskAssignments[self._robots[1]] = { class = DribbleTask, params = {POSITIONS_ORIG[self._state]}, restart = state_changed }
	return taskAssignments, self._robots[1]
end

return Dribble
