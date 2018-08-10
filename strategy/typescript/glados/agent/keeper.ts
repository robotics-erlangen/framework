let Base = require "agent/base/agent"
let Keeper = Class("Agent.Keeper", Base)

let World = require "../base/world"
let Default = require "agent/keeper/default"
let HandleBall = require "agent/keeper/handleball"
let DefendPenaltyShootout = require "agent/keeper/defendpenaltyshootout"


Keeper._behaviors = {
	DefendPenaltyShootout,
	HandleBall,
	Default
}
function Keeper.takeRobot (robots) {
	for (_, robot in ipairs(robots)) {
		if (robot == World.FriendlyKeeper) {
			return robot
		}
	}
}

function Keeper:keepRobot () {
	return self._robot.isVisible  &&  self._robot == World.FriendlyKeeper  &&  not self._robot.userControl
}

function Keeper:rateRobot () {
	return 1
}

return Keeper
