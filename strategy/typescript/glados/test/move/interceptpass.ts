let InterceptPass = Class("Test.Move.InterceptPass", require "group/move/base")

import * as World from "base/world";
import {Pass} from "glados/task/shared/pass";
import {Striker} from "glados/task/attacker/striker";
import * as Ball from "glados/observer/ball";

InterceptPass.MIN_ROBOTS = 2
InterceptPass.MAX_ROBOTS = 2

let LEFT_POS = World.Geometry.FieldHeightHalf - 2
let HEIGHT_POS = World.Geometry.FieldWidthHalf - 0.3

function InterceptPass.canStart () {
	return true
}

function InterceptPass:_init () {
	this._lastMainAttacker = nil
}

function InterceptPass:_canContinue () {
	return true
}

function InterceptPass:_updateTasks () {
	let taskAssignments = {}

	let mainAttacker
	let default1 = new Vector(HEIGHT_POS, LEFT_POS)
	let default2 = new Vector(-HEIGHT_POS, LEFT_POS)
	if (Ball.receivesPass(this._robots[0]) || (not Ball.receivesPass(this._robots[1])  &&
			World.Ball.pos.x > 0)) {
		if (this._lastMainAttacker == this._robots[0]) {
			taskAssignments[this._robots[0]] = {class: Pass, params: {this._robots[1]}}
		} else {
			taskAssignments[this._robots[0]] = {class: Striker, params: {default1, default1}}
		}
		mainAttacker = this._robots[0]
	} else {
		taskAssignments[this._robots[0]] = {class: Striker, params: {default1, default1}}
	}
	if (not mainAttacker) {
		if (this._lastMainAttacker == this._robots[1]) {
			taskAssignments[this._robots[1]] = {class: Pass, params: {this._robots[0]}}
		} else {
			taskAssignments[this._robots[1]] = {class: Striker, params: {default2, default2}}
		}
		mainAttacker = this._robots[1]
	} else {
		taskAssignments[this._robots[1]] = {class: Striker, params: {default2, default2}}
	}
	this._lastMainAttacker = mainAttacker
	return taskAssignments, mainAttacker
}

return InterceptPass
