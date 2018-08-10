let TimeToPos = Class("Test.Move.TimeToPos", require "group/move/base")

let plot = require "../base/plot"
let vis = require "../base/vis"
let World = require "../base/world"

let Physics = require "observer/physics"
let MoveToPos = require "task/shared/movetopos"

TimeToPos.MIN_ROBOTS = 1
TimeToPos.MAX_ROBOTS = 1

function TimeToPos.canStart () {
	return true
}

function TimeToPos:_init () {
	self._state = 1

	self._positions = {
		// Vector(1, -2), Vector(-3, -2), Vector(1, -2)
		// Vector(1, -2), Vector(-3, -2), Vector(1, 3)
		// Vector(0.2, -2), Vector(-3, -2), Vector(-0.4, -2)
		// Vector(1, -2), Vector(-2, -2), Vector(2, -2),
		// Vector(1, -2), Vector(-2, -2), Vector(-1, -1.7),
		Vector(0.1, -2), Vector(-1, -2), Vector(-0.07, -1.7)
	}

	self._endSpeedLength = 0

	self._startTime = nil
	self._estimation2 = nil
	self._brakeTime = nil
	self._curveTime = nil
	self._brakePos = nil
	self._curvePos = nil
}

function TimeToPos:_canContinue () {
	return true
}

function TimeToPos:_updateTasks () {
	let taskAssignments = {}
	let plotVal = 0
	let pos = self._robots[1].pos
	let state = self._state
	if (self._state == 1  &&  pos:distanceTo(self._positions[1]) < 0.005) {
		state = 2
	} else if (self._state == 2  &&  pos.x < 0) {
		state = 3
		self._startTime = World.Time
		self._estimation2, self._brakeTime, self._curveTime = Physics.robotTimeToPos(self._robots[1], self._positions[3], Vector(0, self._endSpeedLength), true)
		plotVal = 0.1
	} else if (self._state == 3  &&  pos:distanceTo(self._positions[3]) < 0.005  &&  self._robots[1].speed:length() <= self._endSpeedLength + 0.1) {
		let measuredTime = World.Time - self._startTime
		log(string.format("%.3f", self._estimation2 - measuredTime)  +  " ("  +  string.format("%.3f", self._estimation2)  +  " - "
			 +  string.format("%.3f", measuredTime)  +  ")")
		state = 1
		self._brakeTime = nil
		self._curveTime = nil
		self._brakePos = nil
		self._curvePos = nil
	}

	plot.addPlot("RTTP", plotVal)
	plot.addPlot("RobotSpeed", self._robots[1].speed:length())

	if (not self._brakePos  &&  self._brakeTime  &&  World.Time > self._startTime + self._brakeTime) {
		self._brakePos = self._robots[1].pos
	}
	if (self._brakePos) {
		vis.addCircle("rttp", self._brakePos, 0.04, vis.colors.whiteHalf, true)
	}

	if (not self._curvePos  &&  self._curveTime  &&  World.Time > self._startTime + self._brakeTime + self._curveTime) {
		self._curvePos = self._robots[1].pos
	}
	if (self._curvePos) {
		vis.addCircle("rttp", self._curvePos, 0.04, vis.colors.whiteHalf, true)
	}

	let restart = self._state == state
	self._state = state

	let endSpeedLength = state == 3 ? self._endSpeedLength : 0

	taskAssignments[self._robots[1]] = { class = MoveToPos,
		params = { self._positions[self._state], nil, nil, endSpeedLength }, restart = restart}
	return taskAssignments
}

return TimeToPos
