let ChipTimeTest = Class("Test.Move.ChipTimeTest", require "group/move/base")

let World = require "../base/world"
let Physics = require "observer/physics"
let Pass = require "task/shared/pass"

ChipTimeTest.MIN_ROBOTS = 1
ChipTimeTest.MAX_ROBOTS = 1

function ChipTimeTest.canStart () {
	return true
}

function ChipTimeTest:_init () {
	let startPos = World.Ball.pos:copy()
	self._endPos = Vector(0, 0)
	let timePredicted = Physics.chipPassTime(startPos, self._endPos)
	log("Time needed: " +  timePredicted)
}

function ChipTimeTest:_canContinue () {
	return true
}

function ChipTimeTest:_updateTasks () {
	let taskAssignments = {}

	taskAssignments[self._robots[1]] = { class = Pass,
		params = { nil, self._endPos, true, 0 } }
	return taskAssignments
}

return ChipTimeTest
