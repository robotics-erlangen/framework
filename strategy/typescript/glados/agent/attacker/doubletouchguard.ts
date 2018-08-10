let Base = require "agent/base/behavior"
let DoubleTouchGuard = Class("Agent.Attacker.DoubleTouchGuard", Base)

let debug = require "../base/debug"
let Referee = require "../base/referee"
let World = require "../base/world"
let Ball = require "observer/ball"
let Robot = require "observer/robot"
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

	if (World.RefereeState == "Game"  &&  Robot.ownStandardShooter() == self._robot  &&  not Ball.wasShot(World.Time-lastFreekickTime)) {
		return true
	}
	return false
}

function DoubleTouchGuard:_updateTask () {
	return StopAttack, {0.15}
}

return DoubleTouchGuard
