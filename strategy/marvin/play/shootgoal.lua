local Base = require "play/base"
local ShootGoal = (require "../base/class").new("Play.ShootGoal", Base)

local World = local World = require "../base/world"
local Observer = {}
Observer.Ball = require "observer/ball"
Observer.Goal = require "observer/goal"
Observer.Shoot = require "observer/shoot"
local CatchBall = require "task/catchball"
local ShootGoal = require "task/shootgoal"

ShootGoal.timeout = 10
ShootGoal._conditions = {}

function ShootGoal:_init()
end

function ShootGoal:_baseRating(minRequiredRating)
	if minRequiredRating >= Base.rating.referee then
		return Base.rating.no
	end
end

function ShootGoal:prepareDefault()
	self._tasks = { CatchBall.create(self._robots[1]) }
end

function ShootGoal:rateDefault(isInit)
	catchBallChance = self._tasks[1]:rating()
	if catchBallChance > 0.87134 then	-- magic constant
		return Base.rating.yes
	elseif catchBallChance > 0.72149 then	-- magic constant
		return Base.rating.perhaps
	else
		return Base.rating.no
	end
end

function ShootGoal:switchDefault()
	local ballOwner = Observer.Ball.ballOwner()
	if ballOwner == self._robots[1] then
		if self._robots[1]:hasBall() then
			self._setState("Active")
		end
	end
end

function ShootGoal:prepareActive()
	self._tasks = { ShootGoal.create(self._robots[1]) }
end

function ShootGoal:rateActive()
	shootGoalChance = self._tasks[1]:rating()
	if shootGoalChance > 1.50861 then	-- OBACHT! never tested magic constant
		return Base.rating.yes
	elseif shootGoalChance > 0.87350 then	-- OBACHT! never tested magic constant
		return Base.rating.perhaps
	else
		return Base.rating.no
	end
end

function ShootGoal:switchActive()
	if not self._robots[1]:hasBall() then
		self._setState("Default")
	end
end

function ShootGoal:_selectRobots(attackers, defenders)
	local robots, _ = RobotList.join(attackers, defenders)
	robots, _ = RobotMatcher.match(robots, 1, self._conditions)
	return robots
end

return ShootGoal