local Base = require "agent/base/behaviour"
local DefaultDuel = (require "../base/class").new("Agent.Attacker.DefaultDuel", Base)
local Ball = require "observer/ball"

local Duel = require "task/duel"

function DefaultDuel:_check()
	if Ball.opponentBallOwner() then
		return Base.State.Active
	elseif self._state == Base.State.Active and Ball.friendlyBallOwner() == self._robot then
		return Base.State.Active
	else
		return Base.State.Inactive
	end
end

function DefaultDuel:_run()
	if not self._task then
		self._task = Duel.create(self._robot)
	end
end

return DefaultDuel
