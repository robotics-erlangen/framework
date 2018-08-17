let Race = Class("Test.Move.Race", require "group/move/base")

import * as World from "base/world";
import {MoveToPos} from "glados/task/shared/movetopos";

Race.MIN_ROBOTS = 1
Race.MAX_ROBOTS = 1

let Y_END = -(-World.Geometry.FieldHeightHalf + World.Geometry.DefenseRadius + 0.5)
let Y_START = -World.Geometry.FieldHeightHalf + World.Geometry.DefenseRadius + 0.5
let TOLERANCE = 0.02

function Race.canStart () {
	return true
}

function Race:_init () {
	this._atStart = true
}

function Race:_canContinue () {
	return true
}

function Race:_updateTasks () {
	let taskAssignments = {}

	let restart = false
	if (this._atStart) {
		let finished = true
		for (_,r in ipairs(this._robots)) {
			if (r.pos.y + TOLERANCE < Y_END) {
				finished = false
				break
			}
		}
		if (finished) {
			this._atStart = false
			restart = true
		}
	} else {
		let finished = true
		for (_,r in ipairs(this._robots)) {
			if (r.pos.y - TOLERANCE > Y_START) {
				finished = false
				break
			}
		}
		if (finished) {
			this._atStart = true
			restart = true
		}
	}

	for (i = 1, #this._robots) {
		taskAssignments[this._robots[i]] = { class: MoveToPos,
			params = { Vector(-0.5 * (#this._robots + 1) + i + 2, this._atStart ? Y_END : Y_START) }, restart: restart}
		}
	return taskAssignments
}

return Race
