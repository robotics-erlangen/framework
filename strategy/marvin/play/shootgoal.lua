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
ShootGoal.maxRating = Base.rating.force

function ShootGoal:_init()
end

function ShootGoal:_selectRobots(poolRobots)
	local robots = RobotList.join(poolRobots.attack, poolRobots.defense)
	robots = RobotMatcher.match(self._messages, robots, 1, self._conditions)
	return robots
end

function ShootGoal:prepareDefault()
	self._tasks = { ShootGoalTask.create(self._robots[1]) }
end

function ShootGoal:rateDefault(isInit)
	local priorityMessages, notifications = self._messages:split(self._robots[1])
	local shootGoalChance = self._tasks[1]:rate(priorityMessages, notifications)
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

function ShootGoal:prepareEnd()
	self._tasks = {}
end

return ShootGoal
