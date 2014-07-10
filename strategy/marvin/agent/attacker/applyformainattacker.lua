local Base = require "agent/base/behavior"
local ApplyForMainattacker = (require "../base/class").new("Agent.Attacker.ApplyForMainattacker", Base)
local Referee = require "../base/referee"
local Ball = require "observer/ball"
local World = require "../base/world"

local cooldown = 0.5

function ApplyForMainattacker:check()
	if self._lastShot and World.Time - self._lastShot < cooldown then
		return false
	end
	if Ball.isShot() == self._robot then
		self._lastShot = World.Time
	end
	if self._freekickFlag and self._maFlag and not Referee.isFriendlyFreeKickState() then
		self._lastShot = World.Time
		return false
	end


	self._freekickFlag = Referee.isFriendlyFreeKickState()
	self._maFlag = self._inbox.mainAttacker().trainer == self._robot
	
	if self._maFlag then
		self._forceKeepingInPool = true
	end
	if not Referee.isOpponentPenaltyState() then
		self:_applyForMainAttacker()
	end
	return false
end

function ApplyForMainattacker:_updateTask()
	error("This behavior is not supposed to run")
end

return ApplyForMainattacker
