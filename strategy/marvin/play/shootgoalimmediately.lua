local Base = require "play/base"
local ShootGoalImmediately = (require "../base/class").new("Play.ShootGoalImmediately", Base)

local World = local World = require "../base/world"
local Observer = {}
Observer.Ball = require "observer/ball"
Observer.Goal = require "observer/goal"
Observer.Shoot = require "observer/shoot"

ShootGoalImmediately.timeout = 5
ShootGoalImmediately._conditions = {}

function ShootGoalImmediately:_init()
end

function ShootGoalImmediately.baseRating(minRequiredRating)
	if minRequiredRating >= Base.rating.referee then
		return Base.rating.no
	else
		return 
	end
end

function ShootGoalImmediately.rateStart(isInit)
	local goalProbability = self._task[1].rating()
	if goalProbability > 0.92836 then -- warning! magic constant
		return Base.rating.force
	elseif goalProbability > 0.79731 then -- warning! magic constant
		return Base.rating.yes
	else
		return Base.rating.no
	end
end

function ShootGoalImmediately.selectRobots(attackers, defenders)
	local robots = RobotList.join(attackers, defenders)
	robots = RobotList.excludeRobot(robots, World.FriendlyKeeper)
	robots, _ = RobotMatcher.match(robots, math.min(1, #robots), ShootGoalImmediately._conditions)
	return robots
end

function ShootGoalImmediately:shootGoal()
	self._tasks = { self._robots[1] and ShootDirect.create(self._robots[1], self._robots[1].dir, self._robots[1].maxShotLinear) }
end

return ShootGoalImmediately