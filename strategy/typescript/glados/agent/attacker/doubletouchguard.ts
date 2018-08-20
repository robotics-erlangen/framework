import {Behavior} from "glados/agent/base/behavior";
let DoubleTouchGuard = Class("Agent.Attacker.DoubleTouchGuard", Base)

import * as debug from "base/debug";
import * as Referee from "base/referee";
import * as World from "base/world";
import * as Ball from "glados/observer/ball";
import * as Robot from "glados/observer/robot";
let StopAttack = require "task/attacker/stopattack"


//prevents freekicking robot from moving away after failed shot
let lastFreekickTime = 1
function DoubleTouchGuard:check () {
	if (Referee.isFriendlyFreeKickState()) {
		// subtract half a second to ensure that the freekick shot gets detected
		lastFreekickTime = World.Time - 0.5
	}

	debug.push("DoubleTouchConditions")
	debug.set("ownStandardShooter", Robot.ownStandardShooter())
	debug.set("Last Freekick Time", lastFreekickTime)
	debug.set("wasShot Condition", not Ball.wasShot(World.Time - lastFreekickTime))
	debug.pop()

	if (World.RefereeState == "Game" && Robot.ownStandardShooter() == this._robot && not Ball.wasShot(World.Time-lastFreekickTime)) {
		return true
	}
	return false
}

function DoubleTouchGuard:_updateTask () {
	return StopAttack, {0.15}
}

return DoubleTouchGuard
