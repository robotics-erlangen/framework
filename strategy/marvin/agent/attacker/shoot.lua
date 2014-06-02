local Base = require "agent/base/behavior"
local Shoot = (require "../base/class").new("Agent.Attacker.Shoot", Base)
local World = require "../base/world"
local Robot = require "observer/robot"
local ObserverShoot = require "observer/shoot"

local MoveNearBall = require "task/movenearball"
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
	return self._inbox.mainAttacker().trainer == self._robot
end

function Shoot:_updateTask()
	local ballFarAway = self._robot.pos:distanceTo(World.Ball.pos) > 0.5
	local minTimeOver = World.Time - self._taskStart >= self._minTaskTime
	if not self._taskClass or minTimeOver or ballFarAway then
		-- shootgoal
		local shootGoalTmp = ShootGoal.create(self._agent)
		local sg_target, sg_mae, sg_clean = shootGoalTmp:getDecisionMakingBasis()
		local canShootGoal = sg_mae and sg_mae > Settings.minAnglePrecision

		-- pass in the run
		local bestPassInTheRun -- TODO select via rating
		for robot, sugg in pairs(self._inbox.passSuggestion()) do
			bestPassInTheRun = { robot = robot, pos = sugg.pos }
		end

		-- directpass
		local bestFreeAssistant = ObserverShoot.bestFreeAssistant(self._robot)

		local taskParams
		if ballFarAway then
			self._minTasktTime = 0
			self._taskClass = MoveNearBall
		elseif canShootGoal then
			self._minTaskTime = 1.5
			self._taskClass = ShootGoal
		elseif bestPassInTheRun then
			self._minTaskTime = 2
			self._taskClass = PassInTheRun
			taskParams = { bestPassInTheRun.robot, bestPassInTheRun.pos, Settings.shootDriveSpeed }
		elseif bestFreeAssistant then
			self._minTaskTime = 1
			self._taskClass = DirectPass
			taskParams = { bestFreeAssistant, true }
		else
			-- TODO desperateShoot Task
			-- Torwart anchippen oder In freien Bereich dribblen
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
