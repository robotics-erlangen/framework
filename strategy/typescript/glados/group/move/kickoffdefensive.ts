let KickOffDefensive = Class("Group.Move.KickOffDefensive", require "group/move/base")

import * as World from "base/world";
let G = World.Geometry

let ManMark = require "task/defender/manmark"
import {MoveToPos} from "glados/task/shared/movetopos";
let StopAttack = require "task/attacker/stopattack"
let MovesHelper = require "util/moveshelper"

KickOffDefensive.MIN_ROBOTS = 1
KickOffDefensive.MAX_ROBOTS = 3

function KickOffDefensive.canStart () {
	return World.RefereeState == "KickoffDefensivePrepare"
			 ||  World.RefereeState == "KickoffDefensive"
}

function KickOffDefensive:_init () {
	this._fallbackPos = {
		new Vector(-G.FieldWidthHalf * 0.5, -0.4),
		new Vector(G.FieldWidthHalf * 0.5, -0.4),
	}

	let positions = { Vector(0, 0) }
	for (i = 1, #this._robots-1) {
		table.insert(positions, this._fallbackPos[i])
	}
	this._assignments = MovesHelper.assignRobots(this._robots, positions, 0)
	this._targetLeft = nil
	this._targetRight = nil
}

function KickOffDefensive:_canContinue () {
	return World.RefereeState == "KickoffDefensivePrepare"
			 ||  World.RefereeState == "KickoffDefensive"
}

let getTarget = function (prevTarget, fallbackPos) {
	let maxDist = 2.5
	let distHysteresis = 1

	let prevDist = prevTarget ? prevTarget.pos.distanceTo(fallbackPos) : Infinity
	if (prevDist > maxDist || (prevTarget && Math.abs(prevTarget.pos.x) < G.CenterCircleRadius)) {
		prevDist = Infinity
	}

	let closestTarget
	let closestDist = Infinity
	for (_,r in ipairs(World.OpponentRobots)) {
		if (r.pos.x * fallbackPos.x > 0 && Math.abs(r.pos.x) > G.CenterCircleRadius + 0.3) {
			let dist = r.pos.distanceTo(fallbackPos)
			if (dist < closestDist) {
				closestTarget = r
				closestDist = dist
			}
		}
	}

	let dist = prevDist
	let target = prevTarget
	if (closestDist + distHysteresis < prevDist) {
		dist = closestDist
		target = closestTarget
	}

	if (dist < Infinity) {
		return target, target != prevTarget
	}

	return nil
}

function KickOffDefensive:_updateTasks () {
	let restartLeft, restartRight
	this._targetLeft, restartLeft = getTarget(this._targetLeft, this._fallbackPos[1])
	this._targetRight, restartRight = getTarget(this._targetRight, this._fallbackPos[2])

	let taskAssignments = {}
	taskAssignments[this._robots[this._assignments[1]]] = { class: StopAttack, params: {} }

	if (#this._robots > 1) {
		if (this._targetLeft) {
			taskAssignments[this._robots[this._assignments[2]]] = { class: ManMark, params: { this._targetLeft }, restart: restartLeft }
		} else {
			taskAssignments[this._robots[this._assignments[2]]] = { class: MoveToPos, params: { this._fallbackPos[1] } }
		}
	}
	if (#this._robots > 2) {
		if (this._targetRight) {
			taskAssignments[this._robots[this._assignments[3]]] = { class: ManMark, params: { this._targetRight }, restart: restartRight }
		} else {
			taskAssignments[this._robots[this._assignments[3]]] = { class: MoveToPos, params: { this._fallbackPos[2] } }
		}
	}

	return taskAssignments, this._robots[this._assignments[1]]
}

return KickOffDefensive
