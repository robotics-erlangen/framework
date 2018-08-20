let GoalShot = Class("Test.Move.GoalShot", require "group/move/base")

import {MoveToPos} from "glados/task/shared/movetopos";
import * as World from "base/world";
let G = World.Geometry
import * as Ball from "glados/observer/ball";

import {ShootGoal} from "glados/task/attacker/shootgoal";

GoalShot.MIN_ROBOTS = 1
GoalShot.MAX_ROBOTS = 1

let TIMES = 3 // number of goalshots per distance
let INTERVAL = 0.5

function GoalShot.canStart () {
	return true
}

function GoalShot:_init () {
	this._shotTime = nil
	this._distance = 0
	this._times = 0
	log("")
	log("Distance: "+String(G.FieldHeightHalf - this._distance))
}

function GoalShot:_canContinue () {
	return true
}

function GoalShot:_update () {
	if (this._shotTime ? (World.Ball.pos.y < -G.FieldHeightHalf : World.Ball.pos.distanceTo(World.OpponentKeeper.pos) < this._robots[0].radius + World.Ball.radius + 0.02)) {
		log("Try No. "+String(this._times+1)+":")
		log("Ball travel time: "+String(World.Time - this._shotTime))
		this._shotTime = nil
		this._times = this._times + 1
		if (this._times == TIMES) {
			this._distance = this._distance + INTERVAL
			this._times = 0
			log("")
			log("Distance: "+String(G.FieldHeightHalf - this._distance))
		}
	}
}

function GoalShot:_updateTasks () {
	let taskAssignments = {}
	this._update()

	let prep = World.RefereeState == "IndirectOffensive"
	let shoot = World.RefereeState == "DirectOffensive"
	let abort = World.RefereeState == "KickoffOffensivePrepare"

	let pos = new Vector(0, this._distance)
	if (abort) {
		this._shotTime = nil
		taskAssignments[this._robots[0]] = {class: MoveToPos, params: {pos, Math.PI/2}, restart: true}
	} else if (prep) {
		taskAssignments[this._robots[0]] = {class: MoveToPos, params: {pos, Math.PI/2}, restart: true}
	} else if (Ball.isShot()) {
		this._shotTime = World.Time
		taskAssignments[this._robots[0]] = {class: MoveToPos, params: {pos, Math.PI/2}, restart: true}
	} else if (shoot) {
		taskAssignments[this._robots[0]] = {class: ShootGoal}
	} else {
		taskAssignments[this._robots[0]] = {class: MoveToPos, params: {pos, Math.PI/2}, restart: true}
	}


	return taskAssignments, this._robots[0]
}

return GoalShot
