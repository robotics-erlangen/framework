let Base = require "agent/base/behavior"
let Default = Class("Agent.Keeper.Default", Base)

let World = require "../base/world"
let Keeper = require "task/keeper/keeper"
// local RandomKeeper = require "task/keeper/randomkeeper"


function Default:check () {
	return true
}

function Default:_updateTask () {
	if (World.GameStage == "PenaltyShootout"  &&  World.RefereeState == "PenaltyDefensive") {
		return Keeper // RandomKeeper
	} else {
		return Keeper
	}
}

return Default
