local Base = require "agent/base/behavior"
local Shoot = Class("Agent.Attacker.Shoot", Base)

local debug = require "../base/debug"
local World = require "../base/world"
local Ball = require "observer/ball"
local ObserverShoot = require "observer/shoot"
local Pass = require "task/pass"
local ShootGoal = require "task/shootgoal"
local Rating = require "util/rating"

local MIN_ANGLE_PRECISION = 1 / 180 * math.pi
local MAX_PASS_MSG_DELAY = 0.7

function Shoot:_stop()
	self._taskClass = nil
	self._lastTaskClass = nil
	self._taskStart = World.Time
	self._behaviorActivateCount = 0
	self._minTaskTime = 0
end

function Shoot:check()
	local mainAttackerFlag = self._inbox.mainAttacker().trainer == self._robot
	self._forceKeepingInPool = mainAttackerFlag

	if mainAttackerFlag then
		debug.set("active frames", self._behaviorActivateCount)
		self._behaviorActivateCount = self._behaviorActivateCount + 1
		return true
	end
	return false
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

		if self._robot.pos:distanceTo(World.Geometry.OpponentGoal) < World.Geometry.FieldHeightHalf then
			canShootGoal = canShootGoal or math.random() < 0.5
		end

		local receivesPass = Ball.receivesPass(self._robot)
		debug.set("receivesPass", receivesPass)

		local pass
		local bestPassRating = 0
		for robot, sugg in pairs(self._inbox.passSuggestion()) do
			if sugg.rating > bestPassRating and sugg.pos:distanceTo(self._robot.pos) > 1.0 then
				pass = sugg
				pass.target = robot
				bestPassRating = sugg.rating
			end
		end

		local taskParams
		self._minTaskTime = 1.5
		if receivesPass then
			if canShootGoal and ObserverShoot.volleyPossible(self._robot, sg_target) then
				self._taskClass = ShootGoal
			elseif pass and bestPassRating > 0.5 then -- volley pass
				self._taskClass = Pass
				taskParams = { pass.target, nil, true }
			else
				self._taskClass = ShootGoal
			end
		else
			if canShootGoal then -- catchball shootgoal
				self._taskClass = ShootGoal
			elseif pass then -- catchball pass
				self._taskClass = Pass
				taskParams = { pass.target }
			else -- fallback shootgoal
				self._minTaskTime = 0.5
				self._taskClass = ShootGoal
			end
		end
		
		self._taskStart = World.Time

		if self._behaviorActivateCount < 20 then
			-- on the first run, we don't consider a passing robot for
			-- a double pass. So we delay the decision some frames
			self._minTaskTime = 0
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
