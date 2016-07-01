local Base = require "agent/base/behavior"
local Shoot = Class("Agent.Attacker.Shoot", Base)

local debug = require "../base/debug"
local Field = require "../base/field"
local World = require "../base/world"
local Ball = require "observer/ball"
local ObserverShoot = require "observer/shoot"
local CenterBack = require "task/centerback"
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

	local selfDefenseDist = Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius)
	if selfDefenseDist < CenterBack.distanceToDefenseArea() + self._robot.radius + 0.03 then
		self._send.preliminaryCenterbackTarget("all", self._robot)
	end

	debug.set("AAShoot/minTaskTime", self._minTaskTime)
	debug.set("AAShoot/time active", World.Time-self._taskStart)
	if not self._taskClass or minTimeOver then
		-- shootgoal
		local shootGoalTmp = ShootGoal(self._agent)
		local sg_target, sg_mae, sg_clean = shootGoalTmp:getDecisionMakingBasis()
		local canShootGoal = sg_mae and sg_mae > MIN_ANGLE_PRECISION

		debug.set("AAShoot/canShootGoal", canShootGoal and "true" or "false")
		if self._robot.pos:distanceTo(World.Geometry.OpponentGoal) < World.Geometry.FieldHeightHalf then
			if not canShootGoal and math.random() < 0.5 then
				canShootGoal = true
				debug.set("AAShoot/canShootGoal", "random")
			end
		end

		local receivesPass = Ball.receivesPass(self._robot)
		debug.set("AAShoot/receivesPass", receivesPass)

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
				debug.set("AAShoot/decision", "volley ShootGoal")
			elseif pass and bestPassRating > 0.5 then -- volley pass
				self._taskClass = Pass
				taskParams = { pass.target, nil, true }
				debug.set("AAShoot/decision", "volley Pass")
			else
				self._taskClass = ShootGoal
				debug.set("AAShoot/decision", "volley FallBack")
			end
		else
			if canShootGoal then -- catchball shootgoal
				self._taskClass = ShootGoal
				debug.set("AAShoot/decision", "catchball ShootGoal")
			elseif pass then -- catchball pass
				self._taskClass = Pass
				taskParams = { pass.target }
				debug.set("AAShoot/decision", "catchball Pass")
			else -- fallback shootgoal
				self._minTaskTime = 0.5
				self._taskClass = ShootGoal
				debug.set("AAShoot/decision", "catchball FallBack")
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
			self._send.shootActionPlan("all", (self._taskClass == ShootGoal) and "goalShot" or "pass")
			return self._taskClass, taskParams
		end
	end
	assert(self._taskClass, "a/a/shoot has not selected a task")
	self._send.shootActionPlan("all", (self._taskClass == ShootGoal) and "goalShot" or "pass")
	return self._taskClass
end

return Shoot
