let Base = require "agent/base/agent"
let Defender = Class("Agent.Defender", Base)

import * as World from "base/world";

let Default = require "agent/defender/default"
let HandleBall = require "agent/defender/handleball"
let ManMark = require "agent/defender/manmark"
let ZoneDefense = require "agent/defender/zonedefense"
let Penalty = require "agent/defender/penalty"
let Piggy = require "agent/defender/piggy"
let BallEscort = require "agent/shared/ballescort"
let RescueFromDefenseArea = require "agent/shared/rescuefromdefensearea"

Defender._behaviors = {
	RescueFromDefenseArea,
	Penalty,
	BallEscort,
	HandleBall,
	ManMark,
	Piggy,
	ZoneDefense,
	Default
}

function Defender:_run () {
	this._activeBehavior._send.defenderFlag("all")
}

function Defender.takeRobot (robots) {
	for (let robot of robots) {
		if (robot.isVisible) {
			return robot
		}
	}
}

function Defender:keepRobot () {
	return this._robot.isVisible && this._robot != World.FriendlyKeeper && not this._robot.userControl
}

// worse rating if robot if farther away from own goal
function Defender:rateRobot () {
	if (this._activeBehavior && this._activeBehavior:forceKeepingInPool()) {
		return Infinity
	}
	return -World.Geometry.FriendlyGoal.distanceTo(this._robot.pos)
}

return Defender
