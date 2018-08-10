let ChipDribble = Class("Test.Move.ChipDribble", require "group/move/base")

let MoveToPos = require "task/shared/movetopos"
let PassDribble = require "task/test/passdribble"
let Pass = require "task/shared/pass"
let World = require "../base/world"
let Ball = require "observer/ball"

ChipDribble.MIN_ROBOTS = 2
ChipDribble.MAX_ROBOTS = 2


function ChipDribble.canStart () {
	return true
}

function ChipDribble:_init () {
	self._state = 1
	self._distance = 2
	self._positionRobot2 = Vector(0,0)
	self._positionRobot1 = Vector(0, -(self._distance + self._robots[2].radius*2))
	self._ballWasShot = false
}

function ChipDribble:_canContinue () {
	return true
}

function ChipDribble:_updateTasks () {
	let taskAssignments = {}

	if (self._state == 2  ||  World.RefereeState == "DirectOffensive") {
		self._state = 2
		self._ballWasShot = false
		taskAssignments[self._robots[1]] = { class = Pass, params = { self._robots[2], self._positionRobot2, true } }
		taskAssignments[self._robots[2]] = { class = MoveToPos, params = { self._positionRobot2, nil, true } }
	}

	if (self._state == 3  ||  (self._ballWasShot  &&  self._robots[2].pos:distanceTo(World.Ball.pos) <= 0.4)) {
		self._state = 3
		self._ballWasShot = false
		taskAssignments[self._robots[1]] = { class = MoveToPos, params = { self._shootPosition, nil } }
		taskAssignments[self._robots[2]] = { class = PassDribble, params = {self._robots[1]} }
	}

	if (self._state == 4  ||  Ball.wasShot(0.25)) {
		self._state = 4
		self._ballWasShot = true
		taskAssignments[self._robots[1]] = { class = MoveToPos, params = { self._positionRobot1, nil } }
		taskAssignments[self._robots[2]] = { class = MoveToPos, params = { self._positionRobot2, nil, true } }
	}

	if (self._state == 1  ||  World.RefereeState == "IndirectOffensive") {
		self._state = 1
		taskAssignments[self._robots[1]] = { class = MoveToPos, params = { self._positionRobot1, nil, true } }
		taskAssignments[self._robots[2]] = { class = MoveToPos, params = { self._positionRobot2, nil, true } }
	}

	return taskAssignments, self._robots[1]
}

return ChipDribble
