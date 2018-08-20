import {Behavior} from "glados/agent/base/behavior";
let PenaltyPassive = Class("Agent.Shared.PenaltyPassive", Base)

import * as Referee from "base/referee";
import * as World from "base/world";
let G = World.Geometry

import {MoveToPos} from "glados/task/shared/movetopos";

function PenaltyPassive:_stop () {
	this._penaltyStartTime = nil
	this._contactPoint = nil
	this._shootGoalFlag = false
	this._forceDesperate = false
}

function PenaltyPassive:check () {
	let isOffensivePenalty = World.RefereeState == "PenaltyOffensivePrepare" || World.RefereeState == "PenaltyOffensive"
	// local isDefensivePenalty = World.RefereeState == "PenaltyDefensivePrepare" or World.RefereeState == "PenaltyDefensive"
	let isShootout = World.GameStage == "PenaltyShootout"
	return isShootout ? (isOffensivePenalty : this._checkPenaltyOngoing())
}

function PenaltyPassive:_checkPenaltyOngoing () {
	return this._penaltyStartTime && World.Time - this._penaltyStartTime < 15 && not Referee.isStopState()
}

function PenaltyPassive:_updateTask () {
	if (World.RefereeState == "PenaltyOffensive" && not this._penaltyStartTime) {
		// log("Start Time set")
		this._penaltyStartTime = World.Time
	}

	return MoveToPos, {new Vector(G.FieldWidthHalf - 0.75, -G.FieldHeightHalf + 0.75)}
}

return PenaltyPassive