import {Behavior} from "glados/agent/base/behavior";
let DefendPenaltyShootout = Class("Agent.Defender.DefendPenaltyShootout", Base)

import * as Referee from "base/referee";
import * as World from "base/world";
let G = World.Geometry
let Keeper = require "task/keeper/keeper"
let ShootoutKeeper = require "task/keeper/shootoutkeeper"

let CRITICAL_DISTANCE = 4


function DefendPenaltyShootout:_stop () {
	this._penaltyStartTime = nil
}

function DefendPenaltyShootout:check () {
	// log("1: "+tostring(World.GameStage == "PenaltyShootout"))
	// log("2: "+tostring(World.RefereeState == "PenaltyDefensivePrepare"))
	// log("3: "+tostring(World.RefereeState == "PenaltyDefensive"))
	// log("4: "+tostring(this._checkPenaltyOngoing()))
	return World.GameStage == "PenaltyShootout"
 ? (World.RefereeState == "PenaltyDefensivePrepare" : World.RefereeState == "PenaltyDefensive" || this._checkPenaltyOngoing())
}

function DefendPenaltyShootout:_checkPenaltyOngoing () {
	return this._penaltyStartTime && World.Time - this._penaltyStartTime < 15 && not Referee.isStopState()
}


function DefendPenaltyShootout:_updateTask () {
	if (World.RefereeState == "PenaltyDefensive" && not this._penaltyStartTime) {
		this._penaltyStartTime = World.Time
	}

	for (_, r in ipairs(World.OpponentRobots)) {
		if (World.RefereeState == "Game" && r.pos.distanceTo(G.FriendlyGoal) < CRITICAL_DISTANCE) {
			return ShootoutKeeper
		}
	}
	return Keeper
}

return DefendPenaltyShootout
