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

local ChipDribble = Class("Test.Move.ChipDribble", require "group/move/base")

local MoveToPos = require "task/shared/movetopos"
local PassDribble = require "task/test/passdribble"
local Pass = require "task/shared/pass"
local World = require "../base/world"
local Ball = require "observer/ball"

ChipDribble.MIN_ROBOTS = 2
ChipDribble.MAX_ROBOTS = 2


function ChipDribble.canStart()
	return true
end

function ChipDribble:_init()
	self._state = 1
	self._distance = 2
	self._positionRobot2 = Vector(0,0)
	self._positionRobot1 = Vector(0, -(self._distance + self._robots[2].radius*2))
	self._ballWasShot = false
end

function ChipDribble:_canContinue()
	return true
end

function ChipDribble:_updateTasks()
	local taskAssignments = {}

	if self._state == 2 or World.RefereeState == "DirectOffensive" then
		self._state = 2
		self._ballWasShot = false
		taskAssignments[self._robots[1]] = { class = Pass, params = { self._robots[2], self._positionRobot2, true } }
		taskAssignments[self._robots[2]] = { class = MoveToPos, params = { self._positionRobot2, nil, true } }
	end

	if self._state == 3 or (self._ballWasShot and self._robots[2].pos:distanceTo(World.Ball.pos) <= 0.4) then
		self._state = 3
		self._ballWasShot = false
		taskAssignments[self._robots[1]] = { class = MoveToPos, params = { self._shootPosition, nil } }
		taskAssignments[self._robots[2]] = { class = PassDribble, params = {self._robots[1]} }
	end

	if self._state == 4 or Ball.wasShot(0.25) then
		self._state = 4
		self._ballWasShot = true
		taskAssignments[self._robots[1]] = { class = MoveToPos, params = { self._positionRobot1, nil } }
		taskAssignments[self._robots[2]] = { class = MoveToPos, params = { self._positionRobot2, nil, true } }
	end

	if self._state == 1 or World.RefereeState == "IndirectOffensive" then
		self._state = 1
		taskAssignments[self._robots[1]] = { class = MoveToPos, params = { self._positionRobot1, nil, true } }
		taskAssignments[self._robots[2]] = { class = MoveToPos, params = { self._positionRobot2, nil, true } }
	end

	return taskAssignments, self._robots[1]
end

return ChipDribble
