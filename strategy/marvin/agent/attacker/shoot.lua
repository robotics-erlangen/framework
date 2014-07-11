local Base = require "agent/base/behavior"
local Shoot = (require "../base/class").new("Agent.Attacker.Shoot", Base)
local World = require "../base/world"
local Robot = require "observer/robot"
local Ball = require "observer/ball"
local Rating = require "util/rating"
local ObserverShoot = require "observer/shoot"

local ShootGoal = require "task/shootgoal"
local DirectPass = require "task/directpass"
local PassInTheRun = require "task/passintherun"
local Class = require "../base/class"

function Shoot:_stop()
	self._taskClass = nil
	self._lastTaskClass = nil
	self._taskStart = World.Time
	self._minTaskTime = 0
end

function Shoot:check()
	if Ball.isShot() then
		for _,_ in pairs(self._inbox.passSender()) do
			self._send.exclusiveRole("trainer", {mainAttacker = 2})
			break
		end
	end
	return self._inbox.mainAttacker().trainer == self._robot
end

function Shoot:_updateTask()
	local minTimeOver = World.Time - self._taskStart >= self._minTaskTime
	if not self._taskClass or minTimeOver then
		-- shootgoal
		local shootGoalTmp = ShootGoal.create(self._agent)
		local sg_target, sg_mae, sg_clean = shootGoalTmp:getDecisionMakingBasis()
		local canShootGoal = sg_mae and sg_mae > Settings.minAnglePrecision

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
			self._taskClass = ShootGoal
		elseif pass and pass.kind == "in the run" then
			self._minTaskTime = 2
			self._taskClass = PassInTheRun
			taskParams = { pass.target, pass.pos, Settings.shootDriveSpeed }
		elseif pass and pass.kind == "direct" then
			self._minTaskTime = 1
			self._taskClass = DirectPass
			taskParams = { pass.target, true }
		else -- shootgoal as fallback
			self._minTaskTime = 0.5
			self._taskClass = ShootGoal
		end
		if self._taskClass ~= self._lastTaskClass then
			self._lastTaskClass = self._taskClass
			self._taskStart = World.Time
			return self._taskClass, taskParams
		end
	end
	assert(self._taskClass, "a/a/shoot has not selected a task")
	return self._taskClass
end

return Shoot
