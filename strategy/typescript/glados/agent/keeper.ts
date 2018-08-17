let Base = require "agent/base/agent"
let Keeper = Class("Agent.Keeper", Base)

import * as World from "base/world";
let Default = require "agent/keeper/default"
let HandleBall = require "agent/keeper/handleball"
let DefendPenaltyShootout = require "agent/keeper/defendpenaltyshootout"


Keeper._behaviors = {
	DefendPenaltyShootout,
	HandleBall,
	Default
};
function Keeper.takeRobot (robots) {
	for (let robot of robots) {
		if (robot == World.FriendlyKeeper) {
			return robot;
		}
	}
}

function Keeper:keepRobot () {
	return this._robot.isVisible && this._robot == World.FriendlyKeeper && not this._robot.userControl;
}

function Keeper:rateRobot () {
	return 1;
}

return Keeper;
