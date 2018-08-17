let Base = require "agent/base/behavior"
let Stop = Class("Agent.Attacker.Stop", Base)

import * as World from "base/world";
import * as Referee from "base/referee";
let StopAttack = require "task/attacker/stopattack"
let PlaceBall = require "task/attacker/placeball"


function Stop:check () {
	return Referee.isStopState() && this._inbox.mainAttacker().trainer == this._robot
}

function Stop:_updateTask () {
	if (World.RefereeState == "BallPlacementOffensive") {
		return PlaceBall
	} else {
		return StopAttack
	}
}

return Stop
