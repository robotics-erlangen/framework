local Base = require "agent/base/behavior"
local Shoot = Class("Agent.Attacker.Shoot", Base)

local debug = require "../base/debug"
local World = require "../base/world"
local Ball = require "observer/ball"
local Pass = require "task/pass"
local ShootGoal = require "task/shootgoal"
local Rating = require "util/rating"

local MIN_ANGLE_PRECISION = 1 / 180 * math.pi
local MAX_PASS_MSG_DELAY = 0.7

function Shoot:_stop()
	self._taskClass = nil
	self._lastTaskClass = nil
	self._taskStart = World.Time
	self._minTaskTime = 0
end

function Shoot:check()
	local mainAttackerFlag = self._inbox.mainAttacker().trainer == self._robot
	self._forceKeepingInPool = mainAttackerFlag

	return mainAttackerFlag
end

function Shoot:_updateTask()
	if self._robot.pos:distanceTo(World.Ball.pos) > 0.3 then
		self._taskStart = World.Time
	end
	local minTimeOver = World.Time - self._taskStart >= self._minTaskTime

	debug.set("minTaskTime", self._minTaskTime)
	debug.set("time active", World.Time-self._taskStart)
	if not self._taskClass or minTimeOver then
		-- shootgoal
		local shootGoalTmp = ShootGoal(self._agent)
		local sg_target, sg_mae, sg_clean = shootGoalTmp:getDecisionMakingBasis()
		local canShootGoal = sg_mae and sg_mae > MIN_ANGLE_PRECISION

		-- pass
		local pass
		local bestPassRating = 0
		for robot, sugg in pairs(self._inbox.passSuggestion()) do
			if sugg.rating > bestPassRating then
				pass = sugg
				pass.target = robot
				bestPassRating = sugg.rating
			end
		end

		local taskParams
		if canShootGoal then
			self._minTaskTime = 1.5
			self._taskStart = World.Time
			self._taskClass = ShootGoal
		elseif pass then
			self._minTaskTime = 1.5
			self._taskStart = World.Time
			self._taskClass = Pass
			taskParams = { pass.target, pass.pos }
		else -- shootgoal as fallback
			self._minTaskTime = 0.5
			self._taskStart = World.Time
			self._taskClass = ShootGoal
		end
		if self._taskClass ~= self._lastTaskClass then
			self._lastTaskClass = self._taskClass
			return self._taskClass, taskParams
		end
	end
	assert(self._taskClass, "a/a/shoot has not selected a task")
	return self._taskClass
end

return Shoot
