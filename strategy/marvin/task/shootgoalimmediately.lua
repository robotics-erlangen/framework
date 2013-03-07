local ShootGoalImmediately = (require "../base/class").new("Task.ShootGoalImmediately", require "task/base")

local World = require "../base/world"
local Observer = {}
Observer.Ball = require "observer/ball"
Observer.Goal = require "observer/goal"
Observer.Shoot = require "observer/shoot"
local geom = require "../base/geom"
local RobotList = require "util/robotlist"

ShootGoalImmediately.priority = 5

function ShootGoalImmediately:_init()
end

function ShootGoalImmediately:_rate()
	if self._robot == Observer.Ball.ballOwner() then
		if self._robot:hasBall(World.Ball) then
			local pointOnGoalLine = geom.intersectLineLine(self._robot.pos, Vector.create(self._robot.dir), World.Geometry.OpponentGoal, Vector.create(1, 0))
			pointOnGoalLine = pointOnGoalLine or World.Geometry.OpponentGoal -- handle parallel directions
			return Observer.Shoot.evaluateShootCorridor(pointOnGoalLine, self._robot.maxShotLinear, World.Ball.pos, 0) -- goal probability
		else
			return 0 -- better: (chance to reach ball)*(chance to score)
		end
	else
		return 0
	end
end

function ShootGoalImmediately:_run(priorityMessages, notifications)
	self._robot:shoot(0, math.huge)
end

function ShootGoalImmediately.test()
	local robot = World.FriendlyRobots[1]
	if robot then
		ShootGoalImmediately.create(robot)
	end
end

return ShootGoalImmediately
