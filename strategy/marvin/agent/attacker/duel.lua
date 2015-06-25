local Base = require "agent/base/behavior"
local Duel = Class("Agent.Attacker.Duel", Base)

local World = require "../base/world"
local Ball = require "observer/ball"

local TaskDuel = require "task/duel"

function Duel:_stop()
	self._active = false
end

function Duel:check()
	if not (self._inbox.mainAttacker().trainer == self._robot) then
		return false
	end

	local opponentHasBall = false
	for _,r in pairs(World.OpponentRobots) do
		if r:hasBall(World.Ball) then
			opponentHasBall = true
			break
		end
	end

	if opponentHasBall and not Ball.receivesPass(self._robot) then
		self._active = true
	end
	if not Ball.opponentBallOwner() then
		self._active = false
	end

	return self._active
end

function Duel:_updateTask()
	return TaskDuel
end

return Duel
