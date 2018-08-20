let ChipDribble = Class("Test.Move.ChipDribble", require "group/move/base")

import {MoveToPos} from "glados/task/shared/movetopos";
let PassDribble = require "task/test/passdribble"
import {Pass} from "glados/task/shared/pass";
import * as World from "base/world";
import * as Ball from "glados/observer/ball";

ChipDribble.MIN_ROBOTS = 2
ChipDribble.MAX_ROBOTS = 2


function ChipDribble.canStart () {
	return true
}

function ChipDribble:_init () {
	this._state = 1
	this._distance = 2
	this._positionRobot2 = new Vector(0,0)
	this._positionRobot1 = new Vector(0, -(this._distance + this._robots[1].radius*2))
	this._ballWasShot = false
}

function ChipDribble:_canContinue () {
	return true
}

function ChipDribble:_updateTasks () {
	let taskAssignments = {}

	if (this._state == 2 || World.RefereeState == "DirectOffensive") {
		this._state = 2
		this._ballWasShot = false
		taskAssignments[this._robots[0]] = { class: Pass, params: { this._robots[1], this._positionRobot2, true } }
		taskAssignments[this._robots[1]] = { class: MoveToPos, params: { this._positionRobot2, undefined, true } }
	}

	if (this._state == 3 || (this._ballWasShot && this._robots[1].pos.distanceTo(World.Ball.pos) <= 0.4)) {
		this._state = 3
		this._ballWasShot = false
		taskAssignments[this._robots[0]] = { class: MoveToPos, params: { this._shootPosition, undefined } }
		taskAssignments[this._robots[1]] = { class: PassDribble, params: {this._robots[0]} }
	}

	if (this._state == 4 || Ball.wasShot(0.25)) {
		this._state = 4
		this._ballWasShot = true
		taskAssignments[this._robots[0]] = { class: MoveToPos, params: { this._positionRobot1, undefined } }
		taskAssignments[this._robots[1]] = { class: MoveToPos, params: { this._positionRobot2, undefined, true } }
	}

	if (this._state == 1 || World.RefereeState == "IndirectOffensive") {
		this._state = 1
		taskAssignments[this._robots[0]] = { class: MoveToPos, params: { this._positionRobot1, undefined, true } }
		taskAssignments[this._robots[1]] = { class: MoveToPos, params: { this._positionRobot2, undefined, true } }
	}

	return taskAssignments, this._robots[0]
}

return ChipDribble
