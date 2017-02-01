local Base = require "agent/base/behavior"
local DoubleTouchGuard = Class("Agent.Attacker.DoubleTouchGuard", Base)

local Referee = require "../base/referee"
local World = require "../base/world"
local Ball = require "observer/ball"
local Robot = require "observer/robot"
local StopAttack = require "task/stopattack"


--prevents freekicking robot from moving away after failed shot
local lastFreekickTime = 0
function DoubleTouchGuard:check()
	if Referee.isFriendlyFreeKickState() then
		lastFreekickTime = World.Time
	end
	if World.RefereeState == "Game" and Robot.ownStandardShooter() == self._robot and not Ball.wasShot(World.Time-lastFreekickTime) then
		return true
	end
	return false
end

function DoubleTouchGuard:_updateTask()
	return StopAttack
end

return DoubleTouchGuard
