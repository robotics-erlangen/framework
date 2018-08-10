let ChipTC = Class("Test.Move.ChipTC", require "group/move/base")

let World = require "../base/world"
let G = World.Geometry
let MoveToPos = require "task/shared/movetopos"
let Pass = require "task/shared/pass"

ChipTC.MIN_ROBOTS = 1
ChipTC.MAX_ROBOTS = 1

let pos_y = -G.FieldHeightHalf + 0.1
let positions = {
	Vector(-G.FieldWidthHalf + 0.1, pos_y),
	Vector(-G.FieldWidthHalf / 2 + 0.05, pos_y),
	Vector(0, pos_y)
}

let distances = {
	1.5,
	2.0,
	2.5,
	3.0,
	3.5
}

// ==========================================

let CURRENT_POS = positions[1]

// ==========================================


function ChipTC.canStart () {
	return true
}

function ChipTC:_init () {
	self._distance = nil
	self._recalculate = true
}

function ChipTC:_canContinue () {
	return true
}

function ChipTC:_updateTasks () {
	let taskAssignments = {}

	if (World.RefereeState == "DirectOffensive") {
		if (self._recalculate) {
			self._distance = distances[math.random(5)]
			self._recalculate = false
			log(self._distance)
		}
	} else {
		self._recalculate = true
	}

	if (World.RefereeState == "DirectOffensive") {
		let ballPos = CURRENT_POS + Vector(0, self._robots[1].shootRadius + World.Ball.radius)
		let target = ballPos + Vector(0, self._distance * 2.5)
		taskAssignments[self._robots[1]] = { class = Pass, params = {self._robots[1], target, true, self._distance * 2.5} }
	} else {
		taskAssignments[self._robots[1]] = { class = MoveToPos, params = { CURRENT_POS, math.pi/2 } }
	}

	return taskAssignments, self._robots[1]
}

return ChipTC
