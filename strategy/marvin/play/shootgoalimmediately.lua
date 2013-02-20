local Base = require "play/base"
local ShootGoalImmediately = (require "../base/class").new("Play.ShootGoalImmediately", Base)

local World = local World = require "../base/world"
local Observer = {}
Observer.Ball = require "observer/ball"
Observer.Goal = require "observer/goal"
Observer.Shoot = require "observer/shoot"
local ShootG = require "task/shootgoalimmediately"
local RobotList = require "util/robotlist"
local RobotMatcher = require "control/robotmatcher"

ShootGoalImmediately.timeout = 5
ShootGoalImmediately._conditions = {}

function ShootGoalImmediately:_init()
end

function ShootGoalImmediately:_baseRating(minRequiredRating)
	if minRequiredRating >= Base.rating.referee then
		return Base.rating.no
	end
end

function ShootGoalImmediately:_selectRobots(attackers, defenders)
	local robots, _ = RobotList.join(attackers, defenders)
	robots = RobotList.excludeRobot(robots, World.FriendlyKeeper)
	robots, _ = RobotMatcher.match(robots, 1, self._conditions)
	return robots
end

function ShootGoalImmediately:prepareDefault()
	self._tasks = { ShootG.create(self._robots[1]) }
end

function ShootGoalImmediately:rateDefault(isInit)
	local goalProbability = self._task[1]:rating()
	if goalProbability > 0.92836 then -- warning! magic constant
		return Base.rating.force
	elseif goalProbability > 0.79731 then -- warning! magic constant
		return Base.rating.yes
	else
		return Base.rating.no
	end
end

return ShootGoalImmediately