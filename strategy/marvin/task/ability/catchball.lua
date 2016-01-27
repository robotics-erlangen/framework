local Volley = require "task/ability/volley" -- only for calcPhi
local CatchBall = {}
CatchBall.depends = { Volley }

local Constants = require "../base/constants"
local debug = require "../base/debug"
local Field = require "../base/field"
local geom = require "../base/geom"
local Referee = require "../base/referee"
local vis = require "../base/vis"
local World = require "../base/world"
local Physics = require "observer/physics"
local Robot = require "observer/robot"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


-- safety distance to ball
local DIST_ERROR = 0.025
-- reduce obstacle size by one millimeter to avoid collisions
local OBSTACLE_EPSILON = 0.001
local SLOW_BALL = 0.5
local POSITION_PADDING = 0.04 -- boundary extension for field


local AROUND_METHOD = "around"
local STOP_METHOD = "stop"
local HUNT_METHOD = "hunt"

function CatchBall:init()
	self._lastBallSpeed = nil
	self._lastReasonableBallPos = nil
	self._catchTime = nil
end

local function distToTime(robotSpeed, robotMaxSpeed, robotAccel, ballSpeed, ballAccel, dist)
	-- x(t) = x0 - integral(0 to t, v_r(t) + v_b(t) dt)
	-- solve x(t) = 0 for t
	-- v_r(t) = v_r_0 + a_r*t  if t < (v_max - v_r_0)/a_r
	--          v_max          otherwise
	-- v_b(t) = v_b_0 + a_b*t  if t < v_b_0 / a_b
	--          0              otherwise
	-- a_r is robot acceleration
	-- a_b is ball deceleration along direction towards the robot

	-- times until full acceleration / stop and distances traveled until then
	local timeRobot = math.max(0, (robotMaxSpeed - robotSpeed) / robotAccel)
	local distRobot = robotSpeed * timeRobot + robotAccel * timeRobot^2 * 0.5
	local timeBall = math.max(0, -ballSpeed / ballAccel)
	local distBall = ballSpeed * timeBall + ballAccel * timeBall^2 * 0.5

	-- Solve equations for each interval and check that the result is in it
	local t = math.solveSq((robotAccel+ballAccel)*0.5, robotSpeed+ballSpeed, -dist)
	if t and t <= math.min(timeRobot, timeBall) then
		return t < 0 and 0 or t
	end

	if timeRobot < timeBall then
		local distLeft = dist - distRobot + timeRobot * robotMaxSpeed
		t = math.solveSq(ballAccel * 0.5, robotMaxSpeed + ballSpeed, -distLeft)
	elseif timeBall < timeRobot then
		local distLeft = dist - distBall
		t = math.solveSq(robotAccel * 0.5, robotSpeed, -distLeft)
	end
	if t and t >= math.min(timeRobot, timeBall) and t <= math.max(timeRobot, timeBall) then
		return t
	end

	local distLeft = dist - distRobot - distBall + timeRobot * robotMaxSpeed
	return distLeft / robotMaxSpeed
end

-- just a crude approximation
function CatchBall:_approxMinTimeToBall(robot, ball)
	local posDiff = (ball.pos - robot.pos):normalize()
	local real_dist = ball.pos:distanceTo(robot.pos)
	if real_dist < (ball.radius + robot.radius) then
		-- log("Ball and robot are actually fermions!")
		-- ball seems to be inside robot
		return 0
	end
	local dist = math.max(0, real_dist - ball.radius - robot.radius)
	-- speed of ball and robot towards each other
	local robotSpeed = posDiff:dot(robot.speed)
	local robotAccel = robot.acceleration.aSpeedupFMax

	local ballSpeed = -posDiff:dot(ball.speed)
	local ballAccel
	if ballSpeed == 0 then -- prevent division by zero for timeBall
		ballAccel = 1 -- only used together with ballSpeed
	else
		ballAccel = (ballSpeed / ball.speed:length()) * Constants.ballDeceleration
	end

	return distToTime(robotSpeed, robot.maxSpeed, robotAccel, ballSpeed, ballAccel, dist)
end

--- Tries to catch the ball, is designed for catching a moving ball
-- @param targetPos Vector - point to look at when having catched the ball
-- @param distanceToBall number - distance the robot should keep to the ball, only sensible for a stopped ball, defaults to 0
-- @param [targetSpeed number - intended ball speed at target]
-- @param [maxSpeed number - maximun speed of the robot]
-- @return moveDest Vector - the point where the robot will catch the ball
function CatchBall:_catchBall(targetPos, distanceToBall, targetSpeed, maxSpeed)
	local ball = World.Ball
	local lastBallSpeed = self._lastBallSpeed or ball.speed
	-- update
	self._lastBallSpeed = ball.speed
	if self._catchTime and World.Ball.speed:length() < lastBallSpeed:length() + 0.1 then
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
		self._catchTime = self:_approxMinTimeToBall(self._robot, ball)
	end

	-- check for fast ball and that it moves towards the robot
	-- in principle this isn't neccessary but it stabilizes the catchtime
	local ballWillHitRobot = false
	local ballInsideRobot = false
	if ball.speed:length() > SLOW_BALL and ball.speed:dot(self._robot.pos - ball.pos) > 0 then
		-- check if robot would be hit by the ball
		local hitTime = self:_calculateHitTime(ball)
		if hitTime < self._catchTime then
			self._catchTime = hitTime
			if hitTime > 0 then
				ballWillHitRobot = true
			else
				ballInsideRobot = true
			end
		end
	else
		-- maybe the ball (at least the extrapolated version of it) is already inside the robot and thus not found to be colliding with the robot
		if ball.pos:distanceTo(self._robot.pos) < ball.radius + self._robot.radius then
			self._catchTime = 0
			ballInsideRobot = true
		end
	end
	debug.set("CatchBall/ballInsideRobot", ballInsideRobot)
	if ballWillHitRobot then
		self._lastReasonableBallPos = ball.pos
	end

	local timeLimit = Physics.ballOutTime(ball, POSITION_PADDING)
	self._catchTime = math.min(timeLimit, self._catchTime)
	-- predict ball and catch it
	local predictedBall = Physics.ballAtTime(ball, self._catchTime)
	-- if the robot has to move around the ball aim a bit behind the ball to ensure
	-- that the path doesn't contain a too sharp corner
	local virtualBall = {}
	-- the current prediction model doesn't acoount for collisions, so avoid prediction of the ball state after a collision
	if ballInsideRobot then
		if self._lastReasonableBallPos then
			virtualBall.pos = self._lastReasonableBallPos
		else
			local hitPoint1, hitPoint2 = geom.intersectLineCircle(ball.pos, ball.speed, self._robot.pos, self._robot.radius + ball.radius)
			if (hitPoint1 - ball.pos):dot(ball.speed) > 0 then
				virtualBall.pos = hitPoint2
			else
				virtualBall.pos = hitPoint1
			end
			self._lastReasonableBallPos = virtualBall.pos
		end
		virtualBall.speed = Vector.create(0, 0)
	elseif ballWillHitRobot then
		virtualBall = predictedBall
	else
		virtualBall = Physics.ballAtTime(ball, math.min(timeLimit, self._catchTime + 0.1))

		if (targetPos - predictedBall.pos):dot(predictedBall.pos - self._robot.pos) > 0 then
			virtualBall = predictedBall
		end
	end

	-- catching the ball only makes sense if we really try to
	-- a distance other than 0 is only useful for moving to a stopped ball
	distanceToBall = distanceToBall or 0
	local viewDirVec = predictedBall.pos - targetPos
	if targetSpeed then
		local targetDir, targetSpeed = self:calcPhi(predictedBall.speed, predictedBall.pos,
				targetPos, targetSpeed)
		viewDirVec = -Vector.fromAngle(targetDir)
	end

	local moveDest = virtualBall.pos + (viewDirVec):setLength(
			self._robot.shootRadius + distanceToBall + ball.radius)
	local viewDir = (-viewDirVec):angle()

	-- setup obstacles
	PathHelper.setDefaultObstacles(self._robot.path, self._robot, true, false, false, self._robot.shootRadius)
	local aggressiveMovement = (self._robot.pos:distanceTo(moveDest) < 0.5)
	PathHelper.addRobotObstacles(self._robot.path, self._robot, nil, nil, aggressiveMovement)
	local moveDir = (targetPos - predictedBall.pos):angle()
	local method = self:_ballCatchMethod(ball, predictedBall, moveDest)
	if method == AROUND_METHOD then
		-- minimum required time to touch the ball
		-- first touch could be before the robot has moved around the ball
		local minTimeToBall = math.min(self:_approxMinTimeToBall(self._robot, ball), self._catchTime)
		local minBall = Physics.ballAtTime(World.Ball, minTimeToBall)
		self:_createMoveAroundBallObstacle(self._robot.path, minBall, predictedBall)
	elseif method == HUNT_METHOD then
		self:_createHuntingBallObstacle(self._robot.path, moveDir, predictedBall)
	end
	self:_createBallCorridor(self._robot.path, moveDir, predictedBall)

	-- only allow endSpeed moving towards the targetPos
	local endSpeed = predictedBall.speed:copy():rotate(-viewDir)
	if endSpeed.x < 0 then
		endSpeed.x = 0
	end
	endSpeed:rotate(viewDir)

	-- move to the predicted ball
	local preciseMovement = World.Ball.speed:length() < SLOW_BALL
	local _, time = self._robot.trajectory:update(ToTarget, moveDest, viewDir, maxSpeed, endSpeed, preciseMovement)
	self._send.moveDest("all", moveDest)
	self._send.attackPosition("all", predictedBall.pos)

	-- update prediction
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
	debug.set("CatchBall/method", method)
	debug.set("CatchBall/time", time)
	debug.set("CatchBall/catchtime", self._catchTime)
	vis.addCircle("t/a/catchball: CatchBall", Physics.ballAtTime(ball, self._catchTime).pos, predictedBall.radius, vis.colors.blueHalf)

	return self._catchTime
end

function CatchBall:_calculateHitTime(ball)
	-- first check if the ball is inside the robot
	if ball.pos:distanceTo(self._robot.pos) < self._robot.radius + ball.radius then
		-- that means the ball is about to be reflected by the robot
		return 0
		-- 0 catchtime prevents the robot from driving away from the ball
	end
	
	-- check if robot would be hit by the ball
	-- limit catchTime to the time the ball would need to hit the robot
	-- prevents the robot from fleeing from the ball
	local hitPoint, hitPoint2 = geom.intersectLineCircle(ball.pos,
		ball.speed, self._robot.pos, self._robot.radius + ball.radius)
	if not hitPoint then
		return math.huge
	end

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
	local timeToRobot = Physics.ballRollTime(ball, rollDist)
	-- timeToRobot is the upper bound for the catch time, musn't be an underestimation
	-- can be much lower if the robot moves towards the ball
	return timeToRobot
end

function CatchBall:_ballCatchMethod(currentBall, predictedBall, moveDest)
	-- check whether the robot is stopping, moving around or hunting the ball
	local robotTargetDist = self._robot.pos:distanceTo(moveDest)
	-- distance minus robot and ball radius thus the ball is for sure between the robot and the catch pos
	local robotTargetSpacing = math.max(0, robotTargetDist - self._robot.radius - currentBall.radius)

	if self._robot.pos:distanceTo(predictedBall.pos) < robotTargetDist then
		-- the robot has to move around the predicted ball to reach the catch pos
		return AROUND_METHOD
	elseif moveDest:distanceTo(currentBall.pos) > robotTargetSpacing
		-- the ball is not between the robot and the catch pos
		-- the ball hasn't yet moved past the robot (TODO better calculation than the dot product?)
			or (currentBall.pos - self._robot.pos):dot(predictedBall.pos - currentBall.pos) <= 0 then
		return STOP_METHOD
	else
		return HUNT_METHOD
	end
end

function CatchBall:_createMoveAroundBallObstacle(path, minBall, predictedBall)
	local ballDist = predictedBall.pos:distanceTo(minBall.pos)
	-- block connection between first touch point and target catch pos
	if ballDist > OBSTACLE_EPSILON then
		local extraDist = math.min(ballDist, DIST_ERROR) / 2 - OBSTACLE_EPSILON

		local lineDir = (minBall.pos - predictedBall.pos):setLength(extraDist)
		local minBallShift = minBall.pos - lineDir
		local predictedBallShift = predictedBall.pos + lineDir
  		path:addLine(predictedBallShift.x, predictedBallShift.y, minBallShift.x, minBallShift.y,
  				predictedBall.radius - OBSTACLE_EPSILON + extraDist, 'ball')
		vis.addPath("t/a/catchball: CatchBall", {predictedBallShift, minBallShift}, vis.colors.greenHalf)
		vis.addCircle("t/a/catchball: CatchBall", minBallShift, predictedBall.radius - OBSTACLE_EPSILON + extraDist, vis.colors.greenHalf)
		vis.addCircle("t/a/catchball: CatchBall", predictedBallShift, predictedBall.radius - OBSTACLE_EPSILON + extraDist, vis.colors.greenHalf)

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

function CatchBall:_createHuntingBallObstacle(path, viewDir, predictedBall)
  	path:addCircle(predictedBall.pos.x, predictedBall.pos.y, predictedBall.radius - OBSTACLE_EPSILON, 'ball')
	vis.addCircle("t/a/catchball: CatchBall", predictedBall.pos, predictedBall.radius, vis.colors.skyBlueHalf)

	local frontEnd = predictedBall.pos + Vector.fromAngle(viewDir) * 0.3
  	path:addLine(predictedBall.pos.x, predictedBall.pos.y, frontEnd.x, frontEnd.y, predictedBall.radius - OBSTACLE_EPSILON, 'ballForward')
	vis.addPath("t/a/catchball: CatchBall", {predictedBall.pos, frontEnd}, vis.colors.skyBlueHalf)
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
