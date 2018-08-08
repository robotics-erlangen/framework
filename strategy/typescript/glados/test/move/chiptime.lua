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
