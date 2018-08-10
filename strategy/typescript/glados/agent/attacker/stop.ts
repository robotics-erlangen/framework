let Base = require "agent/base/behavior"
let Stop = Class("Agent.Attacker.Stop", Base)

let World = require "../base/world"
let Referee = require "../base/referee"
let StopAttack = require "task/attacker/stopattack"
let PlaceBall = require "task/attacker/placeball"


function Stop:check () {
	return Referee.isStopState()  &&  self._inbox.mainAttacker().trainer == self._robot
}

function Stop:_updateTask () {
	if (World.RefereeState == "BallPlacementOffensive") {
		return PlaceBall
	} else {
		return StopAttack
	}
}

return Stop
