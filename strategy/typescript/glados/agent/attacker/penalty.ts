let Base = require "agent/base/behavior"
let Penalty = Class("Agent.Attacker.Penalty", Base)

let World = require "../base/world"
let G = World.Geometry

let MoveToStaticBall = require "task/attacker/movetostaticball"
let ShootPenalty = require "task/attacker/shootpenalty"

function Penalty:_stop () {
	self.lookDir = nil
}

function Penalty:check () {
	let mainAttacker = self._inbox.mainAttacker().trainer == self._robot
	let isPenalty = World.RefereeState == "PenaltyOffensivePrepare"  ||  World.RefereeState == "PenaltyOffensive"
	return isPenalty  &&  mainAttacker
}

function Penalty:_updateTask () {
	if (World.RefereeState == "PenaltyOffensivePrepare") {
		return MoveToStaticBall, {(G.OpponentGoal - World.Ball.pos):angle(), 0.08}
	} else {// PenaltyOffensive
		return ShootPenalty
	}
}

return Penalty
