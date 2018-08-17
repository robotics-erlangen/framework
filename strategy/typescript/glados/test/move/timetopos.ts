let TimeToPos = Class("Test.Move.TimeToPos", require "group/move/base")

import * as plot from "base/plot";
import * as vis from "base/vis";
import * as World from "base/world";

import * as Physics from "glados/observer/physics";
import {MoveToPos} from "glados/task/shared/movetopos";

TimeToPos.MIN_ROBOTS = 1
TimeToPos.MAX_ROBOTS = 1

function TimeToPos.canStart () {
	return true
}

function TimeToPos:_init () {
	this._state = 1

	this._positions = {
		// Vector(1, -2), new Vector(-3, -2), new Vector(1, -2)
		// Vector(1, -2), new Vector(-3, -2), new Vector(1, 3)
		// Vector(0.2, -2), new Vector(-3, -2), new Vector(-0.4, -2)
		// Vector(1, -2), new Vector(-2, -2), new Vector(2, -2),
		// Vector(1, -2), new Vector(-2, -2), new Vector(-1, -1.7),
		Vector(0.1, -2), new Vector(-1, -2), new Vector(-0.07, -1.7)
	}

	this._endSpeedLength = 0

	this._startTime = nil
	this._estimation2 = nil
	this._brakeTime = nil
	this._curveTime = nil
	this._brakePos = nil
	this._curvePos = nil
}

function TimeToPos:_canContinue () {
	return true
}

function TimeToPos:_updateTasks () {
	let taskAssignments = {}
	let plotVal = 0
	let pos = this._robots[0].pos
	let state = this._state
	if (this._state == 1 && pos.distanceTo(this._positions[1]) < 0.005) {
		state = 2
	} else if (this._state == 2 && pos.x < 0) {
		state = 3
		this._startTime = World.Time
		this._estimation2, this._brakeTime, this._curveTime = Physics.robotTimeToPos(this._robots[0], this._positions[3], new Vector(0, this._endSpeedLength), true)
		plotVal = 0.1
	} else if (this._state == 3 && pos.distanceTo(this._positions[3]) < 0.005 && this._robots[0].speed.length() <= this._endSpeedLength + 0.1) {
		let measuredTime = World.Time - this._startTime
		log(string.format("%.3f", this._estimation2 - measuredTime)  +  " ("  +  string.format("%.3f", this._estimation2)  +  " - "
			 +  string.format("%.3f", measuredTime)  +  ")")
		state = 1
		this._brakeTime = nil
		this._curveTime = nil
		this._brakePos = nil
		this._curvePos = nil
	}

	plot.addPlot("RTTP", plotVal)
	plot.addPlot("RobotSpeed", this._robots[0].speed.length())

	if (not this._brakePos && this._brakeTime && World.Time > this._startTime + this._brakeTime) {
		this._brakePos = this._robots[0].pos
	}
	if (this._brakePos) {
		vis.addCircle("rttp", this._brakePos, 0.04, vis.colors.whiteHalf, true)
	}

	if (not this._curvePos && this._curveTime && World.Time > this._startTime + this._brakeTime + this._curveTime) {
		this._curvePos = this._robots[0].pos
	}
	if (this._curvePos) {
		vis.addCircle("rttp", this._curvePos, 0.04, vis.colors.whiteHalf, true)
	}

	let restart = this._state == state
	this._state = state

	let endSpeedLength = state == 3 ? this._endSpeedLength : 0

	taskAssignments[this._robots[0]] = { class: MoveToPos,
		params = { this._positions[this._state], undefined, undefined, endSpeedLength }, restart: restart}
	return taskAssignments
}

return TimeToPos
