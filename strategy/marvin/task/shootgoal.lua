local ShootGoal = (require "../base/class").new("Task.ShootGoal", require "task/shoot")	-- inherits from Shoot task

local World = require "../base/world"
local Observer = {}
Observer.Ball = require "observer/ball"
Observer.Goal = require "observer/goal"
Observer.Shoot = require "observer/shoot"
local geom = require "../base/geom"
local ToTarget = require "trajectory/totarget"
local debug = require "../base/debug"
local vis = require "../base/vis"

ShootGoal.priority = 5

-- local constants
local maxEndSpeed = 0.2	-- max end speed for catchBall
local shootThresholdProb = 0.8	-- required probability to shoot

ShootGoal.Mode = {
	GetTheBall = 0,
	SearchBetterPosition = 1,
	TurnAndShoot = 2
}

function ShootGoal:_init(dontMoveWithBall)
	self._mode = 0
	self._bestRating = 0
	self._bestSector = 1
	self._pointOnGoalLine = nil
	self._linearShoot = true
	self._dontMoveWithBall = dontMoveWithBall
end

function ShootGoal:_successProbability(t)
	if self._linearShoot then
		-- TODO: use positions predicted for now+t
		local goalStart = (World.Geometry.OpponentGoalRight - self._robot.pos):angle()
		local goalEnd = (World.Geometry.OpponentGoalLeft - self._robot.pos):angle()
		if self._robot.dir < goalEnd and self._robot.dir > goalStart then
			local ballPos = World.Ball.pos
			local pointOnGoalLine = geom.intersectLineLine(self._robot.pos, Vector.fromAngle(self._robot.dir), World.Geometry.OpponentGoal, Vector.create(1, 0))
			local dist = (ballPos - pointOnGoalLine):length()
			local startSpeed = math.min(self._robot.maxShotLinear, self._robot.calculateShootSpeed(math.huge, dist))
			return Observer.Shoot.evaluateShootCorridor(pointOnGoalLine, startSpeed, ballPos, t, World.OpponentRobots)
		else
			return 0
		end
	else
		-- TODO: implement chipkick
	end
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
				self._pointOnGoalLine = geom.intersectLineLine(self._robot.pos, Vector.fromAngle(0.5*(self._bestSector[1] + self._bestSector[2])), World.Geometry.OpponentGoal, Vector.fromAngle(0))
				self._mode = ShootGoal.Mode.TurnAndShoot		-- turn and shoot
			else
				self._mode = ShootGoal.Mode.SearchBetterPosition	-- from the current position, it is hardly possible to score -> look for better position and move there
			end
			return self._bestRating
		else
			self._mode = ShootGoal.Mode.GetTheBall				-- we had the ball, but it must have rolled away
			return  0
		end
	else
		self._mode = ShootGoal.Mode.GetTheBall					-- someone else has the ball, so let's try to get it. dumb play which called this task...
		return 0
	end
end

function ShootGoal:_run(priorityMessages, notifications)
	debug.set("Mode", self._mode)
	if self._dontMoveWithBall then
		vis.addPath("ToGoal", {World.Ball.pos, self._pointOnGoalLine})
		self:_shoot(self._pointOnGoalLine, math.huge, true, 0)	-- threshold is 0 for immediate shooting
		self._robot:setDribblerSpeed(0)
	elseif self._mode == ShootGoal.Mode.TurnAndShoot then
		vis.addPath("ToGoal", {World.Ball.pos, self._pointOnGoalLine})
		self:_shoot(self._pointOnGoalLine, math.huge, true, shootThresholdProb)	-- from the shoot task
		self._robot:setDribblerSpeed(0)
	elseif self._mode == ShootGoal.Mode.SearchBetterPosition then
		local distToGoal = (World.Ball.pos - World.Geometry.OpponentGoal):length()
		local robotList = Observer.Goal.getRobotsNearGoal(distToGoal, World.OpponentRobots, true)
		local rightPoint, rightSectors, leftPoint, leftSectors = Observer.Goal.searchFreeSectors(robotList, true)
		local best = {}
		best.rating = 0
		if #rightSectors >= 1 then
			for _, s in ipairs(rightSectors) do
				local mid = 0.5*(s[1] + s[2])
				local dir = Vector.fromAngle(mid)
				local betterBallPos = geom.intersectLineLine(rightPoint, dir, World.Ball.pos, dir:perpendicular())
				local betterRobotPos = betterBallPos + dir:setLength(self._robot.shootRadius)
				local rating = (s[2] - s[1])/((self._robot.pos - betterRobotPos):length() + 0.1)
				if rating > best.rating then
					best.rating = rating
					best.mid = mid
					best.betterRobotPos = betterRobotPos
				end
			end
		end
		if #leftSectors >= 1 then
			for _, s in ipairs(leftSectors) do
				local mid = 0.5*(s[1] + s[2])
				local dir = Vector.fromAngle(mid)
				local betterBallPos = geom.intersectLineLine(leftPoint, dir, World.Ball.pos, dir:perpendicular())
				local betterRobotPos = betterBallPos + dir:setLength(self._robot.shootRadius)
				local rating = (s[2] - s[1])/((self._robot.pos - betterRobotPos):length() + 0.1)
				if rating > best.rating then
					best.rating = rating
					best.mid = mid
					best.betterRobotPos = betterRobotPos
				end
			end
		end
		self._robot:setDribblerSpeed(1)
		self._robot.path:setDefaultObstacles(self._robot, true)
		self._robot.path:addRobotObstacles(self._robot)
		self._robot.trajectory:update(ToTarget, best.betterRobotPos, best.mid + math.pi)
	elseif self._mode == ShootGoal.Mode.GetTheBall then
		self:_catchBall(World.Geometry.OpponentGoal, maxEndSpeed)
		--log("hier")
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
