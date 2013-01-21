local CatchBall = (require "../base/class").new("Task.CatchBall", require "task/base")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Ball = require "observer/ball"
local Robot = require "observer/robot"
local geom = require "../base/geom"
local vis = require "../base/vis"

-- the robot may drive with up to maxEndSpeed or ballSpeed when it catches the ball, depending on which of both is higher
function CatchBall:_catchBall(targetPos, maxEndSpeed)
	if self._catchTime then
		self._catchTime = math.max(0, self._catchTime - World.TimeDiff)
	else
		self._catchTime = self._robot.pos:distanceTo(World.Ball.pos) / self._robot.maxSpeed -- TODO: better estimation
	end
	
	if World.Ball.speed:length() > Settings.slowBall then
		-- check if robot would be hit by the ball
		-- limit catchTime to the time the ball would need to hit the robot
		local hitPoint1, hitPoint2 = geom.intersectLineCircle(World.Ball.pos,
			World.Ball.speed, self._robot.pos, self._robot.radius)
		if hitPoint1 then
			vis.addCircle("hitRobot", hitPoint1, 0.05, vis.colors.redHalf, true)
			local rollDist = World.Ball.pos:distanceTo(hitPoint1)
			if hitPoint2 then
				rollDist = math.min(rollDist, World.Ball.pos:distanceTo(hitPoint2))
				vis.addCircle("hitRobot", hitPoint2, 0.05, vis.colors.redHalf, true)
			end
			rollDist = math.max(rollDist - World.Ball.radius, 0)
			local timeToRobot = Ball.ballRollTime(World.Ball.speed:length(), rollDist)
			if timeToRobot < self._catchTime then
				self._catchTime = timeToRobot
			end
		end
	end
	
	local predictedBall = Ball.atTime(self._catchTime)
	local moveDest = predictedBall.pos + (predictedBall.pos - targetPos):setLength(self._robot.radius + World.Ball.radius)
	local viewDir = targetPos - predictedBall.pos
	
	self._robot.path:setDefaultObstacles(self._robot, true)
	self._robot.path:addRobotObstacles(self._robot)
	self:_createBallObstacles(self._robot.path, viewDir:angle(), predictedBall)
	
	-- max of endSpeed and ball speed in target direction
	local endSpeed = math.max(maxEndSpeed, predictedBall.speed:dot(viewDir:normalize()))
	
	local _, time = self._robot.trajectory:update(ToTarget, moveDest, viewDir:angle(), nil, endSpeed)
	self._catchTime = time
	-- TODO Wegpunkt für Roboter nachführen, damit wenn auf den Roboter geschossen wird, der nicht abhaut
end

function CatchBall:_createBallObstacles(path, robotDir, predictedBall)
	-- minimum required time to touch the ball
	local minTimeToBall = math.min(Robot.minTimeToBall(self._robot, World.Ball), self._catchTime)
	local minBall = Ball.atTime(minTimeToBall)

	-- block connection between first touch point and target catch pos
	if predictedBall.pos:distanceTo(minBall.pos) < 0.001 then
		path:addCircle(predictedBall.pos.x, predictedBall.pos.y, predictedBall.radius, 'ball')
	else
		path:addLine(predictedBall.pos.x, predictedBall.pos.y, minBall.pos.x, minBall.pos.y, predictedBall.radius, 'ball')
	end
	
	vis.addCircle("CatchBall", predictedBall.pos, predictedBall.radius, vis.colors.greenHalf)
	vis.addPath("CatchBall", {predictedBall.pos, minBall.pos}, vis.colors.greenHalf)
	vis.addCircle("CatchBall", minBall.pos, predictedBall.radius, vis.colors.greenHalf)

	-- create obstacles that force the robot to approach the ball from behind
	local extraDist = 0.02 -- FIXME magic constant
	-- corridor is wide enough to allow the ball to be catched somewhere in the dribbler
	local corridorOffset = self._robot.dribblerWidth / 2 + extraDist / 2
	local corridorDir = math.acos(corridorOffset / (self._robot.shootRadius + predictedBall.radius - extraDist))

	local corridorLeftDir = Vector.fromAngle(robotDir):rotate(corridorDir):scaleLength(self._robot.radius)
	local corridorEndLeft = predictedBall.pos + corridorLeftDir
	local corridorStartLeft = corridorEndLeft + corridorLeftDir:perpendicular():setLength(-(self._robot.shootRadius + predictedBall.radius)*0.7)
	corridorEndLeft = corridorEndLeft - corridorLeftDir:perpendicular():setLength(-(self._robot.shootRadius + predictedBall.radius)*0.3)

	local corridorRightDir = Vector.fromAngle(robotDir):rotate(-corridorDir):scaleLength(self._robot.radius)
	local corridorEndRight = predictedBall.pos + corridorRightDir
	local corridorStartRight = corridorEndRight + corridorRightDir:perpendicular():setLength((self._robot.shootRadius + predictedBall.radius)*0.7)
	corridorEndRight = corridorEndRight - corridorRightDir:perpendicular():setLength((self._robot.shootRadius + predictedBall.radius)*0.3)

	-- just block half of the extra dist
	path:addLine(corridorStartLeft.x, corridorStartLeft.y, corridorEndLeft.x, corridorEndLeft.y, extraDist/2, 'ball_corridor1')
	path:addLine(corridorStartRight.x, corridorStartRight.y, corridorEndRight.x, corridorEndRight.y, extraDist/2, 'ball_corridor2')
	path:addLine(corridorEndLeft.x, corridorEndLeft.y, corridorEndRight.x, corridorEndRight.y, extraDist/2, 'ball_corridor3')

	vis.addCircle("MoveCorridor", corridorEndRight, extraDist/2, vis.colors.redHalf)
	vis.addCircle("MoveCorridor", corridorStartRight, extraDist/2, vis.colors.redHalf)
	vis.addCircle("MoveCorridor", corridorEndLeft, extraDist/2, vis.colors.redHalf)
	vis.addCircle("MoveCorridor", corridorStartLeft, extraDist/2, vis.colors.redHalf)
	vis.addPath("MoveCorridor", {corridorStartLeft, corridorEndLeft}, vis.colors.redHalf)
	vis.addPath("MoveCorridor", {corridorStartRight, corridorEndRight}, vis.colors.redHalf)
	vis.addPath("MoveCorridor", {corridorEndLeft, corridorEndRight}, vis.colors.redHalf)
end

return CatchBall
