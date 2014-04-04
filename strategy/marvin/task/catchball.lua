local CatchBall = (require "../base/class").new("Task.CatchBall", require "task/base")

local World = require "../base/world"
local Constants = require "../base/constants"
local ToTarget = require "trajectory/totarget"
local Ball = require "observer/ball"
local Robot = require "observer/robot"
local geom = require "../base/geom"
local vis = require "../base/vis"
local debug = require "../base/debug"
local Field = require "util/field"
local Referee = require "../base/referee"

function CatchBall:_init()
	error("Abstract base class!!!")
end

--- Tries to catch the ball, is designed for catching a moving ball
-- @param targetPos Vector - point to look at when having catched the ball
-- @param distanceToBall number - distance the robot should keep to the ball, only sensible for a stopped ball, defaults to 0
-- @param maxSpeed number - maximun speed of the robot
function CatchBall:_catchBall(targetPos, distanceToBall, maxSpeed)
	-- TODO remove when trajectories are fully working
	if Referee.isStopState() or Referee.isFriendlyFreeKickState() or World.RefereeState == "PenaltyOffensivePrepare" then
		maxSpeed = math.bound(0.5, self._robot.pos:distanceTo(World.Ball.pos)/2, maxSpeed or 1)
	end

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
			vis.addCircle("hitRobot", hitPoint, ball.radius, vis.colors.redHalf, true)

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
	local viewLine = (targetPos - predictedBall.pos):normalize()
	local viewDir = viewLine:angle()
	moveDest = Field.limitToField(moveDest, Settings.positionPadding)
	
	-- setup obstacles
	self._robot.path:setDefaultObstacles(self._robot, true, false, false, self._robot.shootRadius)
	self._robot.path:addRobotObstacles(self._robot)
	self:_createRollingBallObstacle(self._robot.path, ball, predictedBall, moveDest)
	self:_createBallCorridor(self._robot.path, viewDir, predictedBall)
	
	local _, time = self._robot.trajectory:update(ToTarget, moveDest, viewDir, maxSpeed, predictedBall.speed)
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
	debug.set("time", time)
	debug.set("catchtime", self._catchTime)
	vis.addCircle("CatchBall", Ball.atTime(self._catchTime, ball).pos, predictedBall.radius, vis.colors.blueHalf)
	self._lastBallSpeed = ball.speed
end

function CatchBall:_createRollingBallObstacle(path, currentBall, predictedBall, moveDest)
  	-- minimum required time to touch the ball
  	local minTimeToBall = math.min(Robot.minTimeToBall(self._robot, currentBall), self._catchTime)
  	local minBall = Ball.atTime(minTimeToBall)
  
	vis.addCircle("CatchBall", predictedBall.pos, predictedBall.radius, vis.colors.greenHalf)
	local ballDist = predictedBall.pos:distanceTo(minBall.pos)
	local robotTargetDist = self._robot.pos:distanceTo(moveDest)
	-- distance minus robot and ball radius thus the ball is for sure between the robot and the catch pos
	local robotTargetSpacing = math.max(0, robotTargetDist - self._robot.radius - currentBall.radius)
	-- TODO ensure that the obstacles don't interfer with moveDest
	-- block connection between first touch point and target catch pos
	-- if the robot isn't hunting the ball. This leads to the following conditions
	-- the ball is not between the robot and the catch pos
	-- the robot has to move around the predicted ball to reach the catch pos
	-- the ball hasn't yet moved past the robot (TODO better calculation than the dot product?)
	if ballDist > 0.001 and (moveDest:distanceTo(currentBall.pos) > robotTargetSpacing
			or self._robot.pos:distanceTo(predictedBall.pos) < robotTargetDist
			or (currentBall.pos - self._robot.pos):dot(predictedBall.pos - minBall.pos) <= 0) then
  		path:addLine(predictedBall.pos.x, predictedBall.pos.y, minBall.pos.x, minBall.pos.y, predictedBall.radius - 0.001, 'ball')
		vis.addPath("CatchBall", {predictedBall.pos, minBall.pos}, vis.colors.greenHalf)
		vis.addCircle("CatchBall", minBall.pos, predictedBall.radius, vis.colors.greenHalf)
  	else
  		path:addCircle(predictedBall.pos.x, predictedBall.pos.y, predictedBall.radius - 0.001, 'ball')
  	end
end
  
function CatchBall:_createBallCorridor(path, robotDir, predictedBall)
	-- TODO ensure that the obstacles don't interfer with moveDest
	-- create obstacles that force the robot to approach the ball from behind
	local extraDist = 0.02 -- FIXME magic constant
	-- corridor is wide enough to allow the ball to be catched somewhere in the dribbler
	local corridorOffset = self._robot.dribblerWidth / 2 + extraDist / 2
	local corridorDir = math.acos(corridorOffset / (self._robot.shootRadius + predictedBall.radius - extraDist))

	local radiusCompensation = self._robot.radius - self._robot.shootRadius

	local corridorLeftDir = Vector.fromAngle(robotDir):rotate(corridorDir):scaleLength(self._robot.radius)
	local corridorEndLeft = predictedBall.pos + corridorLeftDir
	local corridorStartLeft = corridorEndLeft + corridorLeftDir:perpendicular():setLength(-(self._robot.shootRadius + predictedBall.radius)*0.7 + radiusCompensation)
	corridorEndLeft = corridorEndLeft - corridorLeftDir:perpendicular():setLength(-(self._robot.shootRadius + predictedBall.radius)*0.3)

	local corridorRightDir = Vector.fromAngle(robotDir):rotate(-corridorDir):scaleLength(self._robot.radius)
	local corridorEndRight = predictedBall.pos + corridorRightDir
	local corridorStartRight = corridorEndRight + corridorRightDir:perpendicular():setLength((self._robot.shootRadius + predictedBall.radius)*0.7 + radiusCompensation)
	corridorEndRight = corridorEndRight - corridorRightDir:perpendicular():setLength((self._robot.shootRadius + predictedBall.radius)*0.3)

	-- just block half of the extra dist
	path:addLine(corridorStartLeft.x, corridorStartLeft.y, corridorEndLeft.x, corridorEndLeft.y, extraDist/2, 'ball_corridor1')
	path:addLine(corridorStartRight.x, corridorStartRight.y, corridorEndRight.x, corridorEndRight.y, extraDist/2, 'ball_corridor2')
	path:addLine(corridorEndLeft.x, corridorEndLeft.y, corridorEndRight.x, corridorEndRight.y, extraDist/2, 'ball_corridor3')

	-- visualize obstacles
	vis.addCircle("MoveCorridor", corridorEndRight, extraDist/2, vis.colors.redHalf)
	vis.addCircle("MoveCorridor", corridorStartRight, extraDist/2, vis.colors.redHalf)
	vis.addCircle("MoveCorridor", corridorEndLeft, extraDist/2, vis.colors.redHalf)
	vis.addCircle("MoveCorridor", corridorStartLeft, extraDist/2, vis.colors.redHalf)
	vis.addPath("MoveCorridor", {corridorStartLeft, corridorEndLeft}, vis.colors.redHalf)
	vis.addPath("MoveCorridor", {corridorStartRight, corridorEndRight}, vis.colors.redHalf)
	vis.addPath("MoveCorridor", {corridorEndLeft, corridorEndRight}, vis.colors.redHalf)
end

return CatchBall
