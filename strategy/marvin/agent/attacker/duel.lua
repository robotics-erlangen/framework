local Base = require "agent/base/behavior"
local Duel = Class("Agent.Attacker.Duel", Base)

local World = require "../base/world"
local Ball = require "observer/ball"
local Robot = require "observer/robot"
local Physics = require "observer/physics"
local debug = require "../base/debug"
local vis = require "../base/vis"

local TaskDuel = require "task/duel"

function Duel:_stop()
	self._activeOppHasBall = false
	self._activeOppImpact = false
end

function Duel:genericCheck()
	local opponentHasBall = false
	for _,r in pairs(World.OpponentRobots) do
		if r:hasBall(World.Ball) then
			opponentHasBall = true
			break
		end
	end

	local firstRobotAtBall, timeAdvance = Ball.firstAtBall()
	debug.set("duel firstAtBall", firstRobotAtBall)
	debug.set("duel timeAdv", timeAdvance)
	if timeAdvance < 0 then -- opponent is first at ball
		-- coarse approximation of future robot: it keeps driving with current speed
		local oppTimeToBall = Robot.minTimeToBall(firstRobotAtBall)
		local futureBall = Physics.ballAtTime(World.Ball, oppTimeToBall)
		local oppWayLength = firstRobotAtBall.speed:length() * oppTimeToBall
		local futureOppPos = firstRobotAtBall.pos + firstRobotAtBall.speed:copy():setLength(oppWayLength)
		vis.addCircle("a/duel: future opp pos", futureOppPos, 0.14, vis.colors.turquoise)
		local ballToRobot = futureOppPos - futureBall.pos
		local maxAngle = 7/180*math.pi
		debug.set("duel angle diff", World.Ball.speed:absoluteAngleDiff(ballToRobot))
		debug.set("duel max angle", maxAngle)
		if World.Ball.speed:length() > 0.5 and
				World.Ball.speed:absoluteAngleDiff(ballToRobot) < maxAngle then
			self._activeOppImpact = true
		end
	else
		self._activeOppImpact = false
	end

	if opponentHasBall and not Ball.receivesPass(self._robot) then
		self._activeOppHasBall = true
	end
	if not Ball.opponentBallOwner() then
		self._activeOppHasBall = false
	end

	return self._activeOppHasBall or self._activeOppImpact
end

function Duel:check()
	if not (self._inbox.mainAttacker().trainer == self._robot) then
		self._active = false
		return false
	end
	return self:genericCheck()
end

function Duel:_updateTask()
	return TaskDuel
end

return Duel
