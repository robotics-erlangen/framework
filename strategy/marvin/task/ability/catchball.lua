local CatchBall = {}

local World = require "../base/world"
local Constants = require "../base/constants"
local ToTarget = require "trajectory/totarget"
local Ball = require "observer/ball"
local Robot = require "observer/robot"
local geom = require "../base/geom"
local vis = require "../base/vis"
local debug = require "../base/debug"
local Field = require "../base/field"
local Referee = require "../base/referee"

-- safety distance to ball
local DIST_ERROR = 0.01
-- reduce obstacle size by one millimeter to avoid collisions
local OBSTACLE_EPSILON = 0.001


function CatchBall:init()
	self._lastBallSpeed = nil
	self._catchTime = nil
end


--- Tries to catch the ball, is designed for catching a moving ball
-- @param targetPos Vector - point to look at when having catched the ball
-- @param distanceToBall number - distance the robot should keep to the ball, only sensible for a stopped ball, defaults to 0
-- @param maxSpeed number - maximun speed of the robot
-- @return moveDest Vector - the point where the robot will catch the ball
function CatchBall:_catchBall(targetPos, distanceToBall, maxSpeed)
	local ball = World.Ball
	self._lastBallSpeed = self._lastBallSpeed or ball.speed
	if self._catchTime and World.Ball.speed:length() < self._lastBallSpeed:length() + 0.1 then
		-- ball is slowing down
		-- update time from last frame
		self._catchTime = math.max(0, self._catchTime - World.TimeDiff)
	else
		-- reset time as the ball is accelerating
		-- should estimate the time quite good, but never overestimate it
		-- that is the guess must be optimistic
		-- when catching the ball there are two positions with minimal distance between ball and robot:
		-- the point where the robot catches the ball directly
		-- and the point where the robot gets the ball when the ball has stopped
		-- as the direct catch is preferred we must ensure to start near that local minima
		self._catchTime = Robot.minTimeToBall(self._robot, ball)
	end

	-- check for fast ball and that it moves towards the robot
	-- in principle this isn't neccessary but it stabilizes the catchtime
	if ball.speed:length() > Settings.slowBall
		and ball.speed:dot(self._robot.pos - ball.pos) > 0 then
		-- check if robot would be hit by the ball
		-- limit catchTime to the time the ball would need to hit the robot
		-- prevents the robot from fleeing from the ball
		local hitPoint, hitPoint2 = geom.intersectLineCircle(ball.pos,
			ball.speed, self._robot.pos, self._robot.radius + ball.radius)
		if hitPoint then
			-- find intersection with circle
			local rollDist = ball.pos:distanceTo(hitPoint)
			if hitPoint2 then
				local dist = ball.pos:distanceTo(hitPoint2)
				if dist < rollDist then
					rollDist = dist
					hitPoint = hitPoint2
				end
			end
			vis.addCircle("t/a/catchball: hitRobot", hitPoint, ball.radius, vis.colors.redHalf, true)

			-- consider that the shootRadius is less than radius and thus the ball has to travel further
			local dribberAngleHalf = math.atan(self._robot.dribblerWidth/2, self._robot.shootRadius)
			-- check whether the hitpoint could be inside the dribbler
			if math.abs(geom.getAngleDiff((hitPoint - self._robot.pos):angle(), dribberAngleHalf)) < dribberAngleHalf then
				-- calculate where the ball would hit the dribbler
				-- just use the current robot dir as any prediction will be just as wrong
				local dribblerMid = self._robot.pos + Vector.fromAngle(self._robot.dir):scaleLength(self._robot.shootRadius)
				-- points along the dribbler
				local dribblerDir = Vector.fromAngle(self._robot.dir):perpendicular():scaleLength(self._robot.dribblerWidth / 2)
				local intersection, _, lambda2 = geom.intersectLineLine(ball.pos, ball.speed, dribblerMid, dribblerDir)
				-- abs(lambda2) <= 1 if intersection is inside the dribbler width
				if intersection and math.abs(lambda2) <= 1 then
					hitPoint = intersection
					rollDist = ball.pos:distanceTo(hitPoint)
				end
			end

			-- ballRollTime and atTime have to be consistent!
			-- assumes that the robot is standing still or moving towards the ball
			-- if the robot is fleeing this will cause it to stop moving away
			local timeToRobot = Ball.ballRollTime(ball.speed:length(), rollDist)
			-- timeToRobot is the upper bound for the catch time, musn't be an underestimation
			-- can be much lower if the robot moves towards the ball
			if timeToRobot < self._catchTime then
				self._catchTime = timeToRobot
			end
		end
	end

	-- predict ball and catch it
	local predictedBall = Ball.atTime(self._catchTime, ball)
	-- catching the ball only makes sense if we really try to
	-- a distance other than 0 is only useful for moving to a stopped ball
	distanceToBall = distanceToBall or 0
	local moveDest = predictedBall.pos + (predictedBall.pos - targetPos):setLength(
			self._robot.shootRadius + distanceToBall + ball.radius)
	local viewDir = (targetPos - predictedBall.pos):angle()
	moveDest = Field.limitToField(moveDest, Settings.positionPadding + self._robot.radius)

	-- setup obstacles
	self._robot.path:setDefaultObstacles(self._robot, true, false, false, self._robot.shootRadius)
	self._robot.path:addRobotObstacles(self._robot)
  	if self:_isBlockingBall(ball, predictedBall, moveDest) then
  		-- minimum required time to touch the ball
  		-- first touch could be before the robot has moved around the ball
  		local minTimeToBall = math.min(Robot.minTimeToBall(self._robot, ball), self._catchTime)
  		local minBall = Ball.atTime(minTimeToBall)
  		self:_createBlockBallObstacle(self._robot.path, minBall, predictedBall)
  	else
  		self:_createHuntingBallObstacle(self._robot.path, predictedBall)
  	end
	self:_createBallCorridor(self._robot.path, viewDir, predictedBall)

	-- only allow endSpeed moving towards the targetPos
	local endSpeed = predictedBall.speed:copy():rotate(-viewDir)
	if endSpeed.x < 0 then
		endSpeed.x = 0
	end
	endSpeed:rotate(viewDir)

	-- move to the predicted ball
	local _, time = self._robot.trajectory:update(ToTarget, moveDest, viewDir, maxSpeed, endSpeed)
	self._send.moveDest("all", moveDest)
	-- keep old time if no way was found
	if time > 0 then
		-- damp large value changes
		-- the centerpiece of the catchball algorithm
		-- FIXME better damping for small changes
		if time < self._catchTime then
			self._catchTime = 0.8 * self._catchTime + 0.2 * time
		else
			self._catchTime = 0.95 * self._catchTime + 0.05 * time
		end
	end
	debug.set("CatchBall/time", time)
	debug.set("CatchBall/catchtime", self._catchTime)
	vis.addCircle("t/a/catchball: CatchBall", Ball.atTime(self._catchTime, ball).pos, predictedBall.radius, vis.colors.blueHalf)
	self._lastBallSpeed = ball.speed

	self._send.attackPosition("all", predictedBall.pos)
end

function CatchBall:_isBlockingBall(currentBall, predictedBall, moveDest)
	-- check whether the robot is blocking or hunting the ball
	local robotTargetDist = self._robot.pos:distanceTo(moveDest)
	-- distance minus robot and ball radius thus the ball is for sure between the robot and the catch pos
	local robotTargetSpacing = math.max(0, robotTargetDist - self._robot.radius - currentBall.radius)
	-- the robot is blocking the ball if one of the following conditions apply
	-- the ball is not between the robot and the catch pos
	-- the robot has to move around the predicted ball to reach the catch pos
	-- the ball hasn't yet moved past the robot (TODO better calculation than the dot product?)
	return moveDest:distanceTo(currentBall.pos) > robotTargetSpacing
			or self._robot.pos:distanceTo(predictedBall.pos) < robotTargetDist
			or (currentBall.pos - self._robot.pos):dot(predictedBall.pos - currentBall.pos) <= 0
end

function CatchBall:_createBlockBallObstacle(path, minBall, predictedBall)
	local ballDist = predictedBall.pos:distanceTo(minBall.pos)
	-- block connection between first touch point and target catch pos
	if ballDist > OBSTACLE_EPSILON then
  		path:addLine(predictedBall.pos.x, predictedBall.pos.y, minBall.pos.x, minBall.pos.y, predictedBall.radius - OBSTACLE_EPSILON, 'ball')
		vis.addPath("t/a/catchball: CatchBall", {predictedBall.pos, minBall.pos}, vis.colors.greenHalf)
		vis.addCircle("t/a/catchball: CatchBall", minBall.pos, predictedBall.radius, vis.colors.greenHalf)

		-- prevent robot from colliding with the ball
		-- calculate distance of ball connection line projected on the robot direction
		-- in case the robot is hunting the ball, robot ball dist is bounded to zero
		local robotDir = geom.getAngleDiff((minBall.pos - predictedBall.pos):angle(), self._robot.dir)
		local robotBallDist = math.max(math.cos(robotDir) * ballDist, 0)
		-- maximum error cause by moddeling the robot as circle
		local obstacleErrorDist = self._robot.radius - self._robot.shootRadius + DIST_ERROR
		-- if both predictions are near each othe the robot must still be able to reach predictedBall
		local extraDist = math.min(obstacleErrorDist, robotBallDist)
		path:addCircle(minBall.pos.x, minBall.pos.y, minBall.radius - OBSTACLE_EPSILON + extraDist, 'ball2')
		vis.addCircle("t/a/catchball: CatchBall", minBall.pos, minBall.radius + extraDist, vis.colors.redHalf)
  	else
  		-- no need to prevent collision with minBall, if both are the same
  		path:addCircle(predictedBall.pos.x, predictedBall.pos.y, predictedBall.radius - OBSTACLE_EPSILON, 'ball')
  	end
	vis.addCircle("t/a/catchball: CatchBall", predictedBall.pos, predictedBall.radius, vis.colors.greenHalf)

end

function CatchBall:_createHuntingBallObstacle(path, predictedBall)
  	path:addCircle(predictedBall.pos.x, predictedBall.pos.y, predictedBall.radius - OBSTACLE_EPSILON, 'ball')
	vis.addCircle("t/a/catchball: CatchBall", predictedBall.pos, predictedBall.radius, vis.colors.skyBlueHalf)
end

function CatchBall:_createBallCorridor(path, viewDir, predictedBall)
	local obstacleErrorDist = self._robot.radius - self._robot.shootRadius + DIST_ERROR
	local corridorRadius = predictedBall.radius

	-- create a bracket that ensures a minimum distance of obstacleErroDist to the ball
	-- except on the side indicated by viewDir
	local rightOfs = Vector.fromAngle(viewDir):perpendicular():scaleLength(obstacleErrorDist)
	local depthOfs = Vector.fromAngle(viewDir):scaleLength(obstacleErrorDist)

	local corridorLeftNear = predictedBall.pos - rightOfs
	local corridorLeftFar = corridorLeftNear + depthOfs
	local corridorRightNear = predictedBall.pos + rightOfs
	local corridorRightFar = corridorRightNear + depthOfs

	path:addLine(corridorLeftNear.x, corridorLeftNear.y, corridorLeftFar.x, corridorLeftFar.y, corridorRadius, "ball_corridor1")
	path:addLine(corridorLeftFar.x, corridorLeftFar.y, corridorRightFar.x, corridorRightFar.y, corridorRadius, "ball_corridor2")
	path:addLine(corridorRightFar.x, corridorRightFar.y, corridorRightNear.x, corridorRightNear.y, corridorRadius, "ball_corridor3")

	-- visualize obstacles
	vis.addPath("t/a/catchball: MoveCorridor", {corridorLeftNear, corridorLeftFar, corridorRightFar, corridorRightNear}, vis.colors.redHalf)
	vis.addCircle("t/a/catchball: MoveCorridor", corridorLeftNear, corridorRadius, vis.colors.redHalf)
	vis.addCircle("t/a/catchball: MoveCorridor", corridorLeftFar, corridorRadius, vis.colors.redHalf)
	vis.addCircle("t/a/catchball: MoveCorridor", corridorRightNear, corridorRadius, vis.colors.redHalf)
	vis.addCircle("t/a/catchball: MoveCorridor", corridorRightFar, corridorRadius, vis.colors.redHalf)
end

return CatchBall
