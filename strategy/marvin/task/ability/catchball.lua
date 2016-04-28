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
local Ball = require "observer/ball"
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
	self._lastReasonableBallPos = nil
	self._catchTime = nil
end

--- Tries to catch the ball, is designed for catching a moving ball
-- @param targetPos Vector - point to look at when having catched the ball
-- @param distanceToBall number - distance the robot should keep to the ball, only sensible for a stopped ball, defaults to 0
-- @param [targetSpeed number - intended ball speed at target]
-- @param [maxSpeed number - maximun speed of the robot]
-- @return moveDest Vector - the point where the robot will catch the ball
function CatchBall:_catchBall(targetPos, distanceToBall, targetSpeed, maxSpeed)
	local ball = World.Ball
	-- update catch time
	if self._catchTime and not Ball.isAccelerating() then
		-- ball is slowing down
		-- update time from last frame
		self._catchTime = math.max(0, self._catchTime - World.TimeDiff)
	else
		-- reset time as the ball is accelerating
		-- should estimate the time quite good, but not overestimate it
		self._catchTime = Physics.robotTimeToBall(self._robot, ball, targetPos, maxSpeed or self._robot.maxSpeed, self._catchTime)
	end

	-- limit catch time to be inside the field
	local timeLimit = Physics.ballOutTime(ball, POSITION_PADDING)
	self._catchTime = math.min(timeLimit, self._catchTime)

	-- check for fast ball and that it moves towards the robot
	-- in principle this isn't neccessary but it stabilizes the catchtime
	local hitTime = self:_calculateHitTime(ball)
	local ballWillHitRobot = false
	local ballInsideRobot = false
	if ball.speed:length() > SLOW_BALL or hitTime == 0 then
		-- check if robot would be hit by the ball
		self._catchTime = math.min(self._catchTime, hitTime)
		if hitTime > 0 and hitTime < math.huge then
			ballWillHitRobot = true
		elseif hitTime == 0 then
			ballInsideRobot = true
		end
	end
	self:_updateReasonableBallPos(ball, ballInsideRobot)

	-- predict ball and catch it
	local predictedBall = Physics.ballAtTime(ball, self._catchTime)
	-- if the robot has to move around the ball aim a bit behind the ball to ensure
	-- that the path doesn't contain a too sharp corner
	local virtualBall
	if ballInsideRobot then
		virtualBall = { pos = self._lastReasonableBallPos, speed = Vector(0, 0), maxSpeed = ball.maxSpeed, radius = ball.radius }
		predictedBall = virtualBall
	else
		if ballWillHitRobot or (targetPos - predictedBall.pos):dot(predictedBall.pos - self._robot.pos) > 0 then
			virtualBall = predictedBall
		else
			virtualBall = Physics.ballAtTime(ball, math.min(timeLimit, self._catchTime + 0.1))
		end
	end

	-- catching the ball only makes sense if we really try to
	-- a distance other than 0 is only useful for moving to a stopped ball
	distanceToBall = distanceToBall or 0
	local viewDir = (targetPos - predictedBall.pos):angle()
	if targetSpeed then
		local targetDir, targetSpeed = self:calcPhi(predictedBall.speed, predictedBall.pos,
				targetPos, targetSpeed)
		viewDir = targetDir
	end
	local moveDest = virtualBall.pos - Vector.fromAngle(viewDir):scaleLength(
			self._robot.shootRadius + distanceToBall + ball.radius)

	-- setup obstacles
	PathHelper.setDefaultObstacles(self._robot.path, self._robot, true, false, false, self._robot.shootRadius)
	local aggressiveMovement = (self._robot.pos:distanceTo(moveDest) < 0.5)
	PathHelper.addRobotObstacles(self._robot.path, self._robot, nil, nil, aggressiveMovement)

	local method = self:_ballCatchMethod(ball, predictedBall, moveDest)
	if method == AROUND_METHOD then
		-- just be pessimistic and assume the robot could touch the ball right from the start
		-- this prevents switching the side around which a moving ball is circumnavigated
		self:_createMoveAroundBallObstacle(self._robot.path, ball, predictedBall)
		self:_createBallCorridor(self._robot.path, viewDir, predictedBall)
	elseif method == HUNT_METHOD then
		self:_createHuntingBallObstacle(self._robot.path, viewDir, predictedBall)
		self:_createBallCorridor(self._robot.path, viewDir, predictedBall)
	end

	-- only allow endSpeed moving towards the targetPos
	-- when moving around the ball, allow moving away from it
	local endSpeed = predictedBall.speed:copy():rotate(-viewDir)
	if method == HUNT_METHOD or method == STOP_METHOD then
		endSpeed.x = math.max(0, endSpeed.x)
	end
	endSpeed:rotate(viewDir)

	-- move to the predicted ball
	local preciseMovement = World.Ball.speed:length() < SLOW_BALL
	local _, time = self._robot.trajectory:update(ToTarget, moveDest, viewDir, maxSpeed, endSpeed, preciseMovement and 0.8)
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
	debug.set("CatchBall/ballInsideRobot", ballInsideRobot)
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

	-- ball moves away from robot
	if ball.speed:dot(self._robot.pos - ball.pos) <= 0 then
		return math.huge
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

function CatchBall:_updateReasonableBallPos(ball, ballInsideRobot)
	-- the current prediction model doesn't acoount for collisions, so avoid prediction of the ball state after a collision
	if not ballInsideRobot then
		self._lastReasonableBallPos = ball.pos
	elseif not self._lastReasonableBallPos then
		-- try to come up with a sensible position
		local hitPoint1, hitPoint2 = geom.intersectLineCircle(ball.pos, ball.speed, self._robot.pos, self._robot.radius + ball.radius)
		if not hitPoint1 or not hitPoint2 then
			-- fallback
			self._lastReasonableBallPos = ball.pos
		elseif (hitPoint1 - ball.pos):dot(ball.speed) > 0 then
			self._lastReasonableBallPos = hitPoint2
		else
			self._lastReasonableBallPos = hitPoint1
		end
	end
end

function CatchBall:_ballCatchMethod(currentBall, predictedBall, moveDest)
	-- check whether the robot is stopping, moving around or hunting the ball
	local robotTargetDist = self._robot.pos:distanceTo(moveDest)
	-- distance minus robot and ball radius thus the ball is for sure between the robot and the catch pos
	local robotTargetSpacing = math.max(0, robotTargetDist - self._robot.radius - currentBall.radius)

	if (moveDest - self._robot.pos):absoluteAngleDiff(predictedBall.pos - moveDest) > 80/180*math.pi then
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
