local Base = require "agent/base/behavior"
local Duel = Class("Agent.Attacker.Duel", Base)

local World = require "../base/world"
local Ball = require "observer/ball"
local debug = require "../base/debug"

local TaskDuel = require "task/duel"

function Duel:_stop()
	self._active = false
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
		local ballToRobot = firstRobotAtBall.pos - World.Ball.pos
		local maxAngle = 4/180*math.pi
		debug.set("duel angle diff", World.Ball.speed:absoluteAngleDiff(ballToRobot))
		debug.set("duel max angle", maxAngle)
		if World.Ball.speed:length() > 0.5 and
				World.Ball.speed:absoluteAngleDiff(ballToRobot) < maxAngle then
			return true
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
