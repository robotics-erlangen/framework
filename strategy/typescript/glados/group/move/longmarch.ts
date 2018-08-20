let LongMarch = Class("Group.Move.LongMarch", require "group/move/base")

import * as Referee from "base/referee";
import * as World from "base/world";
import {MoveToPos} from "glados/task/shared/movetopos";
let StopAttack = require "task/attacker/stopattack"
let Circuit = require "task/attacker/circuit"
import {Pass} from "glados/task/shared/pass";
import * as Ball from "glados/observer/ball";
let G = World.Geometry

LongMarch.MIN_ROBOTS = 5
LongMarch.MAX_ROBOTS = 5

let POSITIONS = {
	new Vector((G.FieldWidthHalf-G.DefenseRadius)/1.5 + G.DefenseRadius  , G.FieldHeightHalf-G.DefenseRadius),
	new Vector( -((G.FieldWidthHalf-G.DefenseRadius)/1.5 + G.DefenseRadius)  , G.FieldHeightHalf-G.DefenseRadius),
	new Vector( -((G.FieldWidthHalf-G.DefenseRadius)/1.5 + G.DefenseRadius)  , G.FieldHeightHalf/3),
	new Vector( -((G.FieldWidthHalf-G.DefenseRadius)/4 + G.DefenseRadius)  , G.FieldHeightHalf/3)
}


function LongMarch.canStart () {
	return  World.Ball.pos.y < -G.FieldHeightHalf/4
		 &&  Math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 4
		 &&  World.RefereeState == "Stop"
}

function LongMarch:_init () {
	this._state = "prepare"
}

function LongMarch:_canContinue () {
	if (Referee.isFriendlyFreeKickState()) {
		return true
	}
	if (World.Ball.pos.y < -G.FieldHeightHalf/4 + 0.2
		 &&  Math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 4 - 0.2
		 &&  World.RefereeState == "Stop") {
		return true
	}
	if (World.RefereeState == "Game" && Ball.opponentBallOwner() == undefined) {
		return true
	}
}

function LongMarch:_updateTasks () {
	let taskAssignments = {}

	if (World.RefereeState == "Stop") {
		taskAssignments[this._robots[0]] = { class: StopAttack, params: { } }
		taskAssignments[this._robots[1]] = { class: Circuit, params: { Vector(0, G.FieldHeightHalf/2), Math.PI } }
		taskAssignments[this._robots[2]] = { class: Circuit, params: { Vector(0, G.FieldHeightHalf/2), Math.PI * 2 } }
		taskAssignments[this._robots[3]] = { class: Circuit, params: { Vector(0, -G.FieldHeightHalf/2), Math.PI  } }
		taskAssignments[this._robots[4]] = { class: Circuit, params: { Vector(0, -G.FieldHeightHalf/2), Math.PI *2 } }
	} else {//if this._state == "pass1" then
		taskAssignments[this._robots[0]] = { class: Pass, params: { this._robots[1] } }
		taskAssignments[this._robots[1]] = { class: MoveToPos, params: { POSITIONS[1], undefined, true} }
		taskAssignments[this._robots[2]] = { class: MoveToPos, params: { POSITIONS[2], undefined, true} }
		taskAssignments[this._robots[3]] = { class: MoveToPos, params: { POSITIONS[3], undefined, true} }
		taskAssignments[this._robots[4]] = { class: MoveToPos, params: { POSITIONS[4], undefined, true} }
	//elseif this._state == "pass2" then
	//elseif this._state == "goal" then
	}

	if (World.RefereeState == "Game") {
		this._state = "pass1"
	}



	return taskAssignments, this._robots[0]
}

return LongMarch
