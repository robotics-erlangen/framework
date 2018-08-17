let Base = require "agent/base/agent"
let Attacker = Class("Agent.Attacker", Base)

import * as World from "base/world";
import * as debug from "base/debug";

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
	this.beOffensive = false
}

function Attacker:_run () {
	if (this._activeBehavior) {
		assert(this._activeBehavior._send, "behavior message interface changed")
		this._activeBehavior._send.attackerFlag("all")

		let groupApplication = { name = "moves", payload = {} }
		this._activeBehavior._send.groupApplication("trainer", groupApplication)
	}

	debug.set("pool rating", this.rateRobot())
}

function Attacker.takeRobot (robots) {
	for (let robot of robots) {
		if (robot.isVisible) {
			return robot
		}
	}
}

function Attacker:keepRobot () {
	return this._robot.isVisible && this._robot != World.FriendlyKeeper && not this._robot.userControl
}

// worse rating if robot is farther away from opponent goal
function Attacker:rateRobot () {
	if (this._activeBehavior && this._activeBehavior:forceKeepingInPool()) {
		return Infinity
	}
	if (this._inbox.mainAttacker().trainer == this._robot) {
		return 0
	}
	return -World.Geometry.OpponentGoal.distanceTo(this._robot.pos)
}

return Attacker
