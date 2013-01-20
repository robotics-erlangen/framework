local CatchBall = (require "../base/class").new("Task.CatchBall", require "task/base")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Ball = require "observer/ball"
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
	local viewDir = (targetPos - predictedBall.pos):angle()
	
	self._robot.path:setDefaultObstacles(self._robot, true)
	self._robot.path:addCircle(predictedBall.pos.x, predictedBall.pos.y, predictedBall.radius, "predicted ball")
	self._robot.path:addRobotObstacles(self._robot)
	
	local dest, time = self._robot.trajectory:update(ToTarget, moveDest, viewDir)
	self._catchTime = time
	-- TODO better obstacles from wopr movetoball
	-- TODO Wegpunkt für Roboter nachführen, damit wenn auf den Roboter geschossen wird, der nicht abhaut
end

return CatchBall
