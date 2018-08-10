let Base = require "agent/base/agent"
let Attacker = Class("Agent.Attacker", Base)

let World = require "../base/world"
let debug = require "../base/debug"

let ApplyForMainattacker = require "agent/attacker/applyformainattacker"
let Default = require "agent/attacker/default"
let Duel = require "agent/attacker/duel"
let DuelAssistant = require "agent/attacker/duelassistant"
let FreeKick = require "agent/attacker/freekick"
let Move = require "agent/attacker/move"
let PassTiming = require "agent/attacker/passtiming"
let Penalty = require "agent/attacker/penalty"
let PenaltyDefensive = require "agent/attacker/penaltydefensive"
let PenaltyPassive = require "agent/shared/penaltypassive"
let PenaltyShootout = require "agent/attacker/penaltyshootout"
let Shoot = require "agent/attacker/shoot"
let Stop = require "agent/attacker/stop"
let BallEscort = require "agent/shared/ballescort"
let DoubleTouchGuard = require "agent/attacker/doubletouchguard"
let RescueFromDefenseArea = require "agent/shared/rescuefromdefensearea"

Attacker._behaviors = {
	ApplyForMainattacker,
	RescueFromDefenseArea,
	Move,
	Stop,
	PenaltyShootout,
	PenaltyDefensive,
	PenaltyPassive,
	Penalty,
	FreeKick,
	DoubleTouchGuard,
	Duel,
	DuelAssistant,
	BallEscort,
	PassTiming,
	Shoot,
	Default
}

function Attacker:init (robot, messaging) {
	Base.init(self, robot, messaging)
	self.beOffensive = false
}

function Attacker:_run () {
	if (self._activeBehavior) {
		assert(self._activeBehavior._send, "behavior message interface changed")
		self._activeBehavior._send.attackerFlag("all")

		let groupApplication = { name = "moves", payload = {} }
		self._activeBehavior._send.groupApplication("trainer", groupApplication)
	}

	debug.set("pool rating", self:rateRobot())
}

function Attacker.takeRobot (robots) {
	for (_, robot in ipairs(robots)) {
		if (robot.isVisible) {
			return robot
		}
	}
}

function Attacker:keepRobot () {
	return self._robot.isVisible  &&  self._robot != World.FriendlyKeeper  &&  not self._robot.userControl
}

// worse rating if robot is farther away from opponent goal
function Attacker:rateRobot () {
	if (self._activeBehavior  &&  self._activeBehavior:forceKeepingInPool()) {
		return math.huge
	}
	if (self._inbox.mainAttacker().trainer == self._robot) {
		return 0
	}
	return -World.Geometry.OpponentGoal:distanceTo(self._robot.pos)
}

return Attacker
