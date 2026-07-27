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

local ChipTimeTest = Class("Test.Move.ChipTimeTest", require "group/move/base")

local World = require "../base/world"
local Physics = require "observer/physics"
local Pass = require "task/shared/pass"

ChipTimeTest.MIN_ROBOTS = 1
ChipTimeTest.MAX_ROBOTS = 1

function ChipTimeTest.canStart()
	return true
end

function ChipTimeTest:_init()
	local startPos = World.Ball.pos:copy()
	self._endPos = Vector(0, 0)
	local timePredicted = Physics.chipPassTime(startPos, self._endPos)
	log("Time needed: ".. timePredicted)
end

function ChipTimeTest:_canContinue()
	return true
end

function ChipTimeTest:_updateTasks()
	local taskAssignments = {}

	taskAssignments[self._robots[1]] = { class = Pass,
		params = { nil, self._endPos, true, 0 } }
	return taskAssignments
end

return ChipTimeTest
