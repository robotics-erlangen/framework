let Victory = Class("Group.Move.Victory", require "group/move/base")

import * as World from "base/world";
let G = World.Geometry

import {MoveToPos} from "glados/task/shared/movetopos";
let VictoryTask = require "task/test/victory"

import * as vis from "base/vis";

Victory.MIN_ROBOTS = 3
Victory.MAX_ROBOTS = 12

function Victory.canStart () { // TODO
	return true
}

function Victory:_init () {
	this._state = "init"
}

function Victory:_canContinue () { // TODO
	return true
}

function Victory:_updateTasks () {
	let taskAssignments = {}

	let nRobots = #this._robots
	// TODO: radius sinnvoller
	let radius = (G.FieldHeightHalf - G.DefenseRadius) / 2
	let center = new Vector(0, -radius - 0.75)
	radius = radius - 0.5
	vis.addCircle("test", center, 0.05, vis.colors.yellow, true)
	let angleStep = 2 * Math.PI / nRobots

	if (this._state == "init") { // todo startposition fixen
		for (i, _ in ipairs(this._robots)) {
			let angle = i * angleStep
			let moveLine = Vector.fromAngle(angle).setLength(radius/2)
			let pos = center - new Vector(0, -radius/2) + moveLine
			taskAssignments[this._robots[i]] = { class: MoveToPos, params: {pos}}
			if (this._robots[i].pos.distanceTo(pos) > 0.1) {
				this._state = "circle"
			}
		}
	} else if (this._state == "circle") {
		for (i, _ in ipairs(this._robots)) {
			let angle = (i-1) * angleStep
			taskAssignments[this._robots[i]] = { class: VictoryTask, params: {center, 0, angle, radius}}
		}
	}

	return taskAssignments
}
return Victory
