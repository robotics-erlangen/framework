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
	self._pointOnGoalLine = nil
	self._linearShoot = true
	self._hysteresis = 0
	self._distanceWithBall = 0	-- assuming robot didn't have the ball before this task
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

local crit = math.pi/20
function ShootGoal:_rate()
	if self._lastPos then
		self._distanceWithBall = self._distanceWithBall + (self._lastPos - self._robot.pos):length()
	end
	self._lastPos = self._robot.pos
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
			local goalStart = (World.Geometry.OpponentGoalRight - ball.pos):angle() -- direction of the first goalpost
			local goalEnd = (World.Geometry.OpponentGoalLeft - ball.pos):angle() -- direction of the other goalpost
			local freeSectors = Observer.Goal.getFreeSectors(ball.pos, robots, goalStart, goalEnd)
			self._bestRating = 0
			for k, fs in ipairs(freeSectors) do -- TODO: implement reasonable function that calculates the time needed for the robot to turn with the ball
				local weight = 0.5	-- for weighted average
				if fs[1] == goalStart then
					weight = weight + 0.35
				end
				if fs[2] == goalEnd then
					weight = weight - 0.35
				end
				local sectorMid = weight*fs[1] + (1 - weight)*fs[2]
				local rating = (fs[2] - fs[1])*(10 - geom.getAngleDiff(self._robot.dir, sectorMid)^2) -- as said - only to guess the needed time
				if rating > self._bestRating then
					if self._bestMid and sectorMid - self._bestMid > crit then	-- other sector better
						if rating > self._bestRating*(5 - self._hysteresis)*0.25 then
							self._bestRating = rating
							self._hysteresis = 0
							self._bestMid = sectorMid
						else
							self._hysteresis = self._hysteresis + 1
						end
					else
						self._bestRating = rating
						--self._bestSector = fs
						self._bestMid = sectorMid
						self._hysteresis = math.max(self._hysteresis - 1, 0)
					end
				end
			end
			if self._bestRating > 1.5 then
				self._pointOnGoalLine = geom.intersectLineLine(ball.pos, Vector.fromAngle(self._bestMid), World.Geometry.OpponentGoal, Vector.fromAngle(0))
				self._mode = ShootGoal.Mode.TurnAndShoot		-- turn and shoot
			else
				self._mode = ShootGoal.Mode.SearchBetterPosition	-- from the current position, it is hardly possible to score -> look for better position and move there
				self._hysteresis = 0
			end
			return self._bestRating
		else
			self._mode = ShootGoal.Mode.GetTheBall				-- we had the ball, but it must have rolled away
			self._hysteresis = 0
			self._distanceWithBall = 0
			return  0
		end
	else
		self._mode = ShootGoal.Mode.GetTheBall					-- someone else has the ball, so let's try to get it. dumb play which called this task...
		self._hysteresis = 0
		self._distanceWithBall = 0
		return 0
	end
end

function ShootGoal:_run(priorityMessages, notifications)
	debug.set("Mode", self._mode)
	debug.set("Distance with ball", self._distanceWithBall)
	if self._distanceWithBall >= 0.5 then
		self._dontMoveWithBall = true
		--log("muss schiessen")
	end
	if self._dontMoveWithBall then
		vis.addPath("ToGoal", {World.Ball.pos, self._pointOnGoalLine})
		self:_shoot(self._pointOnGoalLine, math.huge, true, 0)	-- threshold is 0 for immediate shooting
		self._robot:setDribblerSpeed(0)
	elseif self._mode == ShootGoal.Mode.TurnAndShoot then
		--[[?local left = World.Ball.pos + Vector.fromAngle(self._bestSector[1]) * 3
		local right = World.Ball.pos + Vector.fromAngle(self._bestSector[2]) * 3
		vis.addPolygon("Best Sector", {World.Ball.pos, left, right}, vis.orangeHalf, true)]]--
		vis.addPath("To Goal", {World.Ball.pos, self._pointOnGoalLine})
		self:_shoot(self._pointOnGoalLine, math.huge, true, shootThresholdProb)	-- from the shoot task
		self._robot:setDribblerSpeed(0)
	elseif self._mode == ShootGoal.Mode.SearchBetterPosition then
		local distToGoal = (World.Ball.pos - World.Geometry.OpponentGoal):length()
		local robotList = Observer.Goal.getRobotsNearGoal(distToGoal, World.OpponentRobots, true)
		local rightPoint, rightSectors, leftPoint, leftSectors = Observer.Goal.searchFreeSectors(robotList, true)	--look for other positions
		local best = {}
		best.rating = 0
		if #rightSectors >= 1 then
			for _, s in ipairs(rightSectors) do
				local mid = 0.5*(s[1] + s[2])
				local dir = Vector.fromAngle(mid)
				local betterBallPos = geom.intersectLineLine(rightPoint, dir, World.Ball.pos, dir:rotate(-math.pi/4))
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
				local betterBallPos = geom.intersectLineLine(leftPoint, dir, World.Ball.pos, dir:rotate(math.pi/4))
				local betterRobotPos = betterBallPos + dir:setLength(self._robot.shootRadius)
				local rating = (s[2] - s[1])/((self._robot.pos - betterRobotPos):length() + 0.1)
				if rating > best.rating then
					best.rating = rating
					best.mid = mid
					best.betterRobotPos = betterRobotPos
				end
			end
		end
		vis.addCircle("betterPos", best.betterRobotPos, 0.05)
		self._robot:setDribblerSpeed(1)
		self._robot.path:setDefaultObstacles(self._robot, true)
		self._robot.path:addRobotObstacles(self._robot)
		if best.mid then
			self._robot.trajectory:update(ToTarget, best.betterRobotPos, best.mid + math.pi)
		else
			log("Kein freier Sector.")
		end
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