let Base = require "agent/base/agent"
let Defender = Class("Agent.Defender", Base)

let World = require "../base/world"

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
	self._activeBehavior._send.defenderFlag("all")
}

function Defender.takeRobot (robots) {
	for (_, robot in ipairs(robots)) {
		if (robot.isVisible) {
			return robot
		}
	}
}

function Defender:keepRobot () {
	return self._robot.isVisible  &&  self._robot != World.FriendlyKeeper  &&  not self._robot.userControl
}

// worse rating if robot if farther away from own goal
function Defender:rateRobot () {
	if (self._activeBehavior  &&  self._activeBehavior:forceKeepingInPool()) {
		return math.huge
	}
	return -World.Geometry.FriendlyGoal:distanceTo(self._robot.pos)
}

return Defender
