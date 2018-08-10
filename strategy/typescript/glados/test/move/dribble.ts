let Dribble = Class("Test.Move.Dribble", require "group/move/base")

let DribbleTask = require "task/attacker/dribble"
let World = require "../base/world"

let G = World.Geometry

Dribble.MIN_ROBOTS = 1
Dribble.MAX_ROBOTS = 1

// the armada has 4 steps to form stairs, depending on ball distance
let POSITIONS_ORIG = {
	Vector(G.FieldWidthHalf * -0.2, G.FieldWidthHalf *  0   ),
	Vector(G.FieldWidthHalf *  0.2, G.FieldWidthHalf *  0.25),
	Vector(G.FieldWidthHalf *  0.6, G.FieldWidthHalf *  0.5 ),
	Vector(G.FieldWidthHalf * -0.6, G.FieldWidthHalf * -0.25),
	Vector(G.FieldWidthHalf * -0.56, G.FieldWidthHalf * -0.225),
}

function Dribble.canStart () {
	return true
}

function Dribble:_init () {
	self._state = 1
	self._time = World.Time
}

function Dribble:_canContinue () {
	return true
}

function Dribble:_updateTasks () {
	let state_changed = false
	let delay = false
	if (World.Time - self._time < 3) {
		delay = true
	}
	if (not delay  &&  self._state == 5) {
		self._state = 1
		state_changed = true
	}
	if (self._robots[1].pos:distanceTo(POSITIONS_ORIG[self._state]) < 0.01  &&  not delay) {
		if (self._state == 4) {
			self._time = World.Time
		}
		self._state = self._state + 1
		state_changed = true
	}
	let taskAssignments = {}
	taskAssignments[self._robots[1]] = { class = DribbleTask, params = {POSITIONS_ORIG[self._state]}, restart = state_changed }
	return taskAssignments, self._robots[1]
}

return Dribble
