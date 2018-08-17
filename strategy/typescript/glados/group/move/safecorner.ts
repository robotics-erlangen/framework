let SafeCorner = Class("Group.Move.SafeCorner", require "group/move/base")

import * as Referee from "base/referee";
import * as World from "base/world";
let Freekick = require "agent/attacker/freekick"
import {MoveToPos} from "glados/task/shared/movetopos";
let StopAttack = require "task/attacker/stopattack"
import {Striker} from "glados/task/attacker/striker";
let G = World.Geometry

SafeCorner.MIN_ROBOTS = 5
SafeCorner.MAX_ROBOTS = 5

function SafeCorner.canStart () {
	return  World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 //and Referee.opponentTouchedLast()
		 &&  Math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2
		 &&  World.RefereeState == "Stop"
}

function SafeCorner:_init () {
	this._ballSide = (World.Ball.pos.x > 0) ? 1 : -1 //Instanzvariable
	this._goalDist = G.DefenseRadius + 0.4
}

function SafeCorner:_canContinue () {
	if (Referee.isFriendlyFreeKickState()) {
		return true
	}
	return World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 - 0.2 //Eckposition festlegen
		 &&  Math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2 - 0.2 //G: geometry
		 &&  World.RefereeState == "Stop"
}

function SafeCorner:_updateTasks () {

	let taskAssignments = {}
	if (World.RefereeState == "Stop") {
		taskAssignments[this._robots[0]] = { class: StopAttack, params: { } }
	} else if (Referee.isFriendlyFreeKickState()) {
		taskAssignments[this._robots[0]] = { behavior: Freekick }
	}

	taskAssignments[this._robots[1]] = { class: Striker, params: { Vector(0, G.FieldHeightHalf * -0.5), new Vector(0, 0) }}
	taskAssignments[this._robots[2]] = { class: Striker, params: { Vector(this._ballSide * G.FieldWidthHalf * -0.5, G.FieldHeightHalf * -0.5),
		Vector(this._ballSide * G.FieldWidthHalf * -0.5, 0) }}
	taskAssignments[this._robots[3]] = { class: MoveToPos, params: { Vector(0.3, G.OpponentGoal.y - G.DefenseRadius - 0.4)}}
	// taskAssignments[this._robots[4]] = { class: MoveToPos, params: { Vector(, )}}


	return taskAssignments, this._robots[0]
}
return SafeCorner
