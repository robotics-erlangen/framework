local Base = require "agent/base/behavior"
local Duel = Class("Agent.Attacker.Duel", Base)

local debug = require "../base/debug"
local geom = require "../base/geom"
local World = require "../base/world"
local Ball = require "observer/ball"
local Robot = require "observer/robot"

local TaskDuel = require "task/duel"


function Duel:_stop()
	self._opponentHasBall = false
	self._closerThanOpp = false
	self._lastChippedHysteresis = false
	self._active = false
end

local SAFTY_SPACE = 0.05
local DIST_HYSTERESIS = 0.02 -- must be always smaller than SAFTY_SPACE
local MAX_BALL_SPEED = 1
function Duel:genericCheck()
	-- if we receive the ball first, try shootgoal or something
	local receivesPass = Ball.receivesPass(self._robot)
	if receivesPass then
		local firstAtBall = true
		local selfDistToBall = self._robot.pos:distanceTo(World.Ball.pos)
		for _,opp in ipairs(World.OpponentRobots) do
			if Ball.receivesPass(opp) then
				local oppDistToBall = opp.pos:distanceTo(World.Ball.pos)
				if oppDistToBall < selfDistToBall then
					local distToBallLine = opp.pos:orthogonalDistance(World.Ball.pos, World.Ball.pos + World.Ball.speed)
					if distToBallLine < 0.3 then
						firstAtBall = false
					end
				end
			end
		end
		if firstAtBall then
			return false
		end
	end


	if self._agent.beOffensive then
		return false
	end

	-- if the ball is shot fast at the opponent goal, dont duel it since it might be chipped by us
	local ballSpeed = World.Ball.speed:length()
	if ballSpeed > MAX_BALL_SPEED + (self._lastChippedHysteresis and 0.5 or 0) then
		local intersection = geom.intersectLineLine(World.Ball.pos, World.Ball.speed, World.Geometry.OpponentGoal, Vector(1, 0))
		if intersection and math.abs(intersection.x) < World.Geometry.GoalWidth / 2 + (self._lastChippedHysteresis and 1 or 0) then
			self._lastChippedHysteresis = true
			return false
		else
			self._lastChippedHysteresis = false
		end
	else
		self._lastChippedHysteresis = false
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
		if Ball.receivesPass(r) and r.pos:distanceTo(self._robot.pos) < 1 then
			return true
		end
	end


	local timeToBallHysteresis = self._active and 0 or 0.3
	if not Ball.receivesPass(self._robot) then
		local opposer, oppTime = Ball.firstRobotAtBall(World.OpponentRobots)
		if oppTime + timeToBallHysteresis < Robot.minTimeToBall(self._robot) then
			return true
		end
	end

	return false
end


function Duel:check()
	local isMainAttacker = (self._inbox.mainAttacker().trainer == self._robot)
	self._forceKeepingInPool = isMainAttacker

	if not isMainAttacker then
		self._active = false
	else
		self._active = self:genericCheck()
	end
	return self._active
end


function Duel:_updateTask()
	return TaskDuel
end

return Duel
