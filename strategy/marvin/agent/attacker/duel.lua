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
	self._closerThanOpp = false
end

local SAFTY_SPACE = 0.05
local DIST_HYSTERESIS = 0.02 -- must be always smaller than SAFTY_SPACE
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
	local ballOwner = Ball.opponentBallOwner()
	if ballOwner then
		local dist = self._closerThanOpp and -SAFTY_SPACE or (-SAFTY_SPACE - DIST_HYSTERESIS)
		local dribblerPos = self._robot.pos + Vector.fromAngle(self._robot.dir) * self._robot.shootRadius
		local ballOwnerDribblerPos = ballOwner.pos + Vector.fromAngle(ballOwner.dir) * ballOwner.shootRadius
		-- we are closer to the ball, so dont duel
		if (dribblerPos:distanceTo(World.Ball.pos) - ballOwnerDribblerPos:distanceTo(World.Ball.pos)) < dist then
			self._closerThanOpp = true
		else
			self._closerThanOpp = false
			debug.set("duel check closerThanOpp", self._closerThanOpp)
			return true
		end
		debug.set("duel check closerThanOpp", self._closerThanOpp)
    else
		self._closerThanOpp = false
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
