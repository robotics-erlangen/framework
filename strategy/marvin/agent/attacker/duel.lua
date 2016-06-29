local Base = require "agent/base/behavior"
local Duel = Class("Agent.Attacker.Duel", Base)

local debug = require "../base/debug"
local vis = require "../base/vis"
local World = require "../base/world"
local Ball = require "observer/ball"
local Physics = require "observer/physics"
local Robot = require "observer/robot"

local TaskDuel = require "task/duel"


function Duel:_stop()
	self._opponentHasBall = false
end


function Duel:genericCheck()
	-- if we receive the ball, try shootgoal or something
	-- this can be risky, so only do this in the opponent field half
	local receivesPass = Ball.receivesPass(self._robot)
	debug.set("duel check receivesPass", receivesPass)
	if receivesPass then
		if self._robot.pos.y > 0 then
			return false
		end
	end

	if self._agent.beOffensive then
		return false
	end

	-- if the opponent controls the ball, duel him
	if Ball.opponentBallOwner() then
		return true
	end

	-- if any opponent receives the ball (and we don't), duel him
	-- this may cause duel to get active A LOT
	for _,r in ipairs(World.OpponentRobots) do
		if Ball.receivesPass(r) then
			return true
		end
	end
	return false
end


function Duel:check()
	local isMainAttacker = (self._inbox.mainAttacker().trainer == self._robot)
	self._forceKeepingInPool = isMainAttacker

	if not isMainAttacker then
		return false
	end
	return self:genericCheck()
end


function Duel:_updateTask()
	return TaskDuel
end

return Duel
