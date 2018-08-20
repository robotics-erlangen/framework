import {Behavior} from "glados/agent/base/behavior";
let Penalty = Class("Agent.Defender.Penalty", Base)

import * as World from "base/world";
let DefendPenalty = require "task/defender/defendpenalty"


function Penalty:check () {
	return World.RefereeState == "PenaltyDefensivePrepare" || World.RefereeState == "PenaltyDefensive"
}

function Penalty:_updateTask () {
	return DefendPenalty
}

return Penalty
