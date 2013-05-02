local Base = require "play/base"
local ShootGoalImmediately = (require "../base/class").new("Play.ShootGoalImmediately", Base)

local World = require "../base/world"
local Observer = {}
Observer.Ball = require "observer/ball"
Observer.Goal = require "observer/goal"
Observer.Shoot = require "observer/shoot"
local ShootG = require "task/shootgoalimmediately"
local RobotList = require "util/robotlist"
local RobotMatcher = require "control/robotmatcher"

ShootGoalImmediately.timeout = 5
ShootGoalImmediately._conditions = {}
ShootGoalImmediately.maxRating = Base.rating.force

function ShootGoalImmediately:_init()
end

function ShootGoalImmediately:_selectRobots(poolRobots)
	local robots = RobotList.join(poolRobots.attack, poolRobots.defense)
	robots = RobotList.join(robots, poolRobots.keeper)
	return RobotMatcher.match(self._taskmanager, robots, 1, self._conditions)
end

function ShootGoalImmediately:prepareDefault()
	self._tasks = { ShootG.create(self._robots[1]) }
end

function ShootGoalImmediately:rateDefault(isInit)
	local goalProbability = self._taskmanager:simulate(self._tasks[1])
	if goalProbability > 0.92836 then -- warning! magic constant
		return Base.rating.force
	elseif goalProbability > 0.79731 then -- warning! magic constant
		return Base.rating.yes
	else
		return Base.rating.no
	end
end

return ShootGoalImmediately
