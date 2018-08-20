import {Behavior} from "glados/agent/base/behavior";
let PenaltyShootoutDefensive = Class("Agent.Attacker.PenaltyShootoutDefensive", Base)

import * as Referee from "base/referee";
import * as World from "base/world";
let G = World.Geometry

import {MoveToPos} from "glados/task/shared/movetopos";

function PenaltyShootoutDefensive:_stop () {
	this._penaltyStartTime = nil
	this._contactPoint = nil
	this._shootGoalFlag = false
	this._forceDesperate = false
}

function PenaltyShootoutDefensive:check () {
	let isPenalty = World.RefereeState == "PenaltyDefensivePrepare" || World.RefereeState == "PenaltyDefensive"
	let isShootout = World.GameStage == "PenaltyShootout"
	return isShootout ? (isPenalty : this._checkPenaltyOngoing())
}

function PenaltyShootoutDefensive:_checkPenaltyOngoing () {
	return this._penaltyStartTime && World.Time - this._penaltyStartTime < 15 && not Referee.isStopState()
}

function PenaltyShootoutDefensive:_updateTask () {
	if (World.RefereeState == "PenaltyDefensive" && not this._penaltyStartTime) {
		// log("Start Time set")
		this._penaltyStartTime = World.Time
	}

	return MoveToPos, {new Vector(G.FieldWidthHalf - 0.75, G.FieldHeightHalf - 0.75)}
}

return PenaltyShootoutDefensive
