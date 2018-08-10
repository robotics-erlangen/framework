let Base = require "agent/base/behavior"
let DefendPenaltyShootout = Class("Agent.Defender.DefendPenaltyShootout", Base)

let Referee = require "../base/referee"
let World = require "../base/world"
let G = World.Geometry
let Keeper = require "task/keeper/keeper"
let ShootoutKeeper = require "task/keeper/shootoutkeeper"

let CRITICAL_DISTANCE = 4


function DefendPenaltyShootout:_stop () {
	self._penaltyStartTime = nil
}

function DefendPenaltyShootout:check () {
	// log("1: "..tostring(World.GameStage == "PenaltyShootout"))
	// log("2: "..tostring(World.RefereeState == "PenaltyDefensivePrepare"))
	// log("3: "..tostring(World.RefereeState == "PenaltyDefensive"))
	// log("4: "..tostring(self:_checkPenaltyOngoing()))
	return World.GameStage == "PenaltyShootout"
 ? (World.RefereeState == "PenaltyDefensivePrepare" : World.RefereeState == "PenaltyDefensive"  ||  self:_checkPenaltyOngoing())
}

function DefendPenaltyShootout:_checkPenaltyOngoing () {
	return self._penaltyStartTime  &&  World.Time - self._penaltyStartTime < 15  &&  not Referee.isStopState()
}


function DefendPenaltyShootout:_updateTask () {
	if (World.RefereeState == "PenaltyDefensive"  &&  not self._penaltyStartTime) {
		self._penaltyStartTime = World.Time
	}

	for (_, r in ipairs(World.OpponentRobots)) {
		if (World.RefereeState == "Game"  &&  r.pos:distanceTo(G.FriendlyGoal) < CRITICAL_DISTANCE) {
			return ShootoutKeeper
		}
	}
	return Keeper
}

return DefendPenaltyShootout
