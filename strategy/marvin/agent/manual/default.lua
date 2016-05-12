local Base = require "agent/base/behavior"
local Default = Class("Agent.Manual.Default", Base)

local World = require "../base/world"
local Ball = require "observer/ball"
local Robot = require "observer/robot"

local Manual = require "task/manual"
local Pass = require "task/pass"
local ShootGoal = require "task/shootgoal"

local Rating = require "util/rating"


function Default:_decideTargetGoal()
	local angleHyst = 30 /180*math.pi

	local toLeftGoal = World.Geometry.OpponentGoalLeft - World.Ball.pos
	local toRightGoal = World.Geometry.OpponentGoalRight - World.Ball.pos
	if not self._targetGoal and self._robot.dir > toRightGoal:angle() and self._robot.dir < toLeftGoal:angle() then
		self._targetGoal = true
	elseif self._targetGoal and (self._robot.dir + angleHyst < toRightGoal:angle()
			or self._robot.dir - angleHyst > toLeftGoal:angle()) then
		self._targetGoal = false
	end
end

function Default:_findBestPassTarget()
	local assistants = self._inbox.attackerFlag()

	-- only search for pass targets until we found one
	if not self._bestPassTarget then
		local bestRobot, bestAngle = nil, math.pi
		for r, _ in pairs(assistants) do
			local angleDiff = math.abs((r.pos - World.Ball.pos):angle() - self._robot.dir)
			if angleDiff < 20 /180*math.pi and angleDiff < bestAngle then
				bestRobot = r
				bestAngle = angleDiff
			end
		end
		self._bestPassTarget = bestRobot
	end
end

function Default:_intelligentShoot()
	self:_decideTargetGoal()
	self:_findBestPassTarget()

	if self._targetGoal then
		return ShootGoal
	elseif self._bestPassTarget then
		return Pass, { self._bestPassTarget }
	else
		return Manual
	end
end

function Default:_stop()
	self._targetGoal = nil
	self._bestPassTarget = nil
	self._lastPass = 0
	self._catching = false
end

local SLOW_BALL = 0.5
function Default:check()
	-- apply for main attacker
	local mainAttackerRating = 0
	if Ball.friendlyBallOwner() == self._robot then
		mainAttackerRating = 1.5
	elseif self._robot.isVisible then
		local timeToBall = Robot.minTimeToBall(self._robot)
		mainAttackerRating = Rating.timeToRating(timeToBall) * 1.3 --small rating bonus to please the human player
	end

	-- reset pass target finding
	self._bestPassTarget = nil

	-- look for incoming passes
	for _,_ in pairs(self._inbox.passPos()) do --tests if table has content, runs 0-1 times, otherwise BUG
		self._lastPass = World.Time
	end
	if World.Time - self._lastPass < 2 and Ball.isShot() then
		self._catching = true
	end
	if Ball.opponentBallOwner() or Ball.friendlyBallOwner() ~= self._robot
			or World.Ball.speed:length() < SLOW_BALL then
		self._catching = false
	end
	if self._catching then
		self._send.exclusiveRole("trainer", { passReceiver = 1.5, mainAttacker = 1.5 })
	elseif self._robot.isVisible then
		self._send.exclusiveRole("trainer", { mainAttacker = mainAttackerRating })
	end

	return true
end

function Default:_updateTask()
	local input = self._robot.userControl

	if input.kickPower and input.kickPower > 0 and Ball.friendlyBallOwner() == self._robot and
			input.kickStyle == "Linear" then
		return self:_intelligentShoot()
	end

	return Manual
end

return Default
