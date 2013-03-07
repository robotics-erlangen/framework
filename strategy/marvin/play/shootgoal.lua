local Base = require "play/base"
local ShootGoal = (require "../base/class").new("Play.ShootGoal", Base)

local World = require "../base/world"
local RobotList = require "util/robotlist"
local RobotMatcher = require "control/robotmatcher"
local Observer = {}
Observer.Ball = require "observer/ball"
Observer.Goal = require "observer/goal"
Observer.Shoot = require "observer/shoot"
local CatchBall = require "task/catchball"
local ShootGoalTask = require "task/shootgoal"

ShootGoal.timeout = 10
ShootGoal._conditions = {}

function ShootGoal:_init()
end

function ShootGoal:_baseRating(minRequiredRating)
	if minRequiredRating > Base.rating.referee then
		return Base.rating.no
	end
end

function ShootGoal:_selectRobots(poolRobots)
	local robots = RobotList.join(poolRobots.attack, poolRobots.defense)
	robots = RobotMatcher.match(robots, 1, self._conditions)
	return robots
end

function ShootGoal:prepareDefault()
	self._tasks = { ShootGoalTask.create(self._robots[1]) }
end

function ShootGoal:rateDefault(isInit)
	local shootGoalChance = self._tasks[1]:rate()
	if shootGoalChance > 1.50861 then	-- OBACHT! never tested magic constant
		return Base.rating.yes
	elseif shootGoalChance > 0.87350 then	-- OBACHT! never tested magic constant
		return isInit and Base.rating.perhaps or Base.rating.yes
	else
		return Base.rating.no
	end
end

function ShootGoal:switchDefault()
	if Observer.Ball.isShot() == self._robots[1] then
		self:_setState("End")
	end
end

function ShootGoal:rateEnd()
	return Base.rating.no
end

return ShootGoal
