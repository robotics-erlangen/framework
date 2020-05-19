let ChipTimeTest = Class("Test.Move.ChipTimeTest", require "group/move/base")

import * as World from "base/world";
import * as Physics from "glados/observer/physics";
import {Pass} from "glados/task/shared/pass";

ChipTimeTest.MIN_ROBOTS = 1
ChipTimeTest.MAX_ROBOTS = 1

function ChipTimeTest.canStart () {
	return true
}

function ChipTimeTest:_init () {
	let startPos = World.Ball.pos
	this._endPos = new Vector(0, 0)
	let timePredicted = Physics.chipPassTime(startPos, this._endPos)
	log("Time needed: " +  timePredicted)
}

function ChipTimeTest:_canContinue () {
	return true
}

function ChipTimeTest:_updateTasks () {
	let taskAssignments = {}

	taskAssignments[this._robots[0]] = { class: Pass,
		params = [ undefined, this._endPos, true, 0 ] }
	return taskAssignments
}

return ChipTimeTest
