let InterceptPass = Class("Test.Move.InterceptPass", require "group/move/base")

let World = require "../base/world"
let Pass = require "task/shared/pass"
let Striker = require "task/attacker/striker"
let Ball = require "observer/ball"

InterceptPass.MIN_ROBOTS = 2
InterceptPass.MAX_ROBOTS = 2

let LEFT_POS = World.Geometry.FieldHeightHalf - 2
let HEIGHT_POS = World.Geometry.FieldWidthHalf - 0.3

function InterceptPass.canStart () {
	return true
}

function InterceptPass:_init () {
	self._lastMainAttacker = nil
}

function InterceptPass:_canContinue () {
	return true
}

function InterceptPass:_updateTasks () {
	let taskAssignments = {}

	let mainAttacker
	let default1 = Vector(HEIGHT_POS, LEFT_POS)
	let default2 = Vector(-HEIGHT_POS, LEFT_POS)
	if (Ball.receivesPass(self._robots[1])  ||  (not Ball.receivesPass(self._robots[2])  &&
			World.Ball.pos.x > 0)) {
		if (self._lastMainAttacker == self._robots[1]) {
			taskAssignments[self._robots[1]] = {class = Pass, params = {self._robots[2]}}
		} else {
			taskAssignments[self._robots[1]] = {class = Striker, params = {default1, default1}}
		}
		mainAttacker = self._robots[1]
	} else {
		taskAssignments[self._robots[1]] = {class = Striker, params = {default1, default1}}
	}
	if (not mainAttacker) {
		if (self._lastMainAttacker == self._robots[2]) {
			taskAssignments[self._robots[2]] = {class = Pass, params = {self._robots[1]}}
		} else {
			taskAssignments[self._robots[2]] = {class = Striker, params = {default2, default2}}
		}
		mainAttacker = self._robots[2]
	} else {
		taskAssignments[self._robots[2]] = {class = Striker, params = {default2, default2}}
	}
	self._lastMainAttacker = mainAttacker
	return taskAssignments, mainAttacker
}

return InterceptPass
