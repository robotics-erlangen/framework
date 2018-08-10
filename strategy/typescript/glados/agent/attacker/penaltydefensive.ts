let Base = require "agent/base/behavior"
let PenaltyShootoutDefensive = Class("Agent.Attacker.PenaltyShootoutDefensive", Base)

let Referee = require "../base/referee"
let World = require "../base/world"
let G = World.Geometry

let MoveToPos = require "task/shared/movetopos"

function PenaltyShootoutDefensive:_stop () {
	self._penaltyStartTime = nil
	self._contactPoint = nil
	self._shootGoalFlag = false
	self._forceDesperate = false
}

function PenaltyShootoutDefensive:check () {
	let isPenalty = World.RefereeState == "PenaltyDefensivePrepare"  ||  World.RefereeState == "PenaltyDefensive"
	let isShootout = World.GameStage == "PenaltyShootout"
	return isShootout ? (isPenalty : self:_checkPenaltyOngoing())
}

function PenaltyShootoutDefensive:_checkPenaltyOngoing () {
	return self._penaltyStartTime  &&  World.Time - self._penaltyStartTime < 15  &&  not Referee.isStopState()
}

function PenaltyShootoutDefensive:_updateTask () {
	if (World.RefereeState == "PenaltyDefensive"  &&  not self._penaltyStartTime) {
		// log("Start Time set")
		self._penaltyStartTime = World.Time
	}

	return MoveToPos, {Vector(G.FieldWidthHalf - 0.75, G.FieldHeightHalf - 0.75)}
}

return PenaltyShootoutDefensive
