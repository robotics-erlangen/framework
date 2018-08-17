let KickOff = Class("Group.Move.KickOff", require "group/move/base")

import * as World from "base/world";
let G = World.Geometry

let Freekick = require "agent/attacker/freekick"
let AcceptPass = require "task/attacker/acceptpass"
import {MoveToPos} from "glados/task/shared/movetopos";
let StopAttack = require "task/attacker/stopattack"
import {Striker} from "glados/task/attacker/striker";
let MovesHelper = require "util/moveshelper"
import * as Attack from "glados/util/attack";

KickOff.MIN_ROBOTS = 2
KickOff.MAX_ROBOTS = 3

function KickOff.canStart () {
	return World.RefereeState == "KickoffOffensivePrepare"
}

function KickOff:_init () {
	this._assistantPos = [
		new Vector(-G.FieldWidthHalf * 0.7, -0.7),
		new Vector(G.FieldWidthHalf * 0.7, -0.7),
	];
	this._passDest = [
		new Vector(-G.FieldWidthHalf * 0.9, -0.2),
		new Vector(G.FieldWidthHalf * 0.9, -0.2),
	];

	let positions = { Vector(0, 0) }
	for (i = 1,#this._robots-1) {
		table.insert(positions, this._assistantPos[i])
	}
	this._assignments = MovesHelper.assignRobots(this._robots, positions, 0)
}

function KickOff:_canContinue () {
	return World.RefereeState == "KickoffOffensivePrepare"
			 ||  World.RefereeState == "KickoffOffensive"
}

function KickOff:_updateTasks () {
	let taskAssignments = {}

	if (World.RefereeState == "KickoffOffensivePrepare") {
		taskAssignments[this._robots[this._assignments[1]]] = { class: StopAttack, params: {} }
		taskAssignments[this._robots[this._assignments[2]]] = { class: MoveToPos, params: { this._assistantPos[1] } }
		if (#this._robots == 3) {
			taskAssignments[this._robots[this._assignments[3]]] = { class: MoveToPos, params: { this._assistantPos[2] } }
		}
	} else {
		let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
		taskAssignments[this._robots[this._assignments[1]]] = { behavior: Freekick }
		for (i=1,#this._robots-1) {
			if (Attack.checkPassInfos(this._robots[this._assignments[i+1]], passInfoTable, false)) {
				taskAssignments[this._robots[this._assignments[i+1]]] = { class: AcceptPass }
			} else {
				taskAssignments[this._robots[this._assignments[i+1]]] = { class: Striker, params: { this._assistantPos[i], this._passDest[i] } }
			}
		}
	}

	return taskAssignments, this._robots[this._assignments[1]]
}

return KickOff
