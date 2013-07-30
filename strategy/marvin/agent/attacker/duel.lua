local Base = require "agent/base/behavior"
local Duel = (require "../base/class").new("Agent.Attacker.Duel", Base)
local Ball = require "observer/ball"

local TaskDuel = require "task/duel"

function Duel:check()
	if not self.inbox.mainAttacker().trainer == self._robot then
		return false
	end
	
	local timeAdvance = 0.2
	
	local robot, time = Ball.firstAtBall()
	local friendly = true
	if robot then
		friendly = robot.isFriendly
	end
	if self.active and friendly and time > timeAdvance then
		self.active = false
	elseif not self._active and not friendly then
		self.active = true
	end
	
	if self.active then
		return true
	elseif self._active and Ball.friendlyBallOwner() == self._robot then
		return true -- prevents change to shoot?
	else
		return false
	end
end

function Duel:updateTask()
	return TaskDuel
end

return Duel
