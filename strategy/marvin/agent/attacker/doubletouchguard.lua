local Base = require "agent/base/behavior"
local DoubleTouchGuard = Class("Agent.Attacker.DoubleTouchGuard", Base)

local debug = require "../base/debug"
local Referee = require "../base/referee"
local World = require "../base/world"
local Ball = require "observer/ball"
local Robot = require "observer/robot"
local StopAttack = require "task/stopattack"


--prevents freekicking robot from moving away after failed shot
local lastFreekickTime = 1
function DoubleTouchGuard:check()
	if Referee.isFriendlyFreeKickState() then
		-- subtract half a second to ensure that the freekick shot gets detected
		lastFreekickTime = World.Time - 0.5
	end

	debug.push("DoubleTouchConditions")
	debug.set("ownStandardShooter", Robot.ownStandardShooter())
	debug.set("Last Freekick Time", lastFreekickTime)
	debug.set("wasShot Condition", not Ball.wasShot(World.Time - lastFreekickTime))
	debug.pop()

	if World.RefereeState == "Game" and Robot.ownStandardShooter() == self._robot and not Ball.wasShot(World.Time-lastFreekickTime) then
		return true
	end
	return false
end

function DoubleTouchGuard:_updateTask()
	return StopAttack
end

return DoubleTouchGuard
