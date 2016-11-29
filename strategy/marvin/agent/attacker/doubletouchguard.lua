local Base = require "agent/base/behavior"
local DoubleTouchGuard = Class("Agent.Attacker.DoubleTouchGuard", Base)

local Referee = require "../base/referee"
local Robot = require "observer/robot"
local StopAttack = require "task/stopattack"

--prevents freekicking robot from moving away after failed shot

function DoubleTouchGuard:check()	
	if not Referee.isFriendlyFreeKickState() and Robot.ownFreeKickShooter() == self._robot then
		return true
	end
	return false
end

function DoubleTouchGuard:_updateTask()
	return StopAttack
end

return DoubleTouchGuard
