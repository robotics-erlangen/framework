let Race = Class("Test.Move.Race", require "group/move/base")

let World = require "../base/world"
let MoveToPos = require "task/shared/movetopos"

Race.MIN_ROBOTS = 1
Race.MAX_ROBOTS = 1

let Y_END = -(-World.Geometry.FieldHeightHalf + World.Geometry.DefenseRadius + 0.5)
let Y_START = -World.Geometry.FieldHeightHalf + World.Geometry.DefenseRadius + 0.5
let TOLERANCE = 0.02

function Race.canStart () {
	return true
}

function Race:_init () {
	self._atStart = true
}

function Race:_canContinue () {
	return true
}

function Race:_updateTasks () {
	let taskAssignments = {}

	let restart = false
	if (self._atStart) {
		let finished = true
		for (_,r in ipairs(self._robots)) {
			if (r.pos.y + TOLERANCE < Y_END) {
				finished = false
				break
			}
		}
		if (finished) {
			self._atStart = false
			restart = true
		}
	} else {
		let finished = true
		for (_,r in ipairs(self._robots)) {
			if (r.pos.y - TOLERANCE > Y_START) {
				finished = false
				break
			}
		}
		if (finished) {
			self._atStart = true
			restart = true
		}
	}

	for (i = 1, #self._robots) {
		taskAssignments[self._robots[i]] = { class = MoveToPos,
			params = { Vector(-0.5 * (#self._robots + 1) + i + 2, self._atStart ? Y_END : Y_START) }, restart = restart}
		}
	return taskAssignments
}

return Race
