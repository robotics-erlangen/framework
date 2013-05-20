local ShootGoal = (require "../base/class").new("Task.ShootGoal", require "task/shoot")	-- inherits from Shoot task

local World = require "../base/world"
local Observer = {}
Observer.Ball = require "observer/ball"
Observer.Goal = require "observer/goal"
Observer.Shoot = require "observer/shoot"
local geom = require "../base/geom"
local ToTarget = require "trajectory/totarget"
local debug = require "../base/debug"

ShootGoal.priority = 5

ShootGoal.Mode = {
	GetTheBall = 0,
	SearchBetterPosition = 1,
	TurnTowardsGoal = 2,
	ShootNow = 3,
}

function ShootGoal:_init()
	self._mode = 0
	self._bestRating = 0
	self._bestSector = 1
	self._pointOnGoalLine = nil
end

function ShootGoal:_rate()
	local ballOwner = Observer.Ball.friendlyBallOwner()
	if ballOwner == self._robot then
		if self._robot:hasBall(World.Ball) then
			local ball = World.Ball
			local robots = {}
			for _,r in ipairs(World.Robots) do
				if r.pos.y > ball.pos.y then
					if r ~= self._robot then
						table.insert(robots, r)
					end
				end
			end
			local freeSectors = Observer.Goal.freeSectors(ball.pos, robots, true)
			for k, fs in ipairs(freeSectors) do -- TODO: implement reasonable function that calculates the time needed for the robot to turn with the ball
				local rating = (fs[2] - fs[1])*(10 - geom.getAngleDiff(self._robot.dir, 0.5*(fs[1] + fs[2]))^2) -- as said - only to guess the needed time
				if rating > self._bestRating then
					self._bestRating = rating
					self._bestSector = fs
				end
			end
			if self._bestRating > 1.5 then
				if self._bestSector[1] < self._robot.dir and self._robot.dir < self._bestSector[2] then
					self._pointOnGoalLine = geom.intersectLineLine(self._robot.pos, Vector.fromAngle(self._robot.dir), World.Geometry.OpponentGoal, Vector.fromAngle(0))
					local prob = Observer.Shoot.evaluateShootCorridor(self._pointOnGoalLine, self._robot.maxShotLinear, ball.pos, 0, robots)
					if prob > 0.92836 then	-- warning! magic constant
						self._mode = ShootGoal.Mode.ShootNow		-- free corridor to goal in front of the robot
					else
						self._mode = ShootGoal.Mode.TurnTowardsGoal	-- turn and shoot (nur dann entscheidend, falls es eine Möglichkeit gibt, im Drehen zu schießen)
						--log(tostring(prob))
					end
				else
					self._mode = ShootGoal.Mode.TurnTowardsGoal		-- turn a bit more, then shoot
				end
			else
				self._mode = ShootGoal.Mode.SearchBetterPosition		-- from the current position, it is hardly possible to score -> look for better position and move there
			end
			return self._bestRating
		else
			self._mode = ShootGoal.Mode.GetTheBall					-- we had the ball, but it must have rolled away
			return  0
		end
	else
		self._mode = ShootGoal.Mode.GetTheBall						-- someone else has the ball, so let's try to get it. dumb play which called this task...
		return 0
	end
end

function ShootGoal:_run(priorityMessages, notifications)
	debug.set("Mode", self._mode)
	if self._mode == ShootGoal.Mode.ShootNow then
		self:_shoot(self._pointOnGoalLine, math.huge, true, 0.8)	-- from the shoot task
		self._robot:setDribblerSpeed(0)
	elseif self._mode == ShootGoal.Mode.TurnTowardsGoal then
		self._robot:setDribblerSpeed(1)
		self._robot.path:setDefaultObstacles(self._robot, true)
		self._robot.path:addRobotObstacles(self._robot)
		self._robot.trajectory:update(ToTarget, self._robot.pos, (self._bestSector[1] + self._bestSector[2])*0.5)
	elseif self._mode == ShootGoal.Mode.SearchBetterPosition then
		
	elseif self._mode == ShootGoal.Mode.GetTheBall then
		
	else
		self._robot:setDribblerSpeed(1)
	end
end

function ShootGoal.factory(position)
	local f = function (robots)
		return ShootGoal.create(robots[position])
	end
	return f
end

function ShootGoal.test(id)
	if id > 0 then
		return nil
	end
	return ShootGoal.factory(1), 1
end

return ShootGoal
