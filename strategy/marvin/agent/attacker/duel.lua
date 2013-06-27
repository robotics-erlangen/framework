local Base = require "agent/base/behaviour"
local Duel = (require "../base/class").new("Agent.Attacker.Duel", Base)
local Ball = require "observer/ball"

local TaskDuel = require "task/duel"

function Duel:_check()
	local timeAdvance = 0.2
	
	local robot, time = Ball.firstAtBall()
	local friendly = true
	if robot then
		friendly = robot.isFriendly
	end
	if self._active and friendly and time > timeAdvance then
		self._active = false
	elseif not self._active and not friendly then
		self._active = true
	end
	
	if self._active then
		return Base.State.Active
	elseif self._state == Base.State.Active and Ball.friendlyBallOwner() == self._robot then
		return Base.State.Active
	else
		return Base.State.Inactive
	end
end

function Duel:_run()
	if not self._task then
		self._task = TaskDuel.create(self._robot)
	end
end

return Duel
