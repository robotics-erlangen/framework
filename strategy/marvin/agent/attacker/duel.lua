local Base = require "agent/base/behaviour"
local Duel = (require "../base/class").new("Agent.Attacker.Duel", Base)
local Ball = require "observer/ball"

local TaskDuel = require "task/duel"

function Duel:_check()
	if Ball.opponentBallOwner() then
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
