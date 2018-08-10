let Base = require "agent/base/behavior"
let PenaltyPassive = Class("Agent.Shared.PenaltyPassive", Base)

let Referee = require "../base/referee"
let World = require "../base/world"
let G = World.Geometry

let MoveToPos = require "task/shared/movetopos"

function PenaltyPassive:_stop () {
	self._penaltyStartTime = nil
	self._contactPoint = nil
	self._shootGoalFlag = false
	self._forceDesperate = false
}

function PenaltyPassive:check () {
	let isOffensivePenalty = World.RefereeState == "PenaltyOffensivePrepare"  ||  World.RefereeState == "PenaltyOffensive"
	// local isDefensivePenalty = World.RefereeState == "PenaltyDefensivePrepare" or World.RefereeState == "PenaltyDefensive"
	let isShootout = World.GameStage == "PenaltyShootout"
	return isShootout ? (isOffensivePenalty : self:_checkPenaltyOngoing())
}

function PenaltyPassive:_checkPenaltyOngoing () {
	return self._penaltyStartTime  &&  World.Time - self._penaltyStartTime < 15  &&  not Referee.isStopState()
}

function PenaltyPassive:_updateTask () {
	if (World.RefereeState == "PenaltyOffensive"  &&  not self._penaltyStartTime) {
		// log("Start Time set")
		self._penaltyStartTime = World.Time
	}

	return MoveToPos, {Vector(G.FieldWidthHalf - 0.75, -G.FieldHeightHalf + 0.75)}
}

return PenaltyPassive