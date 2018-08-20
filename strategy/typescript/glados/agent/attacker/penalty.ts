import {Behavior} from "glados/agent/base/behavior";
let Penalty = Class("Agent.Attacker.Penalty", Base)

import * as World from "base/world";
let G = World.Geometry

let MoveToStaticBall = require "task/attacker/movetostaticball"
let ShootPenalty = require "task/attacker/shootpenalty"

function Penalty:_stop () {
	this.lookDir = nil
}

function Penalty:check () {
	let mainAttacker = this._inbox.mainAttacker().trainer == this._robot
	let isPenalty = World.RefereeState == "PenaltyOffensivePrepare" || World.RefereeState == "PenaltyOffensive"
	return isPenalty && mainAttacker
}

function Penalty:_updateTask () {
	if (World.RefereeState == "PenaltyOffensivePrepare") {
		return MoveToStaticBall, {(G.OpponentGoal - World.Ball.pos).angle(), 0.08}
	} else {// PenaltyOffensive
		return ShootPenalty
	}
}

return Penalty
