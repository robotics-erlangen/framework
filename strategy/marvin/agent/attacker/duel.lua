local Base = require "agent/base/behavior"
local Duel = Class("Agent.Attacker.Duel", Base)
local Ball = require "observer/ball"

local TaskDuel = require "task/duel"

function Duel:check()
	if not (self._inbox.mainAttacker().trainer == self._robot) then
		return false
	end

	return Ball.opponentBallOwner()
end

function Duel:_updateTask()
	return TaskDuel
end

return Duel
