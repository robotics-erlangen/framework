local Base = require "agent/base/behavior"
local Duel = Class("Agent.Attacker.Duel", Base)

local debug = require "../base/debug"
local geom = require "../base/geom"
local World = require "../base/world"
local Ball = require "observer/ball"
local Physics = require "observer/physics"
local Robot = require "observer/robot"

local TaskDuel = require "task/shared/duel"


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
					local pointOnBallLine = opp.pos:orthogonalProjection(World.Ball.pos, World.Ball.pos + World.Ball.speed)
					if opp.pos:distanceTo(pointOnBallLine) < 0.5 then
						local robotTime = Physics.robotTimeToPos(opp, pointOnBallLine, Vector(0, 0))
						local ballOffset = World.Ball.speed:copy():setLength(World.Ball.radius + opp.shootRadius)
						local ballTime = Physics.checkedBallRollTime(World.Ball, pointOnBallLine - ballOffset)
						if ballTime > robotTime + 0.1 then
							firstAtBall = false
						end
					end
				end
			end
		end
		if firstAtBall then
			debug.set("duel check", "firstAtBall")
			return false
		end
	end


	if self._agent.beOffensive then
		debug.set("duel check", "beOffensive")
		return false
	end

	-- duel is not beneficial in opponent corners
	local cornerMinX = World.Geometry.FieldWidthHalf * (self._active and 0.7 or 0.6)
	local cornerMinY = World.Geometry.FieldHeightHalf * (self._active and 0.6 or 0.5)
	if World.Ball.pos.y > cornerMinY and math.abs(World.Ball.pos.x) > cornerMinX then
		return false
	end


	-- if the ball is shot fast at the opponent goal, dont duel it since it might be chipped by us
	local ballSpeed = World.Ball.speed:length()
	if ballSpeed > MAX_BALL_SPEED + (self._lastChippedHysteresis and 0 or 0.5) then
		local intersection = geom.intersectLineLine(World.Ball.pos, World.Ball.speed, World.Geometry.OpponentGoal, Vector(1, 0))
		if intersection and math.abs(intersection.x) < World.Geometry.GoalWidth / 2 + (self._lastChippedHysteresis and 1 or 0) then
			self._lastChippedHysteresis = true
			debug.set("duel check", "ball speed")
			return false
		else
			self._lastChippedHysteresis = false
		end
	else
		self._lastChippedHysteresis = false
	end

	-- if the opponent controls the ball, duel him
	local ballOwner = Ball.opponentBallOwner() or Ball.opponentBallDribbler()
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
			debug.set("duel check", "closerThanOpp")
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
			debug.set("duel check", "oppGetsBall")
			return true
		end
	end


	local timeToBallHysteresis = self._active and 0 or 0.3
	if not Ball.receivesPass(self._robot) then
		local _, oppTime = Ball.firstRobotAtBall(World.OpponentRobots)
		if oppTime + timeToBallHysteresis < Robot.minTimeToBall(self._robot) then
			debug.set("duel check", "hysteresis")
			return true
		end
	end
	debug.set("duel check", "default")

	return false
end


function Duel:check()
	local isMainAttacker = (self._inbox.mainAttacker().trainer == self._robot)
	self._forceKeepingInPool = isMainAttacker

	if not isMainAttacker then
		debug.set("duel check", "not mainAttacker")
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
